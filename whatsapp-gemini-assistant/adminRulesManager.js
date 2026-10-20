const fs = require('fs');
const path = require('path');

const ADMIN_RULES_FILE = path.resolve('./.baileys_auth/admin_rules.json');

class AdminRulesManager {
  constructor() {
    this.rules = this.loadRules();
  }

  loadRules() {
    try {
      if (fs.existsSync(ADMIN_RULES_FILE)) {
        const raw = fs.readFileSync(ADMIN_RULES_FILE, 'utf-8');
        return JSON.parse(raw || '{}');
      }
    } catch (e) {
      console.warn('⚠️ [AdminRules] Failed to read admin_rules.json:', e.message);
    }
    return {
      customDirectives: [],
      priceOverrides: {},
      demoSlots: ['Today at 4:30 PM IST', 'Tomorrow at 11:00 AM IST'],
      botMode: 'normal'
    };
  }

  saveRules() {
    try {
      const dir = path.dirname(ADMIN_RULES_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(ADMIN_RULES_FILE, JSON.stringify(this.rules, null, 2), 'utf-8');
      console.log('💾 [AdminRules] Live rules saved to disk.');
    } catch (e) {
      console.error('❌ [AdminRules Save Error]:', e.message);
    }
  }

  addDirective(text) {
    if (!this.rules.customDirectives) this.rules.customDirectives = [];
    const cleanText = text.trim();
    if (!cleanText) return false;
    this.rules.customDirectives.push({
      id: Date.now(),
      text: cleanText,
      createdAt: new Date().toISOString()
    });
    this.saveRules();
    return true;
  }

  removeDirective(index) {
    if (!this.rules.customDirectives || !this.rules.customDirectives[index - 1]) return false;
    this.rules.customDirectives.splice(index - 1, 1);
    this.saveRules();
    return true;
  }

  clearDirectives() {
    this.rules.customDirectives = [];
    this.saveRules();
  }

  setDemoSlots(slotsArray) {
    this.rules.demoSlots = slotsArray.map(s => s.trim()).filter(Boolean);
    this.saveRules();
  }

  setPrice(serviceName, price) {
    if (!this.rules.priceOverrides) this.rules.priceOverrides = {};
    this.rules.priceOverrides[serviceName.toLowerCase().trim()] = price.trim();
    this.saveRules();
  }

  formatPromptExtension() {
    const parts = [];

    if (this.rules.customDirectives && this.rules.customDirectives.length > 0) {
      parts.push(`\n==================================================\n👑 LIVE BOSS DIRECTIVES (OVERRIDE RULES SENT BY SURESH VIA WHATSAPP):\nSuresh has explicitly configured the following live rules for all chats right now:\n` +
        this.rules.customDirectives.map((d, i) => `${i + 1}. ${d.text}`).join('\n') +
        `\nFollow these live directives strictly above all default recommendations!`);
    }

    if (this.rules.demoSlots && this.rules.demoSlots.length >= 2) {
      parts.push(`\n📅 ACTIVE DEMO SLOTS CONFIGURED BY SURESH:\nSlot 1: ${this.rules.demoSlots[0]}\nSlot 2: ${this.rules.demoSlots[1]}\nAlways offer these exact 2 slots in the 2-slot close technique!`);
    }

    if (this.rules.priceOverrides && Object.keys(this.rules.priceOverrides).length > 0) {
      parts.push(`\n💰 LIVE PRICING OVERRIDES CONFIGURED BY SURESH:\n` +
        Object.entries(this.rules.priceOverrides).map(([k, v]) => `• ${k.toUpperCase()}: ${v}`).join('\n'));
    }

    return parts.join('\n');
  }

  getDirectivesText() {
    const directives = this.rules.customDirectives || [];
    if (directives.length === 0) return "No active custom rules configured.";
    return directives.map((d, i) => `${i + 1}. ${d.text}`).join('\n');
  }

  handleAdminCommand(text) {
    const raw = (text || '').trim();
    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = raw.slice(cmd.length).trim();

    if (cmd === '!rule' || cmd === '!addrule' || cmd === '!add' || cmd === '!update' || cmd === '/rule' || cmd === '/add' || cmd === '/update') {
      if (!args) {
        return "⚠️ *Usage:* `!rule <your instruction here>`\n*Example:* `!rule Always offer a 10% discount for clinics this week`";
      }
      this.addDirective(args);
      return `✅ *Boss, new live rule added!*\n\n📝 *Rule:* "${args}"\n\nAll customer chats will now immediately obey this instruction.`;
    }

    if (cmd === '!rules' || cmd === '!listrules' || cmd === '!list' || cmd === '/rules' || cmd === '/list') {
      const directives = this.rules.customDirectives || [];
      if (directives.length === 0) {
        return "📋 *No active custom rules configured.*\nSend `!rule <instruction>` or simply tell me to add one!";
      }
      let reply = "📋 *Active Live Rules (Configured by Suresh):*\n\n";
      directives.forEach((d, i) => {
        reply += `${i + 1}️⃣ ${d.text}\n`;
      });
      reply += "\n💡 *Tips:* Send `!delrule <number>` to delete or `!clearrules` to remove all.";
      return reply;
    }

    if (cmd === '!delrule' || cmd === '!del' || cmd === '/delrule' || cmd === '/del') {
      const idx = parseInt(args, 10);
      if (isNaN(idx) || !this.removeDirective(idx)) {
        return "⚠️ *Usage:* `!delrule <rule number>`\nCheck numbers with `!rules` first.";
      }
      return `✅ *Rule #${idx} removed successfully!*`;
    }

    if (cmd === '!clearrules' || cmd === '!clear' || cmd === '/clearrules' || cmd === '/clear') {
      this.clearDirectives();
      return "✅ *All live custom rules have been cleared.* Assistant is back to default knowledge base.";
    }

    if (cmd === '!setslots' || cmd === '/setslots') {
      const slots = args.split(',').map(s => s.trim()).filter(Boolean);
      if (slots.length < 2) {
        return "⚠️ *Usage:* `!setslots <Slot 1>, <Slot 2>`\n*Example:* `!setslots Today 5:00 PM, Tomorrow 11:30 AM`";
      }
      this.setDemoSlots([slots[0], slots[1]]);
      return `✅ *Active demo slots updated!*\n\n1️⃣ ${slots[0]}\n2️⃣ ${slots[1]}\n\nThe AI will now offer these slots to all qualified leads.`;
    }

    if (cmd === '!setprice') {
      const splitArgs = args.split(' ');
      if (splitArgs.length < 2) {
        return "⚠️ *Usage:* `!setprice <service> <price>`\n*Example:* `!setprice ecommerce ₹24,999`";
      }
      const service = splitArgs[0];
      const price = splitArgs.slice(1).join(' ');
      this.setPrice(service, price);
      return `✅ *Pricing override saved!*\n\n• *Service:* ${service.toUpperCase()}\n• *Price:* ${price}`;
    }

    if (cmd === '!adminhelp' || (cmd === '!help' && !args)) {
      return `👑 *WhatsApp Boss & Admin Command Menu (Suresh Kumar)*\n\n` +
        `• *!rule <instruction>* ➔ Add a live rule for all client chats\n` +
        `• *!rules* ➔ View all active live rules\n` +
        `• *!delrule <#>* ➔ Delete a specific live rule\n` +
        `• *!clearrules* ➔ Remove all custom rules\n` +
        `• *!setslots <Slot 1>, <Slot 2>* ➔ Change live 2-slot demo times\n` +
        `• *!setprice <service> <price>* ➔ Override service pricing\n` +
        `• *!reset* ➔ Reset conversation memory for this chat\n` +
        `• *!status* ➔ Check bot uptime and AI connection status`;
    }

    return null;
  }
}

module.exports = new AdminRulesManager();
