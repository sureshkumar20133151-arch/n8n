const { GoogleGenAI } = require('@google/genai');
const https = require('https');
const { buildSystemPrompt } = require('./knowledgeBase');

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
        pipelineStage: { type: 'STRING', description: 'CRM Pipeline Stage: 1. NEW LEAD, 2. QUALIFIED, 3. DISCOVERY COMPLETED, 4. STRATEGY CALL BOOKED, 5. PROPOSAL SENT, 6. NEGOTIATION, 7. WON (CLOSED), 8. LOST' },
        conversationIntent: { type: 'STRING', description: 'Conversation Intent: Ready To Buy, Urgent Problem, Comparing Options, Researching, Just Curious' },
        estimatedDealValue: { type: 'STRING', description: 'Estimated Deal Value (e.g. ₹9,999, ₹19,999, ₹29,999, ₹49,999)' },
        winProbability: { type: 'STRING', description: 'Win Probability percentage (e.g. 80%, 50%, 25%)' },
        revenueForecast: { type: 'STRING', description: 'Weighted Revenue Forecast (Estimated Deal Value × Win Probability)' }
      },
      required: ['company', 'problemCategory']
    }
  }]
}];

function dispatchLeadToN8n(leadData) {
  try {
    const postData = JSON.stringify(leadData);
    const options = {
      hostname: 'suresh-n8n-fhr6.onrender.com',
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

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.systemInstruction = buildSystemPrompt();
    this.maxHistory = parseInt(process.env.MAX_HISTORY_TURNS || '10', 10);
    
    // Store conversation history per WhatsApp chat ID
    // Format: { [chatId]: [ { role: 'user'|'model', parts: [...] } ] }
    this.historyStore = new Map();

    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.ai = null;
    }
  }

  getOrCreateHistory(chatId) {
    if (!this.historyStore.has(chatId)) {
      this.historyStore.set(chatId, []);
    }
    return this.historyStore.get(chatId);
  }

  resetHistory(chatId) {
    this.historyStore.delete(chatId);
  }

  /**
   * Process a text or multimodal message with Gemini
   * @param {string} chatId - WhatsApp contact or group ID
   * @param {string} userText - User's message or prompt
   * @param {object|null} media - { mimetype, data (base64) } if an image or document was sent
   * @returns {Promise<string>}
   */
  async generateResponse(chatId, userText, media = null) {
    if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY') {
      return "⚠️ *Gemini API Key missing!* Please add your valid API key in the `.env` file and restart the bot.";
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }

    try {
      const history = this.getOrCreateHistory(chatId);

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
        userParts.push({ text: userText.trim() });
      } else if (media) {
        userParts.push({ text: "Please analyze this image and explain what you see in detail." });
      }

      // Append user turn to history
      history.push({
        role: 'user',
        parts: userParts
      });

      // Keep only recent turns to fit context and memory limits
      while (history.length > this.maxHistory * 2) {
        history.shift();
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

      for (const m of modelsToTry) {
        try {
          response = await this.ai.models.generateContent({
            model: m,
            contents: history,
            config: {
              systemInstruction: this.systemInstruction,
              temperature: 0.3,
              tools: LEAD_TOOLS
            }
          });
          if (response) {
            chosenModel = m;
            break;
          }
        } catch (err) {
          lastErr = err;
          const errMsg = err.message || String(err);
          if (
            errMsg.includes('429') ||
            errMsg.includes('quota') ||
            errMsg.includes('404') ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded')
          ) {
            console.warn(`[Gemini Quota/Availability] Model ${m} failed (${errMsg.slice(0, 80)}...). Trying fallback...`);
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        history.pop();
        throw lastErr || new Error("Failed to get response from all Gemini models");
      }

      // Check if model triggered saveLeadDetails tool
      if (response.functionCalls && response.functionCalls.length > 0) {
        const fnCall = response.functionCalls[0];
        if (fnCall.name === 'saveLeadDetails') {
          console.log(`🎯 [AI Sales Intelligence Generated via Tool]:`, fnCall.args);
          
          const leadPayload = {
            ...fnCall.args,
            phone: chatId.replace(/[^0-9]/g, '')
          };
          dispatchLeadToN8n(leadPayload);

          // Feed function response back to Gemini to get conversational reply
          history.push({
            role: 'model',
            parts: [{ functionCall: fnCall }]
          });

          history.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: fnCall.name,
                response: { status: 'logged_successfully', message: 'Sales intelligence recorded in Suresh\'s CRM' }
              }
            }]
          });

          // Generate final conversational text response
          const followup = await this.ai.models.generateContent({
            model: chosenModel,
            contents: history,
            config: {
              systemInstruction: this.systemInstruction,
              temperature: 0.3,
              tools: LEAD_TOOLS
            }
          });

          response = followup;
        }
      }

      const replyText = response.text || "Thank you! I have noted your requirements. How else can I assist your business today?";

      // Append assistant's turn to history
      history.push({
        role: 'model',
        parts: [{ text: replyText }]
      });

      return replyText;
    } catch (error) {
      console.error(`[Gemini Error]`, error);
      return `❌ *Error generating AI response*: ${error.message || error}`;
    }
  }
}

module.exports = GeminiService;
