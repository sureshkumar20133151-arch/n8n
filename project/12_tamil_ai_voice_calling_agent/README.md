# 📞 Danam Holdings – Autonomous Tamil AI Voice Calling Agent
> **Production Voice Agent System for Inbound & Outbound Calling**  
> Complete technical documentation and step-by-step implementation guide: [VOICE_CALLING_AGENT_PROJECT_BLUEPRINT.md](file:///c:/Users/Suresh/Documents/Antigravity/5. N8n/VOICE_CALLING_AGENT_PROJECT_BLUEPRINT.md)

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your API keys in `.env`:**
   ```bash
   cp .env.example .env
   # Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEEPGRAM_API_KEY, GEMINI_API_KEY, SARVAM_API_KEY
   ```

3. **Start the local voice server:**
   ```bash
   npm start
   ```

4. **Connect to Twilio via Ngrok:**
   ```bash
   ngrok http 8080
   # Set Twilio Voice Webhook URL to: https://your-ngrok-url/incoming-call (POST)
   ```

5. **Dial the number from your phone!**
