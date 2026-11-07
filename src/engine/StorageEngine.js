/**
 * Content-Addressed Storage (CAS) & Manifest Engine
 * 
 * Provides:
 * 1. SHA-256 deduplicated blob storage.
 * 2. Snapshot manifests linking slot files to blob hashes.
 * 3. Automatic diff calculation and title generation ("Slot 0 changed, +12 KB").
 * 4. Configurable retention cleanup preserving all pinned checkpoints.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StorageEngine {
  constructor(baseStorageDir = null) {
    this.storageDir = baseStorageDir || path.join(process.env.APPDATA || process.env.HOME || '.', '.save-me', 'storage');
    this.blobsDir = path.join(this.storageDir, 'blobs');
    this.manifestsDir = path.join(this.storageDir, 'manifests');
    this.indexPath = path.join(this.storageDir, 'index.json');
    this.snapshots = [];
    this.init();
  }

  init() {
    fs.mkdirSync(this.blobsDir, { recursive: true });
    fs.mkdirSync(this.manifestsDir, { recursive: true });

    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = fs.readFileSync(this.indexPath, 'utf8');
        this.snapshots = JSON.parse(raw);
      } catch (e) {
        this.snapshots = [];
      }
    }
  }

  saveIndex() {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(this.snapshots, null, 2));
    } catch (e) {
      // Continue if filesystem is restricted
    }
  }

  /**
   * Hashes and stores a file in CAS if not already present
   */
  storeBlob(filePath) {
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const prefix = hash.substring(0, 2);
    const blobSubdir = path.join(this.blobsDir, prefix);
    const blobPath = path.join(blobSubdir, hash);

    if (!fs.existsSync(blobSubdir)) {
      fs.mkdirSync(blobSubdir, { recursive: true });
    }

    if (!fs.existsSync(blobPath)) {
      // Write deduplicated blob
      fs.writeFileSync(blobPath, buffer);
    }

    return {
      hash,
      size: buffer.length,
      blobPath
    };
  }

  /**
   * Captures a snapshot for a given game slot
   */
  captureSnapshot({ gameId = 'wuchang', slotId = 0, files = [], isPinned = false, isSafety = false, notes = '' }) {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const snapshotId = `snap_${Date.now()}_slot${slotId}`;
    
    let totalSizeBytes = 0;
    const manifestFiles = [];

    // Store each file in CAS
    for (const f of files) {
      const blobInfo = this.storeBlob(f.absolutePath);
      totalSizeBytes += blobInfo.size;
      manifestFiles.push({
        relativePath: f.relativePath,
        hash: blobInfo.hash,
        size: blobInfo.size
      });
    }

    // Find previous snapshot in this slot to compute byte delta
    const previousSnapshotsInSlot = this.snapshots.filter(s => s.gameId === gameId && s.slotId === slotId);
    const lastSnapshot = previousSnapshotsInSlot.length > 0 ? previousSnapshotsInSlot[previousSnapshotsInSlot.length - 1] : null;

    let deltaBytes = 0;
    let autoTitle = '';

    if (!lastSnapshot) {
      deltaBytes = 0;
      autoTitle = `Slot ${slotId} Initialized (${(totalSizeBytes / 1024).toFixed(1)} KB)`;
    } else {
      deltaBytes = totalSizeBytes - lastSnapshot.sizeBytes;
      const deltaFormatted = (deltaBytes / 1024).toFixed(1);
      if (deltaBytes >= 0) {
        autoTitle = `Slot ${slotId} changed (+${deltaFormatted} KB)`;
      } else {
        autoTitle = `Slot ${slotId} changed (${deltaFormatted} KB)`;
      }
    }

    if (isSafety) {
      autoTitle = `[Pre-Restore Safety Rollback] Before rewinding Slot ${slotId}`;
    }

    const snapshotRecord = {
      id: snapshotId,
      gameId,
      slotId,
      title: autoTitle,
      notes,
      sizeBytes: totalSizeBytes,
      deltaBytes,
      fileCount: manifestFiles.length,
      timestamp,
      isPinned: isPinned || isSafety,
      isSafety,
      manifestPath: path.join(this.manifestsDir, `${snapshotId}.json`)
    };

    // Save manifest file
    fs.writeFileSync(
      snapshotRecord.manifestPath,
      JSON.stringify(
        {
          snapshot: snapshotRecord,
          files: manifestFiles
        },
        null,
        2
      )
    );

    this.snapshots.push(snapshotRecord);
    this.saveIndex();

    return snapshotRecord;
  }

  getSnapshotManifest(snapshotId) {
    const manifestFile = path.join(this.manifestsDir, `${snapshotId}.json`);
    if (fs.existsSync(manifestFile)) {
      return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    }
    return null;
  }

  updateSnapshotTitle(snapshotId, newTitle) {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (snap) {
      snap.title = newTitle;
      this.saveIndex();
      return true;
    }
    return false;
  }

  togglePin(snapshotId) {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (snap) {
      snap.isPinned = !snap.isPinned;
      this.saveIndex();
      return snap.isPinned;
    }
    return false;
  }

  getSnapshots(gameId = null, slotId = null) {
    let list = this.snapshots;
    if (gameId !== null) {
      list = list.filter(s => s.gameId === gameId);
    }
    if (slotId !== null) {
      list = list.filter(s => s.slotId === slotId);
    }
    return list;
  }

  /**
   * Enforces retention policy: keeps all pinned snapshots + last N unpinned snapshots
   */
  pruneRetention(gameId, slotId, keepLimit = 50) {
    const slotSnapshots = this.snapshots.filter(s => s.gameId === gameId && s.slotId === slotId);
    const unpinned = slotSnapshots.filter(s => !s.isPinned);

    if (unpinned.length <= keepLimit) {
      return 0; // Nothing to prune
    }

    const pruneCount = unpinned.length - keepLimit;
    const toDelete = unpinned.slice(0, pruneCount);
    const deleteIds = new Set(toDelete.map(s => s.id));

    // Remove manifests and update in-memory list
    for (const snap of toDelete) {
      if (fs.existsSync(snap.manifestPath)) {
        try {
          fs.unlinkSync(snap.manifestPath);
        } catch (e) {}
      }
    }

    this.snapshots = this.snapshots.filter(s => !deleteIds.has(s.id));
    this.saveIndex();
    return pruneCount;
  }
}

module.exports = StorageEngine;

