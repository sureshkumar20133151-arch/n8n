const fs = require('fs');
const path = require('path');

// State file paths (checked in local dir or parent project)
const STATE_FILE_PATH = path.resolve(__dirname, 'active_persona.json');
const PROJECT_STATE_FILE_PATH = path.resolve(__dirname, '..', 'project', 'active_persona.json');

const PERSONAS = {
  wholesale: {
    id: 'wholesale',
    name: 'Annamaliyar Oil Store Wholesale Assistant',
    client: 'Annamaliyar Oil Store, Mattuthavani, Madurai',
    proprietor: 'Manikanda Vinayaga Prabhu',
    tagline: 'Wholesale Gold Winner Sunflower Oil (Boxes & Tins) • MOQ 1 Box / 1 Tin',
    badge: 'Wholesale B2B Mode',
    icon: '📦',
    switchMessage: '✅ *Switched!* Mode is now active: 📦 *Annamaliyar Oil Store Wholesale Assistant* (Mattuthavani, Madurai).\n• Live inventory, box pricing, & stock check active.\n• Strictly 1 Box / 1 Tin Minimum Order (MOQ).\nReady for retailer inquiries!'
  },
  restaurant: {
    id: 'restaurant',
    name: 'Taj Hotel Madurai Biryani Assistant',
    client: 'Taj Hotel, Madurai',
    tagline: 'Authentic Seeraga Samba Dum Biryani • Skip-the-Counter Pre-Orders & Digital Token',
    badge: 'Restaurant / Food Mode',
    icon: '🍗',
    switchMessage: '✅ *Switched!* Mode is now active: 🍗 *Taj Hotel Madurai Biryani Assistant*.\n• Menu browsing, UPI payment string, & Digital Token generator active.\n• Instant counter skip-the-line pickup ready!'
  },
  dev: {
    id: 'dev',
    name: 'SoloDeveloper.pro Sales OS',
    client: 'SoloDeveloper.pro',
    proprietor: 'Suresh Kumar',
    tagline: 'Senior AI & Web Consultant • Websites from ₹8,999 • WhatsApp AI & CRM Automations',
    badge: 'Default Developer Mode',
    icon: '💻',
    switchMessage: '✅ *Switched!* Mode is now active: 💻 *Suresh Kumar SoloDeveloper.pro Sales Operating System*.\n• Hormozi 3-Way Qualification, Proposal Engine & Demo Booking active.\nReady for web & AI automation prospects!'
  }
};

class PersonaManager {
  constructor() {
    this.currentMode = 'wholesale'; // Wholesale is priority per user request
    this.lastUpdated = new Date().toISOString();
    this.updatedBy = 'initialization';
    this.loadState();
  }

  loadState() {
    try {
      let data = null;
      if (fs.existsSync(STATE_FILE_PATH)) {
        data = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'));
      } else if (fs.existsSync(PROJECT_STATE_FILE_PATH)) {
        data = JSON.parse(fs.readFileSync(PROJECT_STATE_FILE_PATH, 'utf-8'));
      }

      if (data && data.activeMode && PERSONAS[data.activeMode]) {
        this.currentMode = data.activeMode;
        this.lastUpdated = data.lastUpdated || new Date().toISOString();
        this.updatedBy = data.updatedBy || 'persisted_state';
        console.log(`🎛️ [PersonaManager] Loaded active persona: "${this.currentMode}" (${PERSONAS[this.currentMode].name})`);
        return;
      }
    } catch (err) {
      console.warn(`[PersonaManager] Error loading state file: ${err.message}. Using default: ${this.currentMode}`);
    }
    this.saveState();
  }

  saveState() {
    try {
      const payload = {
        activeMode: this.currentMode,
        modeName: PERSONAS[this.currentMode]?.name,
        lastUpdated: this.lastUpdated,
        updatedBy: this.updatedBy
      };
      const json = JSON.stringify(payload, null, 2);
      fs.writeFileSync(STATE_FILE_PATH, json, 'utf-8');
      
      // Also sync to project folder if it exists
      const projectDir = path.dirname(PROJECT_STATE_FILE_PATH);
      if (fs.existsSync(projectDir)) {
        fs.writeFileSync(PROJECT_STATE_FILE_PATH, json, 'utf-8');
      }
    } catch (err) {
      console.error(`[PersonaManager] Failed to save state: ${err.message}`);
    }
  }

  getActiveMode() {
    return this.currentMode;
  }

  getPersonaDetails(mode = this.currentMode) {
    return PERSONAS[mode] || PERSONAS.dev;
  }

  getAllPersonas() {
    return Object.values(PERSONAS);
  }

  setMode(targetMode, updatedBy = 'user') {
    const normalized = (targetMode || '').toLowerCase().trim();
    let selectedKey = null;

    if (normalized === 'wholesale' || normalized === 'oil' || normalized === 'annamaliyar' || normalized === 'shop' || normalized === 'b2b') {
      selectedKey = 'wholesale';
    } else if (normalized === 'restaurant' || normalized === 'food' || normalized === 'biryani' || normalized === 'taj' || normalized === 'hotel') {
      selectedKey = 'restaurant';
    } else if (normalized === 'dev' || normalized === 'developer' || normalized === 'sales' || normalized === 'suresh' || normalized === 'solodeveloper') {
      selectedKey = 'dev';
    }

    if (!selectedKey || !PERSONAS[selectedKey]) {
      return {
        success: false,
        error: `Unknown mode "${targetMode}". Valid options: wholesale, restaurant, dev.`
      };
    }

    this.currentMode = selectedKey;
    this.lastUpdated = new Date().toISOString();
    this.updatedBy = updatedBy;
    this.saveState();

    console.log(`⚡ [PersonaManager] Switched active mode to "${selectedKey}" by ${updatedBy}`);

    return {
      success: true,
      currentMode: selectedKey,
      persona: PERSONAS[selectedKey],
      switchMessage: PERSONAS[selectedKey].switchMessage
    };
  }

  formatCurrentModeReply() {
    const p = this.getPersonaDetails();
    return `🎛️ *Current WhatsApp AI Persona:* ${p.icon} *${p.name}*\n` +
      `• *Client / Business:* ${p.client}\n` +
      `• *Specialty:* ${p.tagline}\n\n` +
      `*Switch commands anytime:*\n` +
      `👉 \`!mode wholesale\` ➔ Annamaliyar Oil Store (Stock & Box Rates)\n` +
      `👉 \`!mode restaurant\` ➔ Taj Hotel Biryani (Pre-Orders & Tokens)\n` +
      `👉 \`!mode dev\` ➔ SoloDeveloper.pro (Web & AI Automation Sales)`;
  }
}

const personaManager = new PersonaManager();
module.exports = personaManager;
