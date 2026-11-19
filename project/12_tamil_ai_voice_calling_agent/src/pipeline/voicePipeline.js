const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const { getVoiceSystemPrompt } = require('../persona/voiceBuilderPersona');
const { logCallToN8n } = require('../integrations/n8nLogger');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
const deepgram = deepgramApiKey ? createClient(deepgramApiKey) : null;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

function handleTwilioMediaStream(ws) {
  let streamSid = null;
  let callerNumber = null;
  let callStartTime = new Date();
  let conversationHistory = [];

  if (!deepgram) {
    console.warn('⚠️ [VoicePipeline] DEEPGRAM_API_KEY not configured.');
    return;
  }

  // 1. Initialize Deepgram Live Streaming STT
  const dgConnection = deepgram.listen.live({
    model: 'nova-2',
    language: 'ta',           // Tamil speech recognition
    smart_format: true,
    encoding: 'mulaw',        // Native Twilio telephony audio encoding
    sample_rate: 8000,        // 8kHz standard telephony
    interim_results: false,
    endpointing: 350          // Silence detection (ms) to trigger AI turn
  });

  // Deepgram Connected
  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log('👂 [Deepgram] Live Tamil STT Connected & Listening...');
    // Send initial greeting after 600ms
    setTimeout(async () => {
      const greeting = 'வணக்கம் சார்! Danam Holdings Construction மதுரை. நான் இன்ஜினியர் திலீப் குமாரின் அசிஸ்டன்ட் பேசுறேன். உங்கள் இடம் மதுரையில் எங்கு அமைந்துள்ளது சார்?';
      conversationHistory.push({ role: 'model', text: greeting });
      await speakTextToTwilio(ws, streamSid, greeting);
    }, 600);
  });

  // Customer spoke -> Transcribed Text received
  dgConnection.on(LiveTranscriptionEvents.Transcript, async (data) => {
    const transcript = data.channel.alternatives[0]?.transcript?.trim();
    if (transcript && transcript.length > 1) {
      console.log(`🗣️ [Customer Said]: "${transcript}"`);
      conversationHistory.push({ role: 'user', text: transcript });

      // Generate response using Gemini 2.5 Flash
      const aiReply = await generateGeminiVoiceReply(conversationHistory);
      console.log(`🤖 [AI Voice Reply]: "${aiReply}"`);
      conversationHistory.push({ role: 'model', text: aiReply });

      // Synthesize and stream audio back to Twilio
      await speakTextToTwilio(ws, streamSid, aiReply);
    }
  });

  // Handle incoming Twilio WebSocket messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'start':
          streamSid = msg.start.streamSid;
          callerNumber = msg.start.customParameters?.From || 'Customer';
          console.log(`📞 [Stream Started] SID: ${streamSid} from ${callerNumber}`);
          break;

        case 'media':
          // Forward live audio chunk from caller to Deepgram
          if (dgConnection && dgConnection.getReadyState() === 1) {
            const audioBuffer = Buffer.from(msg.media.payload, 'base64');
            dgConnection.send(audioBuffer);
          }
          break;

        case 'stop':
          console.log('📴 [Call Ended]');
          if (dgConnection) dgConnection.finish();
          logCallToN8n({
            callerNumber,
            startTime: callStartTime,
            endTime: new Date(),
            history: conversationHistory
          });
          break;
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e.message);
    }
  });

  ws.on('close', () => {
    if (dgConnection) dgConnection.finish();
  });
}

// LLM Reasoning with Gemini Flash
async function generateGeminiVoiceReply(history) {
  try {
    const contents = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: getVoiceSystemPrompt(),
        temperature: 0.2,
        maxOutputTokens: 120 // Keeps spoken turns strictly under 2 sentences
      }
    });

    let reply = response.text ? response.text.trim() : 'சரிங்க சார், உங்கள் விபரங்களைக் குறித்துக் கொண்டேன்.';
    // Clean rogue Sinhala/Malayalam characters
    reply = reply.replace(/[\u0D80-\u0DFF\u0D00-\u0D7F]/g, '').replace(/ந[\s\S]*படி/g, 'விதிமுறைகளின்படி');
    return reply;
  } catch (err) {
    console.error('Gemini Voice Error:', err.message);
    return 'சரிங்க சார், உங்கள் விபரங்களை குறித்துக்கொண்டேன். எங்கள் தலைமைப் பொறியாளர் உங்களிடம் நேரில் பேசுவார் சார்.';
  }
}

// Text-to-Speech Streaming back to Twilio (Sarvam AI or Edge-TTS)
async function speakTextToTwilio(ws, streamSid, text) {
  if (!ws || ws.readyState !== 1 || !streamSid) return;

  try {
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    if (sarvamApiKey) {
      const resp = await axios.post('https://api.sarvam.ai/text-to-speech', {
        inputs: [text],
        target_language_code: 'ta-IN',
        speaker: 'meera', // Natural Indian Tamil voice
        model: 'bulbul:v1'
      }, {
        headers: { 'api-subscription-key': sarvamApiKey }
      });

      if (resp.data && resp.data.audios && resp.data.audios[0]) {
        // Send base64 audio packet back to Twilio stream
        const payload = resp.data.audios[0];
        ws.send(JSON.stringify({
          event: 'media',
          streamSid: streamSid,
          media: { payload: payload }
        }));
      }
    }
  } catch (e) {
    console.warn('TTS streaming note:', e.message);
  }
}

module.exports = { handleTwilioMediaStream };
