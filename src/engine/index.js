/**
 * Save Rewind Core Engine Facade
 */

const EventEmitter = require('events');
const GameProfileManager = require('./GameProfileManager');
const SaveWatcher = require('./SaveWatcher');
const StorageEngine = require('./StorageEngine');
const SafeRestoreManager = require('./SafeRestoreManager');

class SaveRewindCore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.profiles = new GameProfileManager(options.configDir);
    this.storage = new StorageEngine(options.storageDir);
    this.restoreManager = new SafeRestoreManager(this.storage);
    this.watcher = new SaveWatcher({
      debounceMs: options.debounceMs || 800,
      settlePollMs: options.settlePollMs || 150
    });

    this.bindEvents();
  }

  bindEvents() {
    this.watcher.on('quiescenceReached', event => {
      const activeProfile = this.profiles.getActiveProfile();
      const snapshot = this.storage.captureSnapshot({
        gameId: activeProfile ? activeProfile.id : 'wuchang',
        slotId: event.slotId,
        files: event.files
      });

      this.emit('snapshotCaptured', snapshot);
    });

    this.watcher.on('error', err => {
      this.emit('error', err);
    });
  }

  startWatchingActiveProfile() {
    const profile = this.profiles.getActiveProfile();
    if (!profile || !profile.watchPath) {
      throw new Error('No valid active profile configured with a watch path.');
    }
    return this.watcher.start(profile.watchPath);
  }

  stopWatching() {
    this.watcher.stop();
  }

  async restore(snapshotId, targetSlotPath = null) {
    const activeProfile = this.profiles.getActiveProfile();
    const dest = targetSlotPath || (activeProfile ? activeProfile.watchPath : null);
    
    if (!dest) {
      throw new Error('Target save path must be specified.');
    }

    const result = await this.restoreManager.restoreSnapshot({
      snapshotId,
      targetSlotPath: dest,
      processName: activeProfile ? activeProfile.processName : null
    });

    if (result.success) {
      this.emit('restored', result);
    }
    return result;
  }
}

module.exports = {
  SaveRewindCore,
  GameProfileManager,
  SaveWatcher,
  StorageEngine,
  SafeRestoreManager
};

