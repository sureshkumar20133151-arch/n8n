const axios = require('axios');

async function logCallToN8n(callData) {
  const webhookUrl = process.env.N8N_CALL_LOG_WEBHOOK;
  if (!webhookUrl) return;

  try {
    const durationSeconds = Math.round((callData.endTime - callData.startTime) / 1000);
    const transcriptText = (callData.history || [])
      .map(h => `${h.role === 'user' ? 'Customer' : 'AI Engineer'}: ${h.text}`)
      .join('\n');

    const payload = {
      event: 'voice_call_completed',
      timestamp: new Date().toISOString(),
      callerPhone: callData.callerNumber,
      duration: `${durationSeconds} seconds`,
      conversationTranscript: transcriptText,
      totalTurns: callData.history ? callData.history.length : 0,
      leadStatus: 'VOICE_QUALIFIED'
    };

    console.log(`📡 [n8n Sync] Dispatching call record for ${callData.callerNumber}...`);
    await axios.post(webhookUrl, payload, { timeout: 4000 });
    console.log(`✅ [n8n Sync] Call logged successfully! Triggering WhatsApp brochure...`);
  } catch (err) {
    console.error(`⚠️ [n8n Sync Note]: Webhook dispatch skipped (${err.message}).`);
  }
}

module.exports = { logCallToN8n };
