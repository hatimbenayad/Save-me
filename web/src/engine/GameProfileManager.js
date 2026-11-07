/**
 * Game Profile Manager
 * 
 * Auto-detects save folder locations for games, starting with Wuchang: Fallen Feathers
 * across Microsoft Store / PC Game Pass and Steam editions.
 */

const fs = require('fs');
const path = require('path');

class GameProfileManager {
  constructor(configDir = null) {
    this.configDir = configDir || path.join(process.env.APPDATA || process.env.HOME || '.', '.save-me');
    this.configFile = path.join(this.configDir, 'profiles.json');
    this.profiles = [];
    this.activeProfileId = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.configDir)) {
      try {
        fs.mkdirSync(this.configDir, { recursive: true });
      } catch (e) {
        // Fallback for mock environments
      }
    }

    if (fs.existsSync(this.configFile)) {
      try {
        const raw = fs.readFileSync(this.configFile, 'utf8');
        const data = JSON.parse(raw);
        this.profiles = data.profiles || [];
        this.activeProfileId = data.activeProfileId || null;
      } catch (e) {
        this.profiles = [];
      }
    }

    // If no profiles registered, register default Wuchang profile
    if (this.profiles.length === 0) {
      const defaultWuchang = this.createDefaultWuchangProfile();
      this.profiles.push(defaultWuchang);
      this.activeProfileId = defaultWuchang.id;
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(
        this.configFile,
        JSON.stringify(
          {
            profiles: this.profiles,
            activeProfileId: this.activeProfileId
          },
          null,
          2
        )
      );
    } catch (e) {
      // Silently continue if filesystem is restricted
    }
  }

  /**
   * Scans the system for Wuchang: Fallen Feathers save folders
   */
  detectWuchangSavePath() {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Local');

    // 1. Check Microsoft Store / PC Game Pass Packages directory
    const packagesDir = path.join(localAppData, 'Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const entries = fs.readdirSync(packagesDir);
        const wuchangPackage = entries.find(e => e.includes('ProjectPlague') || e.includes('505GAMES'));
        if (wuchangPackage) {
          const candidateBase = path.join(packagesDir, wuchangPackage, 'LocalState', 'Saved');
          if (fs.existsSync(candidateBase)) {
            const userDirs = fs.readdirSync(candidateBase);
            for (const userDir of userDirs) {
              const gameSlotsPath = path.join(candidateBase, userDir, 'GameSlots');
              if (fs.existsSync(gameSlotsPath)) {
                return { path: gameSlotsPath, platform: 'Microsoft Store / PC Game Pass' };
              }
            }
          }
        }
      } catch (e) {
        // Access restriction fallback
      }
    }

    // 2. Check Standard Steam / LocalAppData directory
    const steamSavedPath = path.join(localAppData, 'Project_Plague', 'Saved');
    if (fs.existsSync(steamSavedPath)) {
      try {
        const entries = fs.readdirSync(steamSavedPath);
        for (const entry of entries) {
          const candidateSlots = path.join(steamSavedPath, entry, 'GameSlots');
          if (fs.existsSync(candidateSlots)) {
            return { path: candidateSlots, platform: 'Steam / Direct' };
          }
        }
      } catch (e) {
        // Access restriction fallback
      }
    }

    return null;
  }

  createDefaultWuchangProfile() {
    const detected = this.detectWuchangSavePath();
    const fallbackPath = path.join(
      process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local',
      'Project_Plague',
      'Saved',
      'GameSlots'
    );

    return {
      id: 'wuchang-fallen-feathers',
      name: 'Wuchang: Fallen Feathers',
      slug: 'wuchang',
      processName: 'Project_Plague.exe',
      watchPath: detected ? detected.path : fallbackPath,
      platform: detected ? detected.platform : 'Auto-Detect',
      slotPattern: 'maingame*',
      fileFilter: '*.sav, *.dat',
      isDetected: !!detected
    };
  }

  getActiveProfile() {
    return this.profiles.find(p => p.id === this.activeProfileId) || this.profiles[0];
  }

  addCustomProfile({ name, watchPath, processName, slotPattern = '*', fileFilter = '*' }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const profile = {
      id: `custom-${slug}-${Date.now()}`,
      name,
      slug,
      processName: processName || `${slug}.exe`,
      watchPath,
      platform: 'Custom',
      slotPattern,
      fileFilter,
      isDetected: fs.existsSync(watchPath)
    };

    this.profiles.push(profile);
    this.save();
    return profile;
  }
}

module.exports = GameProfileManager;

