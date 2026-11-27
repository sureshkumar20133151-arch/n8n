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
  builder: {
    id: 'builder',
    name: 'Danam Holdings House Construction AI Assistant',
    client: 'Danam Holdings Civil Engineering & Turnkey EPC, Madurai',
    proprietor: 'Er. Dhilip Kumar',
    tagline: 'Turnkey House Construction • 3D Architectural Walkthroughs • Free Site & Soil Inspection',
    badge: 'Construction Builder Mode',
    icon: '🏗️',
    switchMessage: '✅ *Switched!* Mode is now active: 🏗️ *Danam Holdings House Construction Assistant* (Madurai).\n• House packages (₹1,950 – ₹2,850/sq.ft), 3D floor plans & cost calculator active.\n• Automated BOQ qualification & Er. Dhilip site inspection booking ready!'
  },
  dev: {
    id: 'dev',
    name: 'SoloDeveloper.pro Sales OS',
    client: 'SoloDeveloper.pro',
    proprietor: 'Suresh Kumar',
    tagline: 'WhatsApp AI from ₹4,999 • Websites ₹7,999–₹49,999 • Full AI Business & Site Automation',
    badge: 'Default Developer Mode',
    icon: '💻',
    switchMessage: '✅ *Switched!* Mode is now active: 💻 *Suresh Kumar SoloDeveloper.pro Sales Operating System*.\n• Hormozi 3-Way Qualification, Proposal Engine & Demo Booking active.\nReady for web & AI automation prospects!'
  },
  solodev_pa: {
    id: 'solodev_pa',
    name: 'SoloDeveloper Personal Assistant (Boss OS)',
    client: 'Suresh Kumar — Internal Operations',
    proprietor: 'Suresh Kumar',
    tagline: 'Todoist Sync • 432-Lead Sheet • Outreach Control • Invoices & Reminders',
    badge: 'Personal Assistant Mode',
    icon: '🧠',
    switchMessage: '✅ *Switched!* Mode is now active: 🧠 *SoloDeveloper Personal Assistant (Boss OS)*.\n• *Todoist Sync* & Daily Tasks ready.\n• *solo dev lead gen* Sheet (Prospects) + 5/10 Outreach Control active.\n• Client Projects & WhatsApp Payment Invoice Reminders ready!'
  },
  plumber: {
    id: 'plumber',
    name: 'Arasan Electrical & Plumbing Site Assistant',
    client: 'Arasan Electrical & Plumbing Works',
    proprietor: 'Arasan Team / Suresh',
    tagline: 'Site Photo Vault (Roof Concrete & Wall Chasing) • 10-Laborers Dispatch • Group & DM On-Demand Access',
    badge: 'Electrical & Plumbing Mode',
    icon: '⚡🔧',
    switchMessage: '✅ *Switched!* Mode is now active: ⚡🔧 *Arasan Electrical & Plumbing Site Assistant*.\n• Site photo archiving (Roof Concrete pipes, Wall Chasing/கார்டி, Bathroom plumbing) active.\n• 10 Laborers directory & auto-dispatch ready.\n• Group & DM on-demand photo retrieval active!'
  },
  finance: {
    id: 'finance',
    name: 'Personal Finance & Budget Tracker AI Assistant',
    client: 'Budget Tracker Pro (Suresh)',
    proprietor: 'Suresh Kumar',
    tagline: 'Track Daily Expenses • Voice, Photo, Screenshot & Text • Live MCP Budget Sync',
    badge: 'Personal Finance Mode',
    icon: '💰📊',
    switchMessage: '✅ *Switched!* Mode is now active: 💰 *Personal Finance & Budget Tracker Assistant*.\n• Connected to Budget Tracker Pro via MCP.\n• Send Voice Notes, Bills, GPay Screenshots, or Text to log expenses & income.\n• Ask balances, monthly breakdown, or category limits anytime!'
  },
  dhanam_internal: {
    id: 'dhanam_internal',
    name: 'Dhanam Holdings Internal Site & Accounts Ops',
    client: 'Dhanam Holdings (Er. Dhilip Kumar & Internal Team)',
    proprietor: 'Er. Dhilip Kumar / Management',
    tagline: 'Site Cash Flow • Owner vs Contractor Bills • Labor Attendance • Tally Prime Vouchers',
    badge: 'Dhanam Ops & Accounts',
    icon: '🏗️💼',
    switchMessage: '✅ *Switched!* Mode is now active: 🏗️💼 *Dhanam Holdings Internal Site & Accounts Ops*.\n• Site expenses & contractor bill tracking (Owner paid vs Contractor paid) active.\n• Direct Tally Prime voucher generation (Receipt, Payment, Purchase) on Port 9000 ready.\n• Site attendance & labor advance ledger connected!'
  },
  meenakshi_traders: {
    id: 'meenakshi_traders',
    name: 'Sri Meenakshi Traders (SMT) Edible Oils Wholesale Counter',
    client: 'Sri Meenakshi Traders, Madurai',
    proprietor: 'Management',
    tagline: 'Edible Oils Wholesale Merchant • Gold Winner, Fortune, Gemini, Palm Oil • Tally Invoicing • Fast-Lane Pickup',
    badge: 'SMT Edible Oils Wholesale',
    icon: '🛢️🏪',
    switchMessage: '✅ *Switched!* Mode is now active: 🛢️🏪 *Sri Meenakshi Traders (SMT) Edible Oils Wholesale Assistant*.\n• Gold Winner, Fortune, Gemini, Idhayam & Palm Oil Box pre-orders active.\n• Cash Bill vs GST Bill fast-lane pickup token generation ready.\n• Direct Tally Prime Sales Vouchers on Port 9000 connected!'
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
    } else if (normalized === 'builder' || normalized === 'construction' || normalized === 'danam' || normalized === 'civil' || normalized === 'house') {
      selectedKey = 'builder';
    } else if (normalized === 'dev' || normalized === 'developer' || normalized === 'sales' || normalized === 'suresh' || normalized === 'solodeveloper') {
      selectedKey = 'dev';
    } else if (normalized === 'plumber' || normalized === 'plumbing' || normalized === 'electrical' || normalized === 'electrician' || normalized === 'mep' || normalized === 'pipes') {
      selectedKey = 'plumber';
    } else if (normalized === 'finance' || normalized === 'budget' || normalized === 'kanakku' || normalized === 'money' || normalized === 'expense' || normalized === 'selavu') {
      selectedKey = 'finance';
    } else if (normalized === 'dhanam_internal' || normalized === 'dhanam' || normalized === 'dhanam_ops' || normalized === 'dh' || normalized === 'internal') {
      selectedKey = 'dhanam_internal';
    } else if (normalized === 'meenakshi_traders' || normalized === 'smt' || normalized === 'meenakshi' || normalized === 'traders' || normalized === 'hardware') {
      selectedKey = 'meenakshi_traders';
    } else if (normalized === 'solodev_pa' || normalized === 'pa' || normalized === 'personal_assistant' || normalized === 'personal assistant' || normalized === 'assistant' || normalized === 'suresh_pa') {
      selectedKey = 'solodev_pa';
    }

    if (!selectedKey || !PERSONAS[selectedKey]) {
      return {
        success: false,
        error: `Unknown mode "${targetMode}". Valid options: wholesale, restaurant, builder, dev, solodev_pa, plumber, finance, dhanam_internal, meenakshi_traders.`
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
      `👉 \`!mode plumber\` ➔ Electrical & Plumbing Site Photos & Laborers\n` +
      `👉 \`!mode wholesale\` ➔ Annamaliyar Oil Store (Stock & Box Rates)\n` +
      `👉 \`!mode restaurant\` ➔ Taj Hotel Biryani (Pre-Orders & Tokens)\n` +
      `👉 \`!mode dev\` ➔ SoloDeveloper.pro (Web & AI Automation Sales)`;
  }
}

const personaManager = new PersonaManager();
module.exports = personaManager;
