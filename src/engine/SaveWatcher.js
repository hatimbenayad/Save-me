/**
 * Save Watcher Subsystem
 * 
 * Non-invasively monitors game save slots for writes, applying the Quiescence Settle Protocol:
 * 1. 800ms Debounce Timer (resets on incoming write bursts)
 * 2. Size Stability Verification (150ms verification window)
 * 3. Lock Release Check (FILE_SHARE_READ capability)
 * 4. Strictly adheres to Invariant INV-01: Zero write access to game saves during monitoring.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class SaveWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.watchPath = options.watchPath || null;
    this.slotPattern = options.slotPattern || 'maingame*';
    this.debounceMs = options.debounceMs || 800;
    this.settlePollMs = options.settlePollMs || 150;
    this.watcher = null;
    this.debounceTimers = new Map(); // Keyed by slot or file path
    this.isWatching = false;
  }

  start(targetPath = null) {
    if (targetPath) {
      this.watchPath = targetPath;
    }

    if (!this.watchPath || !fs.existsSync(this.watchPath)) {
      this.emit('error', new Error(`Watch path does not exist: ${this.watchPath}`));
      return false;
    }

    this.stop();

    try {
      // Invariant INV-01: Open watch handle only (read-only filesystem notifications)
      this.watcher = fs.watch(this.watchPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        this.handleFileSystemEvent(eventType, filename);
      });

      this.isWatching = true;
      this.emit('started', { watchPath: this.watchPath });
      return true;
    } catch (err) {
      this.emit('error', new Error(`Failed to initialize filesystem watcher: ${err.message}`));
      return false;
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.isWatching = false;
    this.emit('stopped');
  }

  handleFileSystemEvent(eventType, relativePath) {
    // Determine the slot directory
    const parts = relativePath.split(/[/\\]/);
    const slotDirName = parts[0];

    // Filter by slot pattern (e.g. maingame0, maingame1, or direct files)
    const slotId = this.extractSlotId(slotDirName);

    this.emit('rawEvent', { eventType, relativePath, slotId });

    // Reset debounce timer for this specific slot
    if (this.debounceTimers.has(slotDirName)) {
      clearTimeout(this.debounceTimers.get(slotDirName));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(slotDirName);
      this.verifyQuiescenceAndTrigger(slotDirName, slotId);
    }, this.debounceMs);

    this.debounceTimers.set(slotDirName, timer);
  }

  extractSlotId(slotDirName) {
    const match = slotDirName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Quiescence Verification Poll: ensures the game has finished writing all bytes
   * and exclusive write locks have been released before we copy.
   */
  verifyQuiescenceAndTrigger(slotDirName, slotId) {
    const fullSlotPath = path.join(this.watchPath, slotDirName);
    if (!fs.existsSync(fullSlotPath)) return;

    try {
      const statsInitial = this.gatherSlotFileStats(fullSlotPath);

      // Verify file handles can be opened for shared read
      for (const file of statsInitial) {
        if (!this.canReadShared(file.absolutePath)) {
          // File is still locked exclusively by the game; re-arm debounce timer
          this.rearmDebounce(slotDirName, slotId);
          return;
        }
      }

      // Wait verification window
      setTimeout(() => {
        if (!fs.existsSync(fullSlotPath)) return;
        const statsFinal = this.gatherSlotFileStats(fullSlotPath);

        // Check if all file sizes match exactly
        const isStable = this.compareStats(statsInitial, statsFinal);
        if (isStable) {
          // Quiescence reached! Emit snapshot event
          this.emit('quiescenceReached', {
            slotDirName,
            slotId,
            fullSlotPath,
            files: statsFinal
          });
        } else {
          // Size still fluctuating; game is actively writing large save
          this.rearmDebounce(slotDirName, slotId);
        }
      }, this.settlePollMs);
    } catch (err) {
      this.emit('error', err);
    }
  }

  rearmDebounce(slotDirName, slotId) {
    const timer = setTimeout(() => {
      this.debounceTimers.delete(slotDirName);
      this.verifyQuiescenceAndTrigger(slotDirName, slotId);
    }, 500);
    this.debounceTimers.set(slotDirName, timer);
  }

  gatherSlotFileStats(targetDir) {
    const statsList = [];
    const walk = dir => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(full);
            statsList.push({
              name: entry.name,
              relativePath: path.relative(targetDir, full),
              absolutePath: full,
              size: stat.size,
              mtimeMs: stat.mtimeMs
            });
          } catch (e) {
            // Transient file deleted or locked
          }
        }
      }
    };

    walk(targetDir);
    return statsList;
  }

  canReadShared(filePath) {
    try {
      // Invariant INV-01: 'r' mode opens with FILE_SHARE_READ on Windows
      const fd = fs.openSync(filePath, 'r');
      fs.closeSync(fd);
      return true;
    } catch (e) {
      return false;
    }
  }

  compareStats(a, b) {
    if (a.length !== b.length) return false;
    const mapB = new Map(b.map(item => [item.relativePath, item.size]));
    for (const item of a) {
      if (mapB.get(item.relativePath) !== item.size) {
        return false;
      }
    }
    return true;
  }
}

module.exports = SaveWatcher;

