/**
 * channelControls.js
 * Persistent live ON/OFF toggle switches & per-channel persona controls
 * for WhatsApp AI and Instagram AI (DMs + Reel Comments).
 */

const fs = require('fs');
const path = require('path');
const personaManager = require('./personaManager');

const DATA_DIR = path.resolve(__dirname, 'data');
const CONTROLS_FILE = path.join(DATA_DIR, 'channel_controls.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const VALID_MODES = ['wholesale', 'restaurant', 'builder', 'dev'];

const DEFAULT_STATE = {
  whatsappEnabled: true,
  instagramDmEnabled: true,
  instagramCommentEnabled: true,
  syncPersonas: true,
  instagramPersona: 'builder',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'initialization'
};

class ChannelControls {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONTROLS_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(CONTROLS_FILE, 'utf-8'));
        this.state = { ...DEFAULT_STATE, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.warn(`⚠️ [ChannelControls] Failed to load controls: ${err.message}`);
    }
  }

  save() {
    try {
      fs.writeFileSync(CONTROLS_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error(`❌ [ChannelControls] Failed to save controls: ${err.message}`);
    }
  }

  getState() {
    const waPersona = personaManager.getActiveMode();
    const igPersona = this.state.syncPersonas ? waPersona : (this.state.instagramPersona || waPersona);
    return {
      ...this.state,
      effectiveWhatsappPersona: waPersona,
      effectiveInstagramPersona: igPersona
    };
  }

  isWhatsappEnabled() {
    return this.state.whatsappEnabled !== false;
  }

  isInstagramDmEnabled() {
    return this.state.instagramDmEnabled !== false;
  }

  isInstagramCommentEnabled() {
    return this.state.instagramCommentEnabled !== false;
  }

  getInstagramPersona() {
    if (this.state.syncPersonas !== false) {
      return personaManager.getActiveMode();
    }
    return VALID_MODES.includes(this.state.instagramPersona)
      ? this.state.instagramPersona
      : personaManager.getActiveMode();
  }

  update(patch = {}, updatedBy = 'Dashboard Toggle') {
    if (typeof patch.whatsappEnabled === 'boolean') {
      this.state.whatsappEnabled = patch.whatsappEnabled;
    }
    if (typeof patch.instagramDmEnabled === 'boolean') {
      this.state.instagramDmEnabled = patch.instagramDmEnabled;
    }
    if (typeof patch.instagramCommentEnabled === 'boolean') {
      this.state.instagramCommentEnabled = patch.instagramCommentEnabled;
    }
    if (typeof patch.syncPersonas === 'boolean') {
      this.state.syncPersonas = patch.syncPersonas;
    }
    if (typeof patch.instagramPersona === 'string') {
      const normalized = patch.instagramPersona.trim().toLowerCase();
      if (normalized === 'sync') {
        this.state.syncPersonas = true;
      } else if (VALID_MODES.includes(normalized)) {
        this.state.syncPersonas = false;
        this.state.instagramPersona = normalized;
      }
    }
    this.state.lastUpdated = new Date().toISOString();
    this.state.updatedBy = updatedBy;
    this.save();
    console.log(`🎛️ [ChannelControls Updated] WA=${this.state.whatsappEnabled} | IG_DM=${this.state.instagramDmEnabled} | IG_CMT=${this.state.instagramCommentEnabled} | IG_Mode=${this.getInstagramPersona()}`);
    return this.getState();
  }
}

module.exports = new ChannelControls();
