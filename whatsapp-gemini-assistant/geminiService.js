const { GoogleGenAI } = require('@google/genai');
const { buildSystemPrompt } = require('./knowledgeBase');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.systemInstruction = process.env.SYSTEM_INSTRUCTION || buildSystemPrompt();
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

      if (userText && userText.trim().length > 0) {
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

      for (const m of modelsToTry) {
        try {
          response = await this.ai.models.generateContent({
            model: m,
            contents: history,
            config: {
              systemInstruction: this.systemInstruction,
              temperature: 0.7,
            }
          });
          if (response && response.text) break;
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

      if (!response || !response.text) {
        history.pop();
        throw lastErr || new Error("Failed to get response from all Gemini models");
      }

      const replyText = response.text || "I didn't receive a text response from Gemini.";

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
