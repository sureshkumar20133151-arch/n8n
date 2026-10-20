const { GoogleGenAI } = require('@google/genai');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { buildSystemPrompt } = require('./knowledgeBase');
const { calculateSalesManagerMetrics } = require('./offerEngine');

const LEAD_TOOLS = [{
  functionDeclarations: [{
    name: 'saveLeadDetails',
    description: 'Call this tool to save complete AI sales intelligence, business diagnosis, Grand Slam Offer, and closing strategy into Suresh\'s CRM/Google Sheet and alert Suresh whenever the customer shares business details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Name of the contact person' },
        company: { type: 'STRING', description: 'Name of their business or company' },
        industry: { type: 'STRING', description: 'Industry or business niche' },
        businessModel: { type: 'STRING', enum: ['B2B', 'B2C', 'Both / Hybrid'], description: 'Business model: B2B (Wholesale, distributors, manufacturers, commercial) or B2C (Retail, clinics, homeowners, direct consumers) or Both / Hybrid' },
        location: { type: 'STRING', description: 'City or business location' },
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

function dispatchProposalToN8n(proposalData) {
  try {
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

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.maxHistory = parseInt(process.env.MAX_HISTORY_TURNS || '12', 10);
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

  getSystemInstruction() {
    const base = buildSystemPrompt();
    const liveRules = adminRules.formatPromptExtension();
    return liveRules ? `${base}\n\n${liveRules}` : base;
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
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(this.profiles, null, 2), 'utf-8');
      console.log(`💾 [Profile Saved] Updated persistent memory for ${cleanId}`);
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
    // If already in memory, move to most recently used position
    if (this.historyStore.has(chatId)) {
      const history = this.historyStore.get(chatId);
      this.historyStore.delete(chatId);
      this.historyStore.set(chatId, history);
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

    const filePath = this.getHistoryFilePath(chatId);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          console.log(`📂 [History Restored] Loaded ${data.length} turns for ${chatId}`);
          this.historyStore.set(chatId, data);
          return data;
        }
      } catch (e) {
        console.warn(`[History Load Error] for ${chatId}:`, e.message);
      }
    }
    this.historyStore.set(chatId, []);
    return this.historyStore.get(chatId);
  }

  saveHistory(chatId) {
    try {
      const history = this.historyStore.get(chatId);
      if (history) {
        const filePath = this.getHistoryFilePath(chatId);
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
        fs.writeFileSync(filePath, JSON.stringify(cleanedHistory, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn(`[History Save Error] for ${chatId}:`, e.message);
    }
  }

  resetHistory(chatId) {
    this.historyStore.delete(chatId);
    try {
      const filePath = this.getHistoryFilePath(chatId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }

  cleanFailedTurn(chatId) {
    const history = this.historyStore.get(chatId);
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
  async executeToolCall(fnCall, chatId, cleanId) {
    const fnName = fnCall.name;
    const args = fnCall.args || {};

    if (fnName === 'saveLeadDetails') {
      console.log(`🎯 [AI Sales Intelligence Generated]:`, args);
      this.saveContactProfile(cleanId, {
        name: args.name,
        company: args.company,
        industry: args.industry,
        businessModel: args.businessModel,
        painPoint: args.painPoint,
        dreamOutcome: args.dreamOutcome
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

    // Update owner status in profile store
    if (isOwner) {
      this.saveContactProfile(cleanId, { isOwner: true, name: 'Suresh Kumar', role: 'Owner/Founder' });
    }

    try {
      const history = this.getOrCreateHistory(chatId);
      const systemInstruction = this.getSystemInstruction();

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
        const audioInstruction = (userText && userText.trim().length > 0)
          ? `The user sent this voice note with additional text: "${userText.trim()}". Listen carefully to the voice note, understand what they are asking in whichever language they spoke (Tamil, Tanglish, English, Hindi, or any other language), and reply naturally, politely, and concisely in that same language following your knowledge base rules.`
          : "Listen carefully to this voice note from the client. Understand what they are asking in whichever language they spoke (Tamil, Tanglish, English, Hindi, or any other language), and reply helpfully, politely, and concisely in that same language following your knowledge base rules.";
        userParts.push({ text: audioInstruction });
      } else if (userText && userText.trim().length > 0) {
        let contextualText = userText.trim();

        // If talking to Suresh (Boss Mode)
        if (isOwner) {
          contextualText = `[Direct message from SURESH KUMAR (+91 93615 99097 - Owner & Creator of SoloDeveloper.pro). Do not treat him as a prospect or ask discovery questions. Greet respectfully as Suresh/Boss and assist directly with his request]: ${contextualText}`;
        } else {
          // Check known profile for returning client
          const profile = this.getContactProfile(cleanId);
          if (profile && profile.name && history.length === 0) {
            contextualText = `[Known Returning Client Memory: Name: ${profile.name}, Business: ${profile.company || 'Unknown'}, Industry: ${profile.industry || 'Unknown'}. Recognize them warmly and do not ask for their name/business again]: ${contextualText}`;
          }
        }

        userParts.push({ text: contextualText });
      } else if (media) {
        userParts.push({ text: "Please analyze this image and explain what you see in detail." });
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

      // Fallback model list if the primary model hits 429 rate limit
      const modelsToTry = [
        this.modelName,
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-2.5-flash'
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let response = null;
      let lastErr = null;
      let chosenModel = this.modelName;
      const activeTools = isOwner ? OWNER_TOOLS : LEAD_TOOLS;

      for (const m of modelsToTry) {
        try {
          const contentsToSend = this.sanitizeHistory(history);
          response = await this.ai.models.generateContent({
            model: m,
            contents: contentsToSend,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
              // Expose OWNER_TOOLS for Suresh, LEAD_TOOLS for customers
              tools: activeTools
            }
          });
          if (response) {
            chosenModel = m;
            break;
          }
        } catch (err) {
          lastErr = err;
          const errMsg = err.message || String(err);
          console.warn(`[Gemini Try Model ${m}] Failed: ${errMsg.slice(0, 100)}`);

          if (
            errMsg.includes('429') ||
            errMsg.includes('quota') ||
            errMsg.includes('404') ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded')
          ) {
            continue;
          }

          // If tool calling / thought signature error, try emergency fallback without tools
          if (errMsg.includes('thought_signature') || errMsg.includes('functionCall') || errMsg.includes('INVALID_ARGUMENT')) {
            console.warn(`[Gemini Tool Error] Attempting conversational fallback without tools for ${m}...`);
            try {
              const fallbackContents = this.sanitizeHistory(history, true);
              const fallbackRes = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fallbackContents,
                config: {
                  systemInstruction: systemInstruction,
                  temperature: 0.3
                }
              });
              if (fallbackRes && fallbackRes.text) {
                response = fallbackRes;
                chosenModel = 'gemini-2.5-flash';
                break;
              }
            } catch (fallbackErr) {
              console.error(`[Fallback Attempt Failed]:`, fallbackErr.message);
            }
          }
          throw err;
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
          const result = await this.executeToolCall(fnCall, chatId, cleanId);
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
          const followup = await this.ai.models.generateContent({
            model: chosenModel,
            contents: this.sanitizeHistory(history),
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
              tools: activeTools
            }
          });
          response = followup;
        } catch (followupErr) {
          console.warn(`[Tool Follow-up Error on ${chosenModel}]:`, followupErr.message);
          // If follow-up fails, break tool loop to avoid crashing
          break;
        }
      }

      const replyText = response.text || "Thank you! I have noted your requirements. How else can I assist your business today?";

      // Append assistant's turn to history
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const finalParts = (response.candidates[0].content.parts || []).map(p => {
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
      return "Vanakkam! I've noted down what you shared. Could you please tell me a little more about what specific business or automation requirements you have in mind?";
    }
  }
}

module.exports = GeminiService;
