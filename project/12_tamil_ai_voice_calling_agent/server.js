const express = require('express');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const twilio = require('twilio');
const { handleTwilioMediaStream } = require('./src/pipeline/voicePipeline');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Health Check
app.get('/', (req, res) => {
  res.send('🎙️ Danam Holdings Tamil AI Voice Calling Server is RUNNING!');
});

// TwiML Inbound / Outbound Voice Entrypoint
app.post('/incoming-call', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const rawUrl = process.env.SERVER_URL || 'localhost:8080';
  const serverUrl = rawUrl.replace(/^https?:\/\//, '');

  console.log(`📞 [Incoming Call from ${req.body.From || 'Unknown'}] Connecting to Voice Stream...`);

  // Connect call audio to our WebSocket server
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${serverUrl}/media-stream`
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// WebSocket Handler for Twilio Media Streams (8kHz mu-law audio)
wss.on('connection', (ws, req) => {
  console.log('⚡ [WebSocket] Twilio Media Stream connected!');
  handleTwilioMediaStream(ws);
});

server.listen(PORT, () => {
  console.log(`🚀 [Server] Danam Voice Agent listening on http://localhost:${PORT}`);
});
