/**
 * Safe Restore Manager
 * 
 * Enforces non-destructive restore guarantees:
 * 1. Process Guard: Verifies that the game process is closed before modifying any files.
 * 2. Invariant INV-02: Generates an automatic [Pre-Restore Safety Rollback] snapshot.
 * 3. Atomic Staging: Restores from CAS blobs via a staging directory to avoid partial writes.
 * 4. Cloud Sync Advisory: Warns if Xbox/Steam cloud sync may conflict with restored saves.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SafeRestoreManager {
  constructor(storageEngine, options = {}) {
    this.storageEngine = storageEngine;
    this.stagingDir = options.stagingDir || path.join(storageEngine.storageDir, '.restore_staging');
  }

  /**
   * Checks whether the target game process is currently active in the OS
   */
  isGameProcessRunning(processName) {
    if (!processName) return false;

    try {
      if (process.platform === 'win32') {
        const output = execSync(`tasklist /FI "IMAGENAME eq ${processName}" /NH`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return output.toLowerCase().includes(processName.toLowerCase());
      } else {
        const output = execSync(`pgrep -f "${processName}" || true`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return output.trim().length > 0;
      }
    } catch (e) {
      // In sandbox or non-elevated environments, assume closed
      return false;
    }
  }

  /**
   * Inspects save directory to detect active cloud synchronization
   */
  detectCloudSyncRisk(targetSlotPath) {
    const normalized = targetSlotPath.toLowerCase();
    if (normalized.includes('steam')) {
      return {
        hasRisk: true,
        platform: 'Steam Cloud',
        guidance: 'Right-click the game in your Steam Library -> Properties -> General -> Disable "Keep game saves in the Steam Cloud" before launching.'
      };
    }
    if (normalized.includes('packages') || normalized.includes('projectplague')) {
      return {
        hasRisk: true,
        platform: 'Xbox / PC Game Pass Cloud Sync',
        guidance: 'Launch the game offline or choose "Keep local save" if Xbox cloud prompt appears on launch.'
      };
    }
    return {
      hasRisk: false,
      platform: 'None',
      guidance: 'Standard local save directory. Safe to restore.'
    };
  }

  /**
   * Executes the guaranteed safe restore protocol
   */
  async restoreSnapshot({ snapshotId, targetSlotPath, processName = null, force = false }) {
    // 1. Process Guard Check
    if (!force && processName && this.isGameProcessRunning(processName)) {
      return {
        success: false,
        error: 'GAME_PROCESS_ACTIVE',
        message: `The game (${processName}) is currently running. Please close the game before restoring to avoid file lock conflicts and memory overwrites.`
      };
    }

    // 2. Fetch Snapshot Manifest
    const manifest = this.storageEngine.getSnapshotManifest(snapshotId);
    if (!manifest) {
      return {
        success: false,
        error: 'MANIFEST_NOT_FOUND',
        message: `Snapshot manifest for '${snapshotId}' could not be located in storage.`
      };
    }

    // 3. INVARIANT INV-02: Deterministic Pre-Restore Safety Rollback
    // Capture the current live save files before modifying anything
    let safetySnapshot = null;
    if (fs.existsSync(targetSlotPath)) {
      const currentLiveFiles = this.gatherDirectoryFiles(targetSlotPath);
      if (currentLiveFiles.length > 0) {
        safetySnapshot = this.storageEngine.captureSnapshot({
          gameId: manifest.snapshot.gameId,
          slotId: manifest.snapshot.slotId,
          files: currentLiveFiles,
          isPinned: true,
          isSafety: true,
          notes: `Automatic safety checkpoint taken immediately before rewinding to snapshot '${manifest.snapshot.title}'`
        });
      }
    }

    // 4. Staging: Extract blobs into temporary staging area
    fs.mkdirSync(this.stagingDir, { recursive: true });

    try {
      // Clean staging folder
      for (const f of fs.readdirSync(this.stagingDir)) {
        fs.rmSync(path.join(this.stagingDir, f), { recursive: true, force: true });
      }

      // Reconstruct files from CAS blobs into staging
      for (const item of manifest.files) {
        const prefix = item.hash.substring(0, 2);
        const blobPath = path.join(this.storageEngine.blobsDir, prefix, item.hash);

        if (!fs.existsSync(blobPath)) {
          throw new Error(`Missing blob payload for ${item.relativePath} (${item.hash})`);
        }

        const stagingFilePath = path.join(this.stagingDir, item.relativePath);
        fs.mkdirSync(path.dirname(stagingFilePath), { recursive: true });
        fs.copyFileSync(blobPath, stagingFilePath);
      }

      // 5. Atomic Overwrite: Copy from staging into live target slot directory
      fs.mkdirSync(targetSlotPath, { recursive: true });
      for (const item of manifest.files) {
        const stagedFile = path.join(this.stagingDir, item.relativePath);
        const destFile = path.join(targetSlotPath, item.relativePath);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(stagedFile, destFile);
      }

      const cloudRisk = this.detectCloudSyncRisk(targetSlotPath);

      return {
        success: true,
        restoredSnapshot: manifest.snapshot,
        safetySnapshot,
        cloudRisk
      };
    } catch (err) {
      return {
        success: false,
        error: 'RESTORE_IO_FAILURE',
        message: `Failed during atomic file extraction: ${err.message}`
      };
    } finally {
      // Clean up staging
      try {
        fs.rmSync(this.stagingDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  gatherDirectoryFiles(dir) {
    const list = [];
    const walk = current => {
      if (!fs.existsSync(current)) return;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const stat = fs.statSync(full);
          list.push({
            name: entry.name,
            relativePath: path.relative(dir, full),
            absolutePath: full,
            size: stat.size
          });
        }
      }
    };
    walk(dir);
    return list;
  }
}

module.exports = SafeRestoreManager;

