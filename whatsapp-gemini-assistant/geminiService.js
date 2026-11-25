const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const { GoogleGenAI } = require('@google/genai');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { buildSystemPrompt } = require('./knowledgeBase');
const { calculateSalesManagerMetrics } = require('./offerEngine');
const personaManager = require('./personaManager');
const { WHOLESALE_TOOLS, WHOLESALE_CUSTOMER_TOOLS, buildWholesaleSystemPrompt, executeWholesaleToolCall } = require('./wholesalePersona');
const { RESTAURANT_TOOLS, buildRestaurantSystemPrompt, executeRestaurantToolCall } = require('./restaurantPersona');
const { BUILDER_TOOLS, buildBuilderSystemPrompt, executeBuilderToolCall } = require('./builderPersona');
const { PLUMBING_ELECTRICAL_TOOLS, buildPlumbingElectricalSystemPrompt, executePlumbingElectricalToolCall } = require('./plumbingElectricalPersona');
const { FINANCE_TOOLS, buildFinanceSystemPrompt, executeFinanceToolCall } = require('./financePersona');
const { DHANAM_INTERNAL_TOOLS, buildDhanamInternalSystemPrompt, executeDhanamInternalToolCall } = require('./dhanamInternalPersona');
const { SMT_TOOLS, buildSmtSystemPrompt, executeSmtToolCall } = require('./meenakshiTradersPersona');
const builderCustomerMemory = require('./builderCustomerMemory');

const LEAD_TOOLS = [{
  functionDeclarations: [{
    name: 'saveLeadDetails',
    description: 'Call this tool to save complete AI sales intelligence, business diagnosis, Grand Slam Offer, and closing strategy into Suresh\'s CRM/Google Sheet and alert Suresh whenever the customer shares business details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Name of the contact person' },
        nativeLanguage: { type: 'STRING', description: 'Customer preferred language: Tamil, English, Hindi, Malayalam, Telugu, Kannada' },
        company: { type: 'STRING', description: 'Name of their business or company' },
        industry: { type: 'STRING', description: 'Industry or business niche' },
        businessModel: { type: 'STRING', enum: ['B2B', 'B2C', 'Both / Hybrid'], description: 'Business model: B2B (Wholesale, distributors, manufacturers, commercial) or B2C (Retail, clinics, homeowners, direct consumers) or Both / Hybrid' },
        businessStage: { type: 'STRING', enum: ['new', 'running', 'established'], description: 'Business Stage: new (just started), running (needs more leads/automation), or established (B2B wholesale)' },
        websiteStatus: { type: 'STRING', description: 'Website status (e.g. Has website [URL/details], No website / WhatsApp only, Wants new website)' },
        email: { type: 'STRING', description: 'Email address of the customer' },
        location: { type: 'STRING', description: 'City or business location' },
        recommendedSolution: { type: 'STRING', description: 'Recommended solution: Website, WhatsApp Assistant, Automation, Lead Entry / Capture, or None' },
        teamSize: { type: 'STRING', description: 'Team size or employee count' },
        revenueRange: { type: 'STRING', description: 'Business Revenue Range (Below ₹5L, ₹5L-₹25L, ₹25L-₹1Cr, ₹1Cr+)' },
        authorityLevel: { type: 'STRING', description: 'Authority Level: Decision Maker, Influencer, Researcher, or Employee' },
        monthlyEnquiries: { type: 'STRING', description: 'Average monthly enquiries/leads' },
        currentSource: { type: 'STRING', description: 'How customers currently find them (Google, Instagram, Referrals, Ads, Offline)' },
        currentProcess: { type: 'STRING', description: 'Their existing before-workflow (e.g. Instagram -> WhatsApp -> Manual reply -> Meeting -> Excel)' },
        buyingTrigger: { type: 'STRING', description: 'Why looking now? (e.g. New launch, expansion, lost customers, seasonal demand)' },
        problemCategory: { type: 'STRING', description: 'Lead Generation, Lead Conversion, Customer Management, Internal Efficiency, Automation, or Digital Presence' },
        painPoint: { type: 'STRING', description: 'Specific bottleneck, challenge, or pain point' },
        painSeverity: { type: 'STRING', description: 'Pain Severity: Moderate, High, or Critical' },
        dreamOutcome: { type: 'STRING', description: 'Goal, target outcome, or desired result in 6 months' },
        lostOpportunity: { type: 'STRING', description: 'Estimated lost inquiries or revenue per month due to this bottleneck' },
        currentTools: { type: 'STRING', description: 'Tools currently used (Excel, Sheets, WhatsApp Business, CRM, None)' },
        transformationStatement: { type: 'STRING', description: 'Before State + After State + Mechanism (e.g. Convert Instagram visitors into qualified consultation bookings using an AI enquiry & follow-up system)' },
        grandSlamOffer: { type: 'STRING', description: 'Personalized Grand Slam Offer tailored to this business (Offer name + key inclusions)' },
        aiConfidence: { type: 'STRING', description: 'Diagnosis Confidence Score (e.g. 92%) with a 1-sentence rationale' },
        urgency: { type: 'STRING', description: 'Urgency Level: Low, Medium, High, or Critical' },
        timeline: { type: 'STRING', description: 'Expected project timeline (Immediate, This month, Exploring)' },
        budgetStatus: { type: 'STRING', description: 'Budget status (Allocated, Deciding, Guidance needed)' },
        leadScore: { type: 'STRING', enum: ['Hot', 'Warm', 'Cold'], description: 'Lead priority score' },
        sureshClosingScript: { type: 'STRING', description: 'Mini 2-3 bullet cheat-sheet for Suresh to close on the call: Opening hook, pain to poke, exact offer to pitch' },
        followupStrategy: { type: 'STRING', description: 'Specific follow-up message template tailored for this lead' },
        pipelineStage: { type: 'STRING', description: 'CRM Pipeline Stage: 1. PROSPECT IDENTIFIED, 2. AI RESEARCHED, 3. OUTREACH SENT, 4. INTERESTED REPLY, 5. QUALIFIED, 6. STRATEGY CALL BOOKED, 7. PROPOSAL SENT, 8. NEGOTIATION, 9. WON (CLOSED), 10. LOST' },

        conversationIntent: { type: 'STRING', description: 'Conversation Intent: Ready To Buy, Urgent Problem, Comparing Options, Researching, Just Curious' },
        estimatedDealValue: { type: 'STRING', description: 'Estimated Deal Value (e.g. ₹9,999, ₹19,999, ₹29,999, ₹49,999)' },
        winProbability: { type: 'STRING', description: 'Win Probability percentage (e.g. 80%, 50%, 25%)' },
        revenueForecast: { type: 'STRING', description: 'Weighted Revenue Forecast (Estimated Deal Value × Win Probability)' },
        priorityRank: { type: 'STRING', description: 'Priority Rank: #1 Priority (VIP Closing Call), #2 Priority (High Probability), #3 Priority (Nurture & Demo), #4 Priority (Automated Follow-up)' },
        aiRecommendedAction: { type: 'STRING', description: 'AI Recommended Action: Call Now (Direct Closing Call), Send Proposal & Interactive Wireframe, Send Case Study & ROI Breakdown, Schedule Demo / Walkthrough, Reactivate via Automated Nurture Sequence' },
        dealRisk: { type: 'STRING', description: 'Deal Risk: Low Risk (Fast close expected), Medium Risk, or High Risk with reason' },
        closingProbabilityReason: { type: 'STRING', description: 'Detailed reason explaining why this deal has high or low closing probability' },
        nextBestMessage: { type: 'STRING', description: 'Exact personalized copy-paste WhatsApp message ready for Suresh to send to close or advance the deal' }
      },
      required: ['company', 'problemCategory']
    }
  },
  {
    name: 'bookStrategyDemo',
    description: 'Call this tool whenever a customer or prospect agrees to a demo or strategy call, selects a time slot (e.g. "Today 4:30 PM", "Tomorrow 11 AM"), or confirms a live consultation with Suresh.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prospectName: { type: 'STRING', description: 'Name of the person booking the demo' },
        company: { type: 'STRING', description: 'Business or company name' },
        industry: { type: 'STRING', description: 'Industry or business category' },
        demoTimeSlot: { type: 'STRING', description: 'Selected time slot (e.g. Today at 4:30 PM IST, Tomorrow at 11:00 AM IST)' },
        meetingType: { type: 'STRING', enum: ['Google Meet', 'WhatsApp Call', 'Phone Call'], description: 'Meeting channel format' },
        painPoint: { type: 'STRING', description: 'Core problem to demonstrate solving' },
        notes: { type: 'STRING', description: 'Any special requests or details mentioned' }
      },
      required: ['prospectName', 'demoTimeSlot']
    }
  },
  {
    name: 'generateAndSendProposal',
    description: 'Call this tool to generate and dispatch the personalized Grand Slam Proposal, interactive blueprint, and 3-tier pricing options to the prospect via WhatsApp and Email, advancing the CRM pipeline stage to 7. PROPOSAL SENT.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prospectName: { type: 'STRING', description: 'Name of the contact person' },
        company: { type: 'STRING', description: 'Business or company name' },
        industry: { type: 'STRING', description: 'Industry or business niche' },
        email: { type: 'STRING', description: 'Email address of the prospect for proposal delivery' },
        painPoint: { type: 'STRING', description: 'Core problem to solve' },
        dreamOutcome: { type: 'STRING', description: 'Target result or outcome' },
        recommendedTier: { type: 'STRING', description: 'Recommended Tier (e.g. Tier 2: Autonomous AI Growth System)' },
        notes: { type: 'STRING', description: 'Any special inclusions or customization requests' }
      },
      required: ['prospectName', 'company']
    }
  }]
}];

