const { GoogleGenAI } = require('@google/genai');
const https = require('https');
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

function dispatchProposalToN8n(proposalData) {
  try {
    const postData = JSON.stringify(proposalData);
    const options = {
      hostname: 'suresh-n8n-fhr6.onrender.com',
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
      hostname: 'suresh-n8n-fhr6.onrender.com',
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
          
          const calculatedMetrics = calculateSalesManagerMetrics(fnCall.args);
          const leadPayload = {
            ...fnCall.args,
            priorityRank: fnCall.args.priorityRank || calculatedMetrics.priorityRank,
            aiRecommendedAction: fnCall.args.aiRecommendedAction || calculatedMetrics.aiRecommendedAction,
            dealRisk: fnCall.args.dealRisk || calculatedMetrics.dealRisk,
            closingProbabilityReason: fnCall.args.closingProbabilityReason || calculatedMetrics.closingProbabilityReason,
            nextBestMessage: fnCall.args.nextBestMessage || calculatedMetrics.nextBestMessage,
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
        } else if (fnCall.name === 'bookStrategyDemo') {
          console.log(`📅 [Strategy Demo Booked via Tool]:`, fnCall.args);
          
          const bookingPayload = {
            ...fnCall.args,
            phone: chatId.replace(/[^0-9]/g, ''),
            meetingLink: 'https://meet.google.com/jdf-qrvw-tkm'
          };
          dispatchDemoBookingToN8n(bookingPayload);

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
                response: {
                  status: 'confirmed',
                  meetingLink: 'https://meet.google.com/jdf-qrvw-tkm',
                  message: 'Demo slot reserved successfully on Google Calendar. Confirmation sent.'
                }
              }
            }]
          });

          // Generate final conversational confirmation response
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
        } else if (fnCall.name === 'generateAndSendProposal') {
          console.log(`📑 [Proposal Generated via Tool]:`, fnCall.args);
          
          const proposalPayload = {
            ...fnCall.args,
            phone: chatId.replace(/[^0-9]/g, '')
          };
          dispatchProposalToN8n(proposalPayload);

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
                response: {
                  status: 'proposal_dispatched',
                  message: 'The custom Grand Slam proposal, 3-tier pricing options, and architecture blueprint were delivered via WhatsApp and Email. Stage updated to 7. PROPOSAL SENT.'
                }
              }
            }]
          });

          // Generate final conversational confirmation response
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