const OWNER_TOOLS = [{
  functionDeclarations: [
    {
      name: 'saveBossDirective',
      description: 'Call this tool whenever Suresh Kumar (the owner/boss) gives a new command, instruction, rule, behavioral advice, question to ask customers, or knowledge update in natural language (e.g. "update this on knowledge base", "from now on ask customers X", "remember this rule", "add this rule", "promote scroll animations", etc.). This tool saves the rule permanently to disk so that all customer conversations immediately use it.',
      parameters: {
        type: 'OBJECT',
        properties: {
          directive: { type: 'STRING', description: 'The exact rule, instruction, or knowledge update stated by Suresh' },
          category: { type: 'STRING', enum: ['RULE', 'KNOWLEDGE', 'PRICING', 'SLOTS', 'PROMPT'], description: 'Category of the directive' }
        },
        required: ['directive']
      }
    },
    {
      name: 'listBossDirectives',
      description: 'Call this tool when Suresh asks what rules or instructions are currently active in the knowledge base.',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'clearBossDirectives',
      description: 'Call this tool when Suresh tells you to clear, delete, or reset all custom rules back to defaults.',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    }
  ]
}];

const N8N_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';

function isDummyPhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 10) return true;
  return /^(91)?(98765\d{5}|12345\d{5}|00000\d{5}|11111\d{5}|99999\d{5}|0{10}|1{10})/.test(digits) ||
         digits.startsWith('91000000') ||
         digits === '910000000000' ||
         digits === '0000000000' ||
         String(phone).toLowerCase().includes('test') ||
         String(phone).toLowerCase().includes('simulation');
}

function dispatchProposalToN8n(proposalData) {
  try {
    if (proposalData.isTestLead || isDummyPhone(proposalData.phone)) {
      console.log(`🧪 [Test Safeguard] Skipped n8n proposal dispatch for dummy/test lead (${proposalData.phone})`);
      return;
    }

    const postData = JSON.stringify(proposalData);
    const options = {
      hostname: N8N_HOST,
      port: 443,
      path: '/webhook/proposal-delivery',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`📡 [n8n Webhook] Proposal Delivery dispatched! Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      console.error(`⚠️ [n8n Webhook Error] Failed to dispatch proposal: ${e.message}`);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error(`[Proposal Dispatch Error]:`, err.message);
  }
}

function dispatchDemoBookingToN8n(bookingData) {
  try {
    if (bookingData.isTestLead || isDummyPhone(bookingData.phone)) {
      console.log(`🧪 [Test Safeguard] Skipped n8n demo booking dispatch for dummy/test lead (${bookingData.phone})`);
      return;
    }

    const postData = JSON.stringify(bookingData);
    const options = {
      hostname: N8N_HOST,
      port: 443,
      path: '/webhook/demo-booking',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`📡 [n8n Webhook] Demo Booking dispatched! Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      console.error(`⚠️ [n8n Webhook Error] Failed to log demo booking: ${e.message}`);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error(`[Demo Dispatch Error]:`, err.message);
  }
}

function dispatchLeadToN8n(leadData) {
  try {
    if (leadData.isTestLead || isDummyPhone(leadData.phone)) {
      console.log(`🧪 [Test Safeguard] Skipped n8n CRM dispatch for dummy/test lead (${leadData.phone})`);
      return;
    }

    const postData = JSON.stringify(leadData);
    const options = {
      hostname: N8N_HOST,
      port: 443,
      path: '/webhook/whatsapp-direct-lead',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`📡 [n8n Webhook] Sales Intelligence Dossier logged! Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      console.error(`⚠️ [n8n Webhook Error] Failed to log lead: ${e.message}`);
    });

    req.write(postData);
    req.end();

  } catch (err) {
    console.error(`[Dispatch Error]:`, err.message);
  }
}

const adminRules = require('./adminRulesManager');

const HISTORY_DIR = path.resolve('./.baileys_auth/chat_histories');
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

const PROFILES_FILE = path.join(HISTORY_DIR, 'contact_profiles.json');

// Global dynamic model cooldown cache to skip quota-exhausted (HTTP 429) models with 0ms delay
const exhaustedModelsCache = new Map();
function isModelQuotaExhausted(modelName) {
  const hit = exhaustedModelsCache.get(modelName);
  if (!hit) return false;
  if (Date.now() - hit > 60 * 60 * 1000) { // 1 hour cooldown
    exhaustedModelsCache.delete(modelName);
    return false;
  }
  return true;
}

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    this.maxHistory = parseInt(process.env.MAX_HISTORY_TURNS || '15', 10);
    this.ownerPhone = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');
    
    // In-memory cache of conversation turns
    this.historyStore = new Map();

    // Persistent contact profiles store
    this.profiles = this.loadContactProfiles();

    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.ai = null;
    }
  }

  // Sanitize Tamil responses: eliminate Sinhala (\u0D80-\u0DFF) and Malayalam (\u0D00-\u0D7F) glyphs and corrupted words
  sanitizeTamilText(text) {
    if (!text || typeof text !== 'string') return text;
    let clean = text;
    // 1. Fix known Sinhala / Tamil mixed corruption words like நியமங்களின்படி
    clean = clean.replace(/ந[\u0D80-\u0DFF]+மங்களின்படி/g, 'விதிமுறைகளின்படி');
    clean = clean.replace(/ந[\u0D80-\u0DFF]+ம/g, 'விதிமுறை');
    clean = clean.replace(/நியமங்களின்படி/g, 'விதிமுறைகளின்படி');
    clean = clean.replace(/நியம/g, 'விதிமுறை');
    clean = clean.replace(/நியமம்/g, 'விதிமுறை');

    // 2. Eradicate any stray Sinhala Unicode block (\u0D80-\u0DFF)
    clean = clean.replace(/[\u0D80-\u0DFF]/g, '');

    // 3. Eradicate any stray Malayalam Unicode block (\u0D00-\u0D7F)
    clean = clean.replace(/[\u0D00-\u0D7F]/g, '');

    // 4. Clean up any accidental double spaces resulting from stripping
    clean = clean.replace(/[ ]{2,}/g, ' ');

    // 5. Strip any bracketed internal directives if leaked by LLM
    clean = clean.replace(/^\[(?:CRITICAL|SYSTEM|CONTEXT|INTERRUPTION|IDENTITY|IMAGE|FINANCE|SRI MEENAKSHI|[A-Z\s&_-]+ DIRECTIVE).*?\]:\s*/is, '');
    clean = clean.replace(/\[(?:CRITICAL|SYSTEM|CONTEXT|INTERRUPTION|IDENTITY|IMAGE|FINANCE|SRI MEENAKSHI|[A-Z\s&_-]+ DIRECTIVE).*?\]:\s*/gis, '');

    return clean.trim();
  }

  getSystemInstruction(chatId = '', overrideMode = null, platform = 'whatsapp', options = {}) {
    const mode = overrideMode || personaManager.getActiveMode();
    let base = '';
    if (mode === 'wholesale') {
      base = buildWholesaleSystemPrompt();
    } else if (mode === 'restaurant') {
      base = buildRestaurantSystemPrompt(chatId);
    } else if (mode === 'builder') {
      base = buildBuilderSystemPrompt();
    } else if (mode === 'plumber') {
      base = buildPlumbingElectricalSystemPrompt();
    } else if (mode === 'finance') {
      base = buildFinanceSystemPrompt();
    } else if (mode === 'dhanam_internal') {
      base = buildDhanamInternalSystemPrompt();
    } else if (mode === 'meenakshi_traders') {
      base = buildSmtSystemPrompt(chatId, options);
    } else {
      base = buildSystemPrompt();
    }

    const liveRules = adminRules.formatPromptExtension();
    let finalPrompt = liveRules ? `${base}\n\n${liveRules}` : base;

    if (platform === 'instagram') {
      finalPrompt += `\n\n==================================================
📸 INSTAGRAM DM OMNICHANNEL BEHAVIOR RULES (STRICT):
1. Follow EVERY single business rule, language rule (Tamil default for Builder, zero Sinhala/Malayalam script, English technical loanwords), objection handler, human handover (+91 93615 99097), and complaint escalation rule from above identically on Instagram DM.
2. Keep every Instagram DM concise, conversational, and strictly under 850 characters (Meta Instagram hard limit is 1,000 chars).
3. Ask EXACTLY ONE clear question at a time — never overwhelm with multiple questions.
4. Do NOT use ugly raw markdown like **bold** or ## headings (Instagram DM does not render Markdown — use clean spacing, bullet symbols •, and light natural emojis).
5. Once the customer's core need is clear, naturally invite them to share their 10-digit WhatsApp Mobile Number so we can send PDFs, 2D floor plans, 3D elevations, or detailed proposals directly to their WhatsApp!`;
    }

    return finalPrompt;
  }

  getActiveTools(isOwner, overrideMode = null, options = {}) {
    const mode = overrideMode || personaManager.getActiveMode();
    if (mode === 'wholesale') {
      return options.isWholesaleAdminGroup ? WHOLESALE_TOOLS : WHOLESALE_CUSTOMER_TOOLS;
    }
    if (mode === 'restaurant') {
      return RESTAURANT_TOOLS;
    }
    if (mode === 'builder') {
      return BUILDER_TOOLS;
    }
    if (mode === 'plumber') {
      return PLUMBING_ELECTRICAL_TOOLS;
    }
    if (mode === 'finance') {
      return FINANCE_TOOLS;
    }
    if (mode === 'dhanam_internal') {
      return DHANAM_INTERNAL_TOOLS;
    }
    if (mode === 'meenakshi_traders') {
      return SMT_TOOLS;
    }
    return isOwner ? OWNER_TOOLS : LEAD_TOOLS;
  }

  getScopedChatId(chatId) {
    const mode = personaManager.getActiveMode();
    return `${chatId}__${mode}`;
  }

  loadContactProfiles() {
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
        return JSON.parse(raw || '{}');
      }
    } catch (e) {
      console.warn('[Profile Memory] Failed to load contact_profiles.json:', e.message);
    }
    return {};
  }

  saveContactProfile(cleanId, profileData) {
    try {
      const existing = this.profiles[cleanId] || {};
      this.profiles[cleanId] = {
        ...existing,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      // Non-blocking async file write
      fs.promises.writeFile(PROFILES_FILE, JSON.stringify(this.profiles, null, 2), 'utf-8').catch(err => {
        console.warn('[Profile Memory Async Save Error]:', err.message);
      });
      console.log(`💾 [Profile Saved] Updated memory for ${cleanId}`);
    } catch (e) {
      console.warn('[Profile Memory Save Error]:', e.message);
    }
  }

  getContactProfile(cleanId) {
    return this.profiles[cleanId] || null;
  }

  getHistoryFilePath(chatId) {
    const cleanId = chatId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(HISTORY_DIR, `${cleanId}.json`);
  }

  getOrCreateHistory(chatId) {
    const key = chatId.includes('__') ? chatId : this.getScopedChatId(chatId);
    // If already in memory, move to most recently used position
    if (this.historyStore.has(key)) {
      const history = this.historyStore.get(key);
      this.historyStore.delete(key);
      this.historyStore.set(key, history);
      return history;
    }

    // LRU eviction: if memory has > 200 conversations, evict oldest
    const MAX_MEMORY_CHATS = 200;
    if (this.historyStore.size >= MAX_MEMORY_CHATS) {
      const oldestKey = this.historyStore.keys().next().value;
      if (oldestKey) {
        this.saveHistory(oldestKey);
        this.historyStore.delete(oldestKey);
      }
    }

    const filePath = this.getHistoryFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          console.log(`📂 [History Restored] Loaded ${data.length} turns for ${key}`);
          this.historyStore.set(key, data);
          return data;
        }
      } catch (e) {
        console.warn(`[History Load Error] for ${key}:`, e.message);
      }
    }
    this.historyStore.set(key, []);
    return this.historyStore.get(key);
  }

  saveHistory(chatId) {
    try {
      const key = chatId.includes('__') ? chatId : this.getScopedChatId(chatId);
      const history = this.historyStore.get(key);
      if (history) {
        const filePath = this.getHistoryFilePath(key);
        // Strip large inlineData (base64 images/audio) before persisting to disk to prevent massive JSON files
        const cleanedHistory = history.map(entry => {
          if (!entry || !Array.isArray(entry.parts)) return entry;
          return {
            ...entry,
            parts: entry.parts.map(p => {
              if (p && p.inlineData) {
                return { text: '[Media attached by user]' };
              }
              return p;
            })
          };
        });
        // Non-blocking async file write
        fs.promises.writeFile(filePath, JSON.stringify(cleanedHistory, null, 2), 'utf-8').catch(err => {
          console.warn(`[History Async Save Error] for ${key}:`, err.message);
        });
      }
    } catch (e) {
      console.warn(`[History Save Error] for ${chatId}:`, e.message);
    }
  }

  resetHistory(chatId) {
    const modes = ['dev', 'wholesale', 'restaurant'];
    modes.forEach(m => {
      const key = `${chatId}__${m}`;
      this.historyStore.delete(key);
      try {
        const filePath = this.getHistoryFilePath(key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {}
    });

    this.historyStore.delete(chatId);
    try {
      const filePath = this.getHistoryFilePath(chatId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }

  cleanFailedTurn(chatId) {
    const key = chatId.includes('__') ? chatId : this.getScopedChatId(chatId);
    const history = this.historyStore.get(key);
    if (!history || history.length === 0) return;
    // Pop incomplete user or model turn
    const last = history[history.length - 1];
    if (last && (last.role === 'user' || (last.role === 'model' && last.parts?.some(p => p.functionCall)))) {
      history.pop();
    }
  }

  /**
   * Deep sanitize history to strictly conform to Gemini 3.1 & 2.5 API requirements:
   * 1. Every functionCall part MUST have a thoughtSignature (injects fallback if missing).
   * 2. Every model functionCall MUST be followed by user functionResponse.
   * 3. History MUST start with role: 'user'.
   * 4. Roles MUST alternate properly.
   * 5. If stripFunctionCalls=true, strips tool-calling parts to allow plain conversational fallback.
   */
  sanitizeHistory(historyArray, stripFunctionCalls = false) {
    if (!Array.isArray(historyArray) || historyArray.length === 0) {
      return [];
    }

    const sanitized = [];

    for (let i = 0; i < historyArray.length; i++) {
      const turn = historyArray[i];
      if (!turn || !turn.role || !Array.isArray(turn.parts) || turn.parts.length === 0) {
        continue;
      }

      if (stripFunctionCalls) {
        // Filter out functionCall and functionResponse for emergency fallback
        if (turn.parts.some(p => p.functionResponse)) {
          continue;
        }
        const textParts = turn.parts.filter(p => p.text);
        if (textParts.length > 0) {
          sanitized.push({
            role: turn.role,
            parts: textParts
          });
        }
        continue;
      }

      // Check if turn contains functionCall
      const hasFunctionCall = turn.role === 'model' && turn.parts.some(p => p.functionCall);
      if (hasFunctionCall) {
        const nextTurn = historyArray[i + 1];
        const nextHasResponse = nextTurn && nextTurn.role === 'user' && Array.isArray(nextTurn.parts) && nextTurn.parts.some(p => p.functionResponse);
        if (!nextHasResponse) {
          // Incomplete tool call: convert to plain text or skip to avoid 400 error
          continue;
        }

        // Ensure every functionCall has thoughtSignature (crucial for Gemini 3.1)
        const partsWithSig = turn.parts.map(p => {
          if (p.functionCall) {
            return {
              ...p,
              thoughtSignature: p.thoughtSignature || 'skip_thought_signature_validator'
            };
          }
          return p;
        });

        sanitized.push({
          role: 'model',
          parts: partsWithSig
        });
        continue;
      }

      // Check if turn is a functionResponse
      const hasFunctionResponse = turn.role === 'user' && turn.parts.some(p => p.functionResponse);
      if (hasFunctionResponse) {
        const prevTurn = sanitized[sanitized.length - 1];
        const prevHasCall = prevTurn && prevTurn.role === 'model' && prevTurn.parts.some(p => p.functionCall);
        if (!prevHasCall) {
          // Orphaned response without preceding call: skip
          continue;
        }
        sanitized.push(turn);
        continue;
      }

      // Normal text or multimodal user/model turn
      sanitized.push(turn);
    }

    // Ensure history starts with a user turn
    while (sanitized.length > 0 && sanitized[0].role !== 'user') {
      sanitized.shift();
    }

    return sanitized;
  }

  /**
   * Execute a single function call triggered by Gemini AI
   */
  async executeToolCall(fnCall, chatId, cleanId, isOwner = false, overrideMode = null, media = null, targetUid = null, options = {}) {
    const fnName = fnCall.name;
    const args = fnCall.args || {};
    const mode = overrideMode || personaManager.getActiveMode();

    if (mode === 'wholesale') {
      return await executeWholesaleToolCall(fnCall, chatId, options);
    }

    if (mode === 'restaurant') {
      return await executeRestaurantToolCall(fnCall, chatId);
    }

    if (mode === 'builder') {
      return await executeBuilderToolCall(fnCall, chatId);
    }

    if (mode === 'plumber') {
      return await executePlumbingElectricalToolCall(fnCall, chatId, media);
    }

    if (mode === 'finance') {
      return await executeFinanceToolCall(fnCall, chatId, targetUid);
    }

    if (mode === 'dhanam_internal') {
      return await executeDhanamInternalToolCall(fnCall, chatId);
    }

    if (mode === 'meenakshi_traders') {
      return await executeSmtToolCall(fnCall, chatId, options);
    }

    if (fnName === 'saveLeadDetails') {
      console.log(`🎯 [AI Sales Intelligence Generated]:`, args);
      this.saveContactProfile(cleanId, {
        name: args.name,
        company: args.company,
        industry: args.industry,
        businessModel: args.businessModel,
        websiteStatus: args.websiteStatus,
        email: args.email,
        painPoint: args.painPoint,
        dreamOutcome: args.dreamOutcome,
        discovery: {
          primary_need: args.dreamOutcome || args.primaryGoal || null,
          bottleneck: args.painPoint || null,
          website_required: args.websiteStatus ? !args.websiteStatus.toLowerCase().includes('already') : null
        },
        sales: {
          urgency: args.urgency || null,
          timeline: args.timeline || null,
          budget: args.budget || null
        },
        memory: {
          summary: args.transformationStatement || `${args.name || 'Prospect'} runs ${args.company || args.industry || 'a business'} facing ${args.painPoint || 'challenges'}.`,
          last_topic: args.industry || 'inquiry'
        }
      });

      const calculatedMetrics = calculateSalesManagerMetrics(args);
      const leadPayload = {
        ...args,
        priorityRank: args.priorityRank || calculatedMetrics.priorityRank,
        aiRecommendedAction: args.aiRecommendedAction || calculatedMetrics.aiRecommendedAction,
        dealRisk: args.dealRisk || calculatedMetrics.dealRisk,
        closingProbabilityReason: args.closingProbabilityReason || calculatedMetrics.closingProbabilityReason,
        nextBestMessage: args.nextBestMessage || calculatedMetrics.nextBestMessage,
        phone: chatId.replace(/[^0-9]/g, '')
      };
      dispatchLeadToN8n(leadPayload);
      return { status: 'logged_successfully', message: "Sales intelligence recorded in Suresh's CRM" };
    }

    if (fnName === 'bookStrategyDemo') {
      console.log(`📅 [Strategy Demo Booked]:`, args);
      const meetLink = process.env.GOOGLE_MEET_LINK || 'https://meet.google.com/jdf-qrvw-tkm';
      const bookingPayload = {
        ...args,
        phone: chatId.replace(/[^0-9]/g, ''),
        meetingLink: meetLink
      };
      dispatchDemoBookingToN8n(bookingPayload);
      return {
        status: 'confirmed',
        meetingLink: meetLink,
        message: 'Demo slot reserved successfully on Google Calendar. Confirmation sent.'
      };
    }

    if (fnName === 'generateAndSendProposal') {
      console.log(`📑 [Proposal Generated]:`, args);
      const proposalPayload = {
        ...args,
        phone: chatId.replace(/[^0-9]/g, '')
      };
      dispatchProposalToN8n(proposalPayload);
      return {
        status: 'proposal_dispatched',
        message: 'The custom Grand Slam proposal, 3-tier pricing options, and architecture blueprint were delivered via WhatsApp and Email. Stage updated to 7. PROPOSAL SENT.'
      };
    }

    if (fnName === 'saveBossDirective') {
      if (!isOwner) {
        console.warn(`🔒 [Security Guard] Unauthorized attempt to save boss directive from chatId=${chatId}`);
        return {
          status: 'error',
          error: 'Unauthorized: Only verified owner (Suresh Kumar) can update business directives.'
        };
      }
      console.log(`👑 [Boss Directive Saved via Tool]:`, args);
      const directive = args.directive || '';
      if (directive) {
        adminRules.addDirective(directive);
      }
      return {
        status: 'saved',
        message: `Directive saved successfully to live admin_rules.json. All customer conversations now strictly follow: "${directive}". Current active rules count: ${(adminRules.rules.customDirectives || []).length}`
      };
    }

    if (fnName === 'listBossDirectives') {
      const rulesText = adminRules.getDirectivesText();
      return {
        status: 'listed',
        activeRules: rulesText
      };
    }

    if (fnName === 'clearBossDirectives') {
      adminRules.clearDirectives();
      return {
        status: 'cleared',
        message: 'All custom directives have been cleared. AI is now operating on default base rules.'
      };
    }

    return { status: 'unknown_tool', message: `Tool ${fnName} not recognized` };
  }

  /**
   * Process a text or multimodal message with Gemini
   * @param {string} chatId - WhatsApp contact or group ID
   * @param {string} userText - User's message or prompt
   * @param {object|null} media - { mimetype, data (base64) } if an image or document was sent
   * @param {object} options - { isOwner, senderName }
   * @returns {Promise<string>}
   */
  async generateResponse(chatId, userText, media = null, options = {}) {
    if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY') {
      return "⚠️ *Gemini API Key missing!* Please add your valid API key in the `.env` file and restart the bot.";
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }

    const cleanDigits = (chatId || '').replace(/\D/g, '');
    const isOwnerByPhone = cleanDigits === this.ownerPhone;
    const isOwner = Boolean(options.isOwner || isOwnerByPhone);
    const cleanId = (chatId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const mode = options.overrideMode || personaManager.getActiveMode();

    // Update owner status in profile store
    if (isOwner) {
      this.saveContactProfile(cleanId, { isOwner: true, name: 'Suresh Kumar', role: 'Owner/Founder' });
    }

    try {
      const history = this.getOrCreateHistory(chatId);
      const systemInstruction = this.getSystemInstruction(chatId, mode, options.platform || 'whatsapp', options);

      // Build user parts
      const userParts = [];
      if (media && media.mimetype && media.data) {
        userParts.push({
          inlineData: {
            mimeType: media.mimetype,
            data: media.data
          }
        });
      }

      if (media && media.isAudio) {
        let audioInstruction = '';
        if (mode === 'finance') {
          audioInstruction = `[FINANCE VOICE NOTE FROM USER]: Listen carefully to this voice note where the user describes an expense, income, or financial query in Tamil, Tanglish, or English.
1. If logging an expense or income (e.g. "Tea ₹20 kudichen", "petrol 500 potten", "received 5000 freelance"):
   - Identify Amount, Category, Description, and Payment Mode.
   - If all required details are present or easily inferred, call the "addTransaction" tool immediately!
   - If any critical info is missing (e.g. amount is not mentioned), politely ask the user for the missing detail.
2. If asking for balances or monthly summary:
   - Call "getBalances" or "getMonthlySummary".
Reply naturally in friendly spoken Tamil / Tanglish.`;
        } else if (mode === 'wholesale' && options.isWholesaleAdminGroup) {
          audioInstruction = `[ADMIN GROUP VOICE NOTE - EXECUTE IMMEDIATELY]:
Listen carefully to the attached audio (in Tamil, Tanglish, or English)${userText && userText.trim() ? ` along with the text "${userText.trim()}"` : ''}.
1. Extract EVERY product name, pack size, price, and stock mentioned in the audio.
2. If adding a new product or setting its price/stock: IMMEDIATELY call "upsertWholesaleProduct".
3. If updating a product's price or marking stock as 0 / finished ("ஸ்டாக் ஜீரோ", "முடிஞ்சு போச்சு", "stock illa"): IMMEDIATELY call "updateWholesaleStockOrPrice" (set stockBoxes: 0 or markOutOfStock: true when out of stock).
4. If removing/deleting a product or price ("ரிமூவ் பண்ணு", "டெலீட் பண்ணு", "தூக்கு"): IMMEDIATELY call "removeWholesaleProduct".
5. If changing how the agent behaves with customers: IMMEDIATELY call "manageLiveBehaviorRule".
6. NEVER ask "what should I update?" if ANY product or price is spoken in the audio — execute the tool FIRST, then reply in this WhatsApp group with:
   ✅ *Google Sheet அப்டேட் செய்யப்பட்டது!* (or 🗑️ *நீக்கப்பட்டது!* / ⚙️ *விதி மாற்றப்பட்டது!*)
   • *ப்ராடக்ட்:* <Product Name>
   • *விலை:* ₹<Price>
   • *ஸ்டாக்:* <Stock / Out of Stock>`;
        } else {
          audioInstruction = (userText && userText.trim().length > 0)
            ? `The user sent this voice note with additional text: "${userText.trim()}". Listen carefully to the voice note, understand what they are asking in whichever language they spoke (Tamil, Tanglish, English, Hindi, or any other language), and reply naturally, politely, and concisely in that same language following your knowledge base rules.`
            : "Listen carefully to this voice note from the client. Understand what they are asking in whichever language they spoke (Tamil, Tanglish, English, Hindi, or any other language), and reply helpfully, politely, and concisely in that same language following your knowledge base rules.";
        }
        userParts.push({ text: audioInstruction });
      } else if (media && media.isVideo) {
        const hasCaption = userText && userText.trim().length > 0;
        let videoInstruction = '';
        if (mode === 'builder') {
          const builderContext = builderCustomerMemory.buildContextInjection(chatId, hasCaption ? userText : '[VIDEO_OR_REEL_SHARED]');
          videoInstruction = `${builderContext}
🎥 [FULL VIDEO & AUDIO TRACK MULTIMODAL ANALYSIS DIRECTIVE]:
The customer shared a house construction / elevation video or reel (${media.seconds || ''}s duration)${hasCaption ? ` with message: "${userText.trim()}"` : ''}.
1. WATCH VISUAL FRAMES: Inspect the architectural design, floors (G+1/G+2, Duplex, Luxury Villa), 3D exterior elevation, balcony glass work, teak main door, exterior textures, and room layouts.
2. LISTEN TO THE AUDIO TRACK: Listen attentively to the narration / spoken audio in the video (Tamil, Tanglish, or English). Identify any spoken specifications: plot size, sq.ft, budget, number of BHK, and location.
3. Reply in natural spoken TAMIL script (தமிழ் எழுத்துக்களில்) as the senior turnkey civil engineer for Danam Holdings in Madurai.
4. Confirm both the visual features you observed AND the spoken details you heard in the audio.
5. Assure the customer that Danam Holdings can construct this exact turnkey house under our Standard (₹1,950/Sq.Ft) or Premium (₹2,350/Sq.Ft) package.
6. Seamlessly ask about their plot location in Madurai or plot dimensions to calculate an immediate preliminary estimate!`;
        } else {
          videoInstruction = `The user shared this video${hasCaption ? ` with message: "${userText.trim()}"` : ''}. Watch the visual frames and listen to the audio track. Understand what is being shown and spoken, and answer helpfully.`;
        }
        userParts.push({ text: videoInstruction });
      } else if (userText && userText.trim().length > 0) {
        let contextualText = userText.trim();
        const trimmedLower = userText.trim().toLowerCase();
        const hasTamil = /[\u0B80-\u0BFF]/.test(userText);
        const asksForTamil = /\b(tamil|தமிழ்)\b/i.test(userText);
        const asksForTanglish = false;
        const isTanglishText = false;

        if (mode === 'wholesale') {
          if (options.isWholesaleAdminGroup) {
            contextualText = `[AUTHORIZED ADMIN GROUP: Annamaiyar oil group. If adding/updating a product, changing price, removing a product/price, marking stock = 0 (Out of Stock), sharing a Google Sheet link, or changing agent behavior rules, call upsertWholesaleProduct, updateWholesaleStockOrPrice, removeWholesaleProduct, setWholesaleGoogleSheet, or manageLiveBehaviorRule immediately and reply with a clear confirmation in Tamil]: ${contextualText}`;
          } else {
            contextualText = `[Annamaliyar Oil Store Customer Inquiry - Mattuthavani Vegetable Market, Shop No. 13, Madurai (Open 4 AM - 3 PM / up to 5 PM, closed on Market Leave days). Retail (1-2 pouches) & Wholesale (boxes/tins) both available. STRICT FIXED PRICES from Google Sheet — NEVER accept customer bargaining or price changes. Only mention asked products. If stock is 0, say out of stock and only mention last sold price if asked]: ${contextualText}`;
          }
        } else if (mode === 'restaurant') {
          if (isOwner) {
            contextualText = `[Direct message from Taj Hotel Madurai management. Assist with menu items, kitchen pre-orders, and tokens]: ${contextualText}`;
          } else {
            contextualText = `[Taj Hotel Madurai Biryani Parcel Inquiry. Welcome warmly with food emojis. Highlight Seeraga Samba Dum Biryani (Chicken ₹190, Mutton ₹290, Fish ₹270). Suggest Mutton Sukka or Rose Milk. When confirmed, call bookRestaurantOrder to generate Token #TAJ-XXX for 10-second counter pickup]: ${contextualText}`;
          }
        } else if (mode === 'builder') {
          // Dedicated Builder & House Construction mode (Danam Holdings - Er. Dhilip Kumar)
          const builderContext = builderCustomerMemory.buildContextInjection(chatId, userText);
          const imagePrompt = (media && !media.isAudio)
            ? `\n[IMAGE / ELEVATION SCREENSHOT ATTACHED]: The customer sent a photo or screenshot along with their text ("${userText.trim()}").
1. Inspect the architectural design, floors, elevation style, textures, and balcony/glass elements in the photo.
2. Praise the design warmly in natural spoken TAMIL script (தமிழ் எழுத்துக்களில்).
3. State that Danam Holdings in Madurai can construct this exact turnkey house seamlessly under our Standard (₹1,950/Sq.Ft) or Premium (₹2,350/Sq.Ft) packages.
4. Seamlessly ask about their plot dimensions or locality to compute an exact preliminary estimate!`
            : '';
          contextualText = `${builderContext}${imagePrompt}\n[CUSTOMER INCOMING MESSAGE]: ${userText.trim()}`;
        } else if (mode === 'finance') {
          const imagePrompt = (media && !media.isAudio)
            ? `\n[FINANCE RECEIPT / BILL / GPAY SCREENSHOT ATTACHED]: The user sent an image or screenshot along with text: "${userText.trim()}".
1. Carefully inspect the image:
   - If it is a Google Pay / PhonePe / Paytm / Bank payment screenshot:
     Extract Amount, Recipient / Merchant name, Date & Time, Payment Mode (UPI).
   - If it is a printed bill, receipt, or invoice (hotel, supermarket, fuel, pharmacy):
     Extract Total Amount, Merchant / Shop name, Date, and purchased items / category.
2. If all required details (Amount, Category, Description) are clearly visible:
   Call the "addTransaction" tool immediately to record it into Budget Tracker!
3. If ANY critical detail (like total amount) is unreadable or missing:
   Politely ask Suresh to clarify before adding.`
            : '';
          contextualText = `${imagePrompt}\n[USER MESSAGE]: ${userText.trim()}`;
        } else if (mode === 'meenakshi_traders') {
          const cleanPhone = (chatId || '').replace(/\D/g, '');
          const senderName = (options.senderName || options.pushName || '').toLowerCase().trim();
          const userLower = (userText || '').toLowerCase().trim();
          const userDigits = (userText || '').replace(/\D/g, '');
          const { loadCustomers } = require('./meenakshiTradersPersona');
          const allCustomers = loadCustomers();

          // Multi-source candidate digits (covers WhatsApp @lid, remoteJidAlt, participant, and chatId)
          const candidateDigits = [
            cleanPhone,
            (options.remoteJid || '').replace(/\D/g, ''),
            (options.remoteJidAlt || '').replace(/\D/g, ''),
            (options.altDigits || '').replace(/\D/g, ''),
            (options.participant || '').replace(/\D/g, '')
          ].filter(d => d && d.length >= 7);

          const matched = allCustomers.find(c => {
            const custDigits = (c.phone || '').replace(/\D/g, '');
            const phoneMatches = custDigits && candidateDigits.some(cd => cd.endsWith(custDigits) || custDigits.endsWith(cd) || cd.includes(custDigits));
            const textDigitsMatches = userDigits && custDigits && (userDigits.includes(custDigits) || custDigits.includes(userDigits));
            const textNameMatches = userLower && (userLower.includes(c.name.toLowerCase()) || (c.address && userLower.includes(c.address.toLowerCase().split(',')[0])));
            const aliasMatches = c.aliases && c.aliases.some(a => {
              const cleanA = a.replace(/\D/g, '');
              const aliasDigitMatch = cleanA && cleanA.length >= 7 && (
                candidateDigits.some(cd => cd.endsWith(cleanA) || cleanA.endsWith(cd) || cd.includes(cleanA)) ||
                (userDigits && (userDigits.includes(cleanA) || cleanA.includes(userDigits)))
              );
              const aliasNameMatch = (
                (userLower && userLower.includes(a.toLowerCase())) ||
                (senderName && (senderName === a.toLowerCase() || senderName.includes(a.toLowerCase()) || a.toLowerCase().includes(senderName)))
              );
              return aliasDigitMatch || aliasNameMatch;
            });
            const nameMatches = senderName && (senderName.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(senderName));
            return phoneMatches || textDigitsMatches || textNameMatches || aliasMatches || nameMatches;
          });
          if (matched) {
            contextualText = `[🚨 SRI MEENAKSHI TRADERS - SENDER IDENTIFIED]:
Caller phone is ${cleanPhone}.
This customer is verified in database as: "${matched.name}" (${matched.address}).
Billing mode: "${matched.defaultBilling} Bill".
MANDATORY ACTION: Greet them warmly in business Tamil by their shop name and street:
"வணக்கம் ${matched.name} (${matched.address.split(',')[0]}) அண்ணே! 🙏 சொல்லுங்க, இன்னைக்கு என்னென்ன ஆயில் பெட்டி போடணும்? Gold Winner, Fortune, பாம் ஆயில் எல்லாம் ரெடியா இருக்கு!"
Do not ask for GST. When they order, calculate line items, total, and call createSmtOilOrder to give the Fast-Lane Token!
User message: "${userText.trim()}"`;
          } else {
            contextualText = `[SRI MEENAKSHI TRADERS - EDIBLE OILS WHOLESALE MANDI]:
Caller phone is ${cleanPhone} (Unregistered Customer).
Greet in Tamil: "வணக்கம்! ஸ்ரீ மீனாட்சி டிரேடர்ஸ் ஆயில் மண்டி மதுரை. சொல்லுங்க அண்ணே, என்னென்ன ஆயில் பெட்டி வேணும்?"
If they place an order, collect shop name and area in Madurai, and call registerSmtCustomer!
User message: "${userText.trim()}"`;
          }
        } else {
          // Dev mode (SoloDeveloper)
          const isAskingIdentity = /(who (are|r) (you|u)|who are u|who r u|dont know who|don't know who|who is this|who this|yaaru|யாரு நீங்க|நீங்க யாரு)/i.test(trimmedLower);
          const isDeclining = /(எனக்கு எதும் தெரிஞ்சுக்க வேண்டாம்|வேண்டாம்|not interested|dont want|don't want|nothing needed|stop|leave me|விருப்பமில்லை)/i.test(trimmedLower);

          // Immediate respectful opt-out response (never pitch or interrogate when client says no)
          if (isDeclining && !isOwner) {
            const declineReply = (hasTamil || asksForTamil)
              ? "கண்டிப்பாக, உங்கள் முடிவை மதிக்கிறேன்! உங்கள் நேரத்திற்கு மிக்க நன்றி. எதிர்காலத்தில் உங்கள் பிசினஸுக்கு Modern Website அல்லது WhatsApp Automation தேவைப்பட்டால், SoloDeveloper.pro-ல் Suresh-ஐ (+91 93615 99097) எப்போது வேண்டுமானாலும் தொடர்பு கொள்ளலாம். உங்கள் நாள் சிறக்கட்டும், வணக்கம்! 🙏"
              : (asksForTanglish || isTanglishText)
              ? "Kandippa, unga decision-ah respect panren! Unga valuable time-ku romba thanks. Future-la unga business-ku Modern Website or WhatsApp Automation thevaipatta, Suresh (+91 93615 99097 / SoloDeveloper.pro)-ah eppo vena contact pannalam. Have a great day! 🙏"
              : "Understood! Thank you so much for your time. If you ever need a modern website or WhatsApp automation in the future, feel free to reach out to Suresh (+91 93615 99097) at SoloDeveloper.pro. Have a wonderful day ahead! 🙏";

            history.push({ role: 'user', parts: [{ text: userText }] });
            history.push({ role: 'model', parts: [{ text: declineReply }] });
            this.saveHistory(chatId);
            return declineReply;
          }

          // If talking to Suresh (Boss Mode)
          if (isOwner) {
            contextualText = `[Direct message from SURESH KUMAR (+91 93615 99097 - Owner & Creator of SoloDeveloper.pro). Do not treat him as a prospect or ask discovery questions. Greet respectfully as Suresh/Boss and assist directly with his request]: ${contextualText}`;
          } else if (isAskingIdentity) {
            contextualText = `[IDENTITY RE-INTRODUCTION DIRECTIVE: The user does not know who we are or asked who we are. Apologize politely for any confusion. Warmly re-introduce yourself as the AI WhatsApp Assistant for Suresh Kumar (SoloDeveloper.pro), Full-Stack Developer & AI Automation Architect based in Madurai (+91 93615 99097). Explain clearly that we build high-converting modern websites (Next.js) and 24/7 WhatsApp AI automation systems for businesses. Ask for their good name or what business they run]: ${contextualText}`;
          } else {
            // Check known profile for returning client
            const profile = this.getContactProfile(cleanId);
            if (profile && profile.name && history.length === 0) {
              const isBareGreeting = /^(hi|hello|hey|vanakkam|வணக்கம்|hola)[\s!.]*$/i.test(trimmedLower);
              if (isBareGreeting) {
                contextualText = `[Context Note: Contact previously connected as ${profile.name}. Since they sent a fresh greeting, greet them warmly, re-introduce SoloDeveloper.pro and Suresh Kumar politely without being overly presumptuous or assuming they remember past chats, and ask how you can help them today]: ${contextualText}`;
              } else {
                contextualText = `[Context Note: Returning contact ${profile.name} (${profile.company || ''})]: ${contextualText}`;
              }
            }
          }

          // INTERRUPTION & INQUIRY HANDLING DIRECTIVE
          const isAskingQuestion = /\?|price|cost|rate|pricing|how much|epdi|evalo|evvalavu|enge|where|portfolio|sample|demo|website irukka/i.test(trimmedLower);
          if (isAskingQuestion && !isOwner) {
            contextualText = `[INTERRUPTION & INQUIRY DIRECTIVE: The user asked a direct question. Answer their question directly, transparently, and politely in 2-3 lines first (e.g. mention pricing from ₹8,999 to ₹24,999+). Then seamlessly continue the discovery flow by asking the next uncollected item from your state checklist. Do NOT ignore their question and do NOT restart the greeting]: ${contextualText}`;
          }

          // SCRIPT & LANGUAGE DIRECTIVE
          if (hasTamil || asksForTamil || /\b(tanglish|tamil|தமிழ்)\b/i.test(userText)) {
            contextualText = `[CRITICAL SCRIPT & LANGUAGE DIRECTIVE: The user communicated in or requested Tamil. You MUST reply ONLY in pure Tamil script (தமிழ் எழுத்துக்களில்). Absolutely NEVER write Latin Tanglish (no English spelling of Tamil words like 'Saaptiya', 'vanakkam', etc.). All commerce and tech words (Business, Order, Website, WhatsApp, Staff, Stock, Price, Products, Demo, Appointment, Delay, Revenue) MUST ALWAYS be kept in English script. Ask EXACTLY ONE question]: ${contextualText}`;
          } else {
            contextualText = `[CRITICAL SCRIPT & LANGUAGE DIRECTIVE: Reply in clear, modern, professional English with LLM intelligence and consultative warmth. Ask EXACTLY ONE question]: ${contextualText}`;
          }
        }

        userParts.push({ text: contextualText });
      } else if (media) {
        if (mode === 'builder') {
          const builderContext = builderCustomerMemory.buildContextInjection(chatId, '[IMAGE_SCREENSHOT_SHARED]');
          const imageDirective = `${builderContext}
[IMAGE / ELEVATION SCREENSHOT SHARED BY CUSTOMER]:
The customer sent an image or video screenshot (house 3D elevation, floor plan, or architecture photo) without text caption.
1. Carefully analyze this image as a senior civil engineering consultant from Danam Holdings.
2. Identify the architectural style (G+1 Duplex / G+2, modern contemporary / luxury villa, balcony glass railing, teak pivot door, exterior texture finish, or floor plan room layout).
3. Warmly acknowledge and praise the design in natural spoken TAMIL script (தமிழ் எழுத்துக்களில்).
4. Assure the customer that Danam Holdings in Madurai specializes in executing this exact turnkey elevation & construction with precision! Mention approved package rates (Standard ₹1,850–₹1,950/Sq.Ft or Premium Luxury ₹2,250–₹2,350/Sq.Ft).
5. Seamlessly ask if they have a plot in Madurai or what their plot size is to calculate an instant preliminary estimate!`;
          userParts.push({ text: imageDirective });
        } else if (mode === 'finance') {
          const financeImageDirective = `[FINANCE RECEIPT / BILL / GPAY SCREENSHOT SHARED WITHOUT CAPTION]:
The user sent an image or screenshot (Google Pay receipt, PhonePe, Paytm, Bank alert, or physical restaurant/store bill) without a text caption.
1. Carefully inspect the image:
   - If it is a Google Pay / PhonePe / Paytm / Bank payment screenshot:
     Extract Amount, Recipient / Merchant name, Date & Time, Payment Mode (UPI).
   - If it is a printed bill, receipt, or invoice:
     Extract Total Amount, Merchant / Shop name, Date, and items summary.
2. If all required details (Amount, Category, Description) are clearly visible:
   Call the "addTransaction" tool immediately to record it into Budget Tracker!
   After recording, provide a neat confirmation with WhatsApp formatting (*bold*, emojis).
3. If ANY critical detail (like total amount) is unreadable or missing:
   Politely ask Suresh in Tamil/Tanglish for the missing detail (e.g. "அண்ணா, பில்லில் மொத்த அமவுண்ட் தெளிவாக தெரியவில்லை, எவ்வளவு ஆச்சுன்னு சொல்றீங்களா?").`;
          userParts.push({ text: financeImageDirective });
        } else {
          userParts.push({ text: "Please analyze this image and explain what you see in detail." });
        }
      }

      // Append new user turn to history
      history.push({
        role: 'user',
        parts: userParts
      });

      // Maintain history size by clean turn pairs (do not orphan tool calls)
      while (history.length > this.maxHistory * 2) {
        // Find safe cut point (must start with role: 'user' and not be a tool response)
        let cutIdx = 2;
        while (cutIdx < history.length && (history[cutIdx].role !== 'user' || history[cutIdx].parts?.some(p => p.functionResponse))) {
          cutIdx++;
        }
        if (cutIdx < history.length) {
          history.splice(0, cutIdx);
        } else {
          break;
        }
      }

      // Ultra-fast active models (gemini-2.5-flash responds in ~1.0s with thinkingBudget: 0)
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite'
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let response = null;
      let lastErr = null;
      let chosenModel = 'gemini-2.5-flash';
      const activeTools = this.getActiveTools(isOwner, mode, options);

      for (const m of modelsToTry) {
        // Skip quota-exhausted models immediately (saves 1.5s failed network round-trip)
        if (isModelQuotaExhausted(m)) {
          continue;
        }

        try {
          const contentsToSend = this.sanitizeHistory(history);
          const isAdminAudio = Boolean(media && media.isAudio && options.isWholesaleAdminGroup);
          const requestConfig = {
            systemInstruction: systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: isAdminAudio ? 512 : 0 },
            tools: activeTools
          };

          const genPromise = this.ai.models.generateContent({
            model: m,
            contents: contentsToSend,
            config: requestConfig
          });

          // 12s safety timeout (20s for admin voice note transcription + tool call)
          const timeoutMs = isAdminAudio ? 20000 : 12000;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model ${m}`)), timeoutMs)
          );

          response = await Promise.race([genPromise, timeoutPromise]);
          if (response) {
            chosenModel = m;
            break;
          }
        } catch (err) {
          lastErr = err;
          const errMsg = err.message || String(err);
          console.warn(`[Gemini Try Model ${m}] Failed/Timed Out: ${errMsg.slice(0, 100)}`);

          if (
            errMsg.includes('429') ||
            errMsg.includes('quota') ||
            errMsg.includes('RESOURCE_EXHAUSTED')
          ) {
            exhaustedModelsCache.set(m, Date.now());
            continue;
          }

          if (
            errMsg.includes('404') ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('Timeout')
          ) {
            continue;
          }

          // If tool calling / thought signature error, try conversational fallback without tools on the same model
          if (errMsg.includes('thought_signature') || errMsg.includes('functionCall') || errMsg.includes('INVALID_ARGUMENT')) {
            console.warn(`[Gemini Tool Error] Attempting conversational fallback without tools for ${m}...`);
            try {
              const fallbackContents = this.sanitizeHistory(history, true);
              const fallbackConfig = {
                systemInstruction: systemInstruction,
                temperature: 0.2,
                maxOutputTokens: 800
              };
              if (!m.includes('lite')) {
                fallbackConfig.thinkingConfig = { thinkingBudget: 0 };
              }

              const fallbackRes = await this.ai.models.generateContent({
                model: m,
                contents: fallbackContents,
                config: fallbackConfig
              });
              if (fallbackRes && fallbackRes.text) {
                response = fallbackRes;
                chosenModel = m;
                break;
              }
            } catch (fallbackErr) {
              console.error(`[Fallback Attempt Failed for ${m}]:`, fallbackErr.message);
            }
          }
          // Do not crash loop on one model failure; continue to next available model
          continue;
        }
      }

      if (!response) {
        this.cleanFailedTurn(chatId);
        throw lastErr || new Error("Failed to get response from all Gemini models");
      }

      // Process tool calls in a loop (supports multiple tools in one turn + recursive follow-ups)
      let toolRounds = 0;
      const MAX_TOOL_ROUNDS = 5;

      while (response.functionCalls && response.functionCalls.length > 0 && toolRounds < MAX_TOOL_ROUNDS) {
        toolRounds++;
        const currentCalls = response.functionCalls;
        console.log(`⚡ [Gemini Tool Round ${toolRounds}]: Processing ${currentCalls.length} tool call(s)`);

        // Execute all tool calls in this turn
        const toolResults = [];
        for (const fnCall of currentCalls) {
          console.log(`  ↪ Executing tool: ${fnCall.name}`);
          const result = await this.executeToolCall(fnCall, chatId, cleanId, isOwner, mode, media, options.targetUid, options);
          toolResults.push({ fnCall, result });
        }

        // Guarantee thoughtSignature on model parts
        const rawParts = response.candidates?.[0]?.content?.parts || [];
        const modelParts = rawParts.map(p => {
          if (p.functionCall) {
            return {
              ...p,
              thoughtSignature: p.thoughtSignature || 'skip_thought_signature_validator'
            };
          }
          return p;
        });

        history.push({
          role: 'model',
          parts: modelParts
        });

        // Push function responses for all executed tools
        const functionResponseParts = toolResults.map(({ fnCall, result }) => ({
          functionResponse: {
            name: fnCall.name,
            response: result
          }
        }));

        history.push({
          role: 'user',
          parts: functionResponseParts
        });

        // Generate follow-up conversational text response or next tool call
        try {
          const followupConfig = {
            systemInstruction: systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 1000,
            tools: activeTools
          };
          if (!chosenModel.includes('lite')) {
            followupConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          const followupPromise = this.ai.models.generateContent({
            model: chosenModel,
            contents: this.sanitizeHistory(history),
            config: followupConfig
          });
          const followTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Follow-up call timed out after 12000ms')), 12000)
          );
          response = await Promise.race([followupPromise, followTimeout]);
        } catch (followupErr) {
          console.warn(`[Tool Follow-up Error on ${chosenModel}]:`, followupErr.message);
          // If follow-up fails, break tool loop to avoid crashing
          break;
        }
      }

      let replyText = (response && response.text) ? response.text.trim() : "";
      if (!replyText && response?.candidates?.[0]?.content?.parts) {
        // Extract text from parts when thoughtSignature is present
        const parts = response.candidates[0].content.parts;
        replyText = parts.filter(p => p.text).map(p => p.text).join('').trim();
      }
      if (!replyText) {
        if (mode === 'wholesale') {
          replyText = "வணக்கம் அண்ணா! அண்ணாமலையார் ஆயில் ஸ்டோர் மாட்டுத்தாவணி. Gold Winner 1L, 1/2L, 200ml, 100ml, 5L Can அல்லது 15Ltr/15Kg டின் ரேட் மற்றும் ஸ்டாக் விபரம் என்ன தேவை?";
        } else if (mode === 'restaurant') {
          const isOngoing = history && history.length > 2;
          replyText = isOngoing
            ? "சரிங்க சார்! உங்கள் தகவலை குறித்துக்கொண்டேன். வேறு ஏதாவது சேர்க்க வேண்டுமா, அல்லது இந்த ஆர்டரை உறுதி செய்யலாமா? 🍗✨"
            : "வணக்கம்! தாஜ் ஹோட்டல் மதுரை 🍗. இன்றைய ஸ்பெஷல் சிக்கன் பிரியாணி, மட்டன் பிரியாணி அல்லது வஞ்சிரம் மீன் பிரியாணி எத்தனை பார்சல் ரெடி பண்ண வேண்டும்?";
        } else if (mode === 'builder') {
          replyText = "வணக்கம் சார்! Danam Holdings Civil Engineering & Turnkey EPC 🏡. உங்கள் புதிய வீடு கட்டும் திட்டம், பிளாட் அளவு (Sq.Ft) அல்லது இடம் கூறினால் உடனடி மதிப்பீடு தருகிறோம்!";
        } else if (hasTamil) {
          replyText = "நன்றி! உங்கள் விபரங்களை குறித்துக் கொண்டேன். உங்களுக்கு மிகச் சரியான தீர்வை பரிந்துரைக்க, மேலும் ஒரு சிறிய விபரம்...";
        } else if (asksForTanglish || isTanglishText) {
          replyText = "Great! Unga details note pannikitten. Ungalukku perfect solution architecture ready panna, oru small question...";
        } else {
          replyText = "Great! I've noted down these details. Just one more question so I can prepare the right tailored recommendation...";
        }
      }

      // Cleanse foreign Sinhala / Malayalam script and corrupted text from Tamil responses
      replyText = this.sanitizeTamilText(replyText);

      // Append assistant's turn to history
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const finalParts = (response.candidates[0].content.parts || []).map(p => {
          if (p.functionCall) {
            return {
              ...p,
              thoughtSignature: p.thoughtSignature || 'skip_thought_signature_validator'
            };
          }
          if (p.text) {
            return {
              ...p,
              text: this.sanitizeTamilText(p.text)
            };
          }
          return p;
        });
        history.push({
          role: 'model',
          parts: finalParts
        });
      } else {
        history.push({
          role: 'model',
          parts: [{ text: replyText }]
        });
      }

      // Save updated history to disk
      this.saveHistory(chatId);

      return replyText;
    } catch (error) {
      console.error(`[Gemini Error]`, error);
      this.cleanFailedTurn(chatId);
      this.saveHistory(chatId);

      // Graceful error messages - NEVER show raw JSON or thought signature errors to WhatsApp!
      if (isOwner) {
        return "Vanakkam Suresh! I had a temporary issue processing that request, but I have cleanly recovered. How can I assist you with your system or leads right now?";
      }

      if (mode === 'wholesale') {
        return "வணக்கம் அண்ணா! சர்வரில் ஒரு சிறிய தாமதம் ஏற்பட்டுள்ளது. உங்கள் ஆயில் தேவைகள் அல்லது ஆர்டர் விபரங்களை மீண்டும் ஒருமுறை பகிர முடியுமா அண்ணா? 🙏";
      }

      if (mode === 'restaurant') {
        return "வணக்கம்! சர்வரில் ஒரு சிறிய தாமதம். உங்கள் தாஜ் ஹோட்டல் பிரியாணி ஆர்டரை மீண்டும் ஒருமுறை அனுப்பவும்! 🍗🙏";
      }

      if (mode === 'builder') {
        const prof = builderCustomerMemory.getProfile(chatId);
        if (prof?.preferred_language === 'English' && prof?.explicit_english) {
          return "Hello and welcome to Danam Holdings Civil Engineering & Turnkey EPC! 🏡 How can we assist you with your dream home construction project today?";
        }
        return "வணக்கம் சார்! Danam Holdings House Construction & Civil EPC 🏡. உங்கள் வீடு கட்டும் இடம், பிளாட் அளவு அல்லது தேவையான சதுர அடி (Sq.Ft) விபரங்களை பகிருங்கள் சார், உடனே மதிப்பீடு மற்றும் விபரங்களை தருகிறேன்!";
      }

      const hasTamilInInput = /[\u0B80-\u0BFF]/.test(userText || '');
      const wantsTamilInInput = /\b(tamil|தமிழ்)\b/i.test(userText || '');
      const wantsTanglishInInput = /\b(tanglish)\b/i.test(userText || '');
      if (hasTamilInInput || wantsTamilInInput) {
        return "வணக்கம்! உங்கள் செய்தி பெறப்பட்டது. சர்வரில் ஒரு சிறிய தாமதம் ஏற்பட்டுள்ளது. உங்கள் பிசினஸ் விபரங்களை மீண்டும் பகிர முடியுமா?";
      }
      if (wantsTanglishInInput) {
        return "Vanakkam! Unga message vandhuchu, server-la chinna delay. Unga business requirements-ah innoru vaati share panna mudiyuma?";
      }

      return "Vanakkam! I've noted down what you shared. Could you please tell me a little more about what specific business or automation requirements you have in mind?";
    }
  }
}

module.exports = GeminiService;
