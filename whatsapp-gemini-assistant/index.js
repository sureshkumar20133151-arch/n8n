require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const GeminiService = require('./geminiService');

const gemini = new GeminiService();

const triggerPrefix = (process.env.TRIGGER_PREFIX || '!ai').toLowerCase();
const autoReplyDM = (process.env.AUTO_REPLY_DM || 'true').toLowerCase() === 'true';
const enableGroups = (process.env.ENABLE_GROUPS || 'true').toLowerCase() === 'true';
const botName = process.env.BOT_NAME || 'Gemini Assistant';
const PORT = process.env.PORT || 10000;

let latestQrDataUrl = null;
let isClientReady = false;
let currentStatus = 'Starting WhatsApp Baileys Engine...';
let sock = null;

console.log('='.repeat(55));
console.log(`🤖 Starting ${botName} with Ultra-Lightweight Baileys Engine...`);
console.log(`📡 Model: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
console.log(`⚡ Auto-reply 1-on-1 chats: ${autoReplyDM}`);
console.log(`💬 Group chats enabled: ${enableGroups} (Prefix: "${triggerPrefix}")`);
console.log(`💾 Memory Footprint: ~40 MB RAM (100% Free on Render)`);
console.log('='.repeat(55));

// Ensure auth directory exists
const authDir = path.resolve('./.baileys_auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

async function connectToWhatsApp() {
  try {
    currentStatus = 'Initializing WebSocket connection...';

    // 1. Clean up any previous socket instance to prevent duplicate connections
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.ws?.close();
      } catch (e) {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));

    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      keepAliveIntervalMs: 25000,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentStatus = 'QR Code generated! Ready to scan.';
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
          console.log('\n📲 QR CODE (Scan from browser or terminal):\n');
          qrcodeTerminal.generate(qr, { small: true });
          console.log('\nSteps: Open WhatsApp on phone -> Settings -> Linked Devices -> Link a Device\n');
        } catch (e) {
          console.error('Error generating QR DataURL:', e);
        }
      }

      if (connection === 'close') {
        isClientReady = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        currentStatus = `Connection closed (Code: ${statusCode}). Reconnecting: ${shouldReconnect}`;
        console.log(`⚠️ Connection closed (Code: ${statusCode}), reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.restartRequired) {
          console.log('🔄 Restart required by WhatsApp handshake (Code 515). Reconnecting in 1s...');
          setTimeout(connectToWhatsApp, 1000);
        } else if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 3000);
        } else {
          console.log('Logged out from WhatsApp. Clear .baileys_auth and rescan.');
          currentStatus = 'Logged out. Please restart and rescan QR.';
        }
      } else if (connection === 'open') {
        isClientReady = true;
        latestQrDataUrl = null;
        currentStatus = 'Bot is ONLINE!';
        console.log(`\n🎉 ${botName} is ONLINE and ready to receive messages!`);
        console.log('Send a WhatsApp message to test the AI assistant.\n');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const remoteJid = msg.key.remoteJid;
          const isGroup = remoteJid.endsWith('@g.us');
          const isFromMe = msg.key.fromMe;

          // If from me, only respond if it's sent to own chat (Notes / Message yourself)
          if (isFromMe) {
            continue;
          }

          // Extract text from various message types
          const textMessage = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

          const body = textMessage.trim();

          // Handle Image / Media
          let mediaPayload = null;
          if (msg.message.imageMessage) {
            try {
              const buffer = await downloadMediaMessage(msg, 'buffer', {});
              mediaPayload = {
                mimetype: msg.message.imageMessage.mimetype || 'image/jpeg',
                data: buffer.toString('base64')
              };
            } catch (mediaErr) {
              console.error('Failed to download image:', mediaErr.message);
            }
          }

          // Decide whether to reply
          if (isGroup) {
            if (!enableGroups) continue;
            if (!body.toLowerCase().startsWith(triggerPrefix)) continue;
          } else {
            if (!autoReplyDM && !body.toLowerCase().startsWith(triggerPrefix)) continue;
          }

          if (!body && !mediaPayload) continue;

          // Strip trigger prefix if present
          let prompt = body;
          if (prompt.toLowerCase().startsWith(triggerPrefix)) {
            prompt = prompt.slice(triggerPrefix.length).trim();
          }

          const senderName = msg.pushName || 'Friend';
          console.log(`📩 [Incoming] From: ${senderName} (${remoteJid})`);
          console.log(`💬 Message: "${body || '[Image sent]'}"`);

          // Send typing indicator
          await sock.sendPresenceUpdate('composing', remoteJid);

          // Generate response with Gemini AI
          const reply = await gemini.generateResponse(remoteJid, prompt, mediaPayload);

          await sock.sendPresenceUpdate('paused', remoteJid);

          // Send message
          await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
          console.log(`✅ [Gemini] Reply sent to ${senderName}!\n`);

        } catch (msgErr) {
          console.error('Error handling message:', msgErr);
        }
      }
    });

  } catch (err) {
    console.error('Fatal initialization error:', err);
    currentStatus = `Initialization failed: ${err.message}`;
    setTimeout(connectToWhatsApp, 5000);
  }
}

connectToWhatsApp();

// HTTP server for Render port-binding, UptimeRobot, and Web QR viewing
const server = http.createServer((req, res) => {
  // CORS support for website chatbots
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // REST API endpoint for Website Chatbots (Option B)
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userMsg = (payload.message || '').trim();
        const sessionId = payload.sessionId || `web_${Date.now()}`;

        if (!userMsg) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(JSON.stringify({ error: 'Message is required' }));
        }

        const reply = await gemini.generateResponse(sessionId, userMsg);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ reply, sessionId }));
      } catch (apiErr) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ error: apiErr.message }));
      }
    });
    return;
  }

  // REST API endpoint for sending outbound WhatsApp messages (for n8n & webhooks)
  if (req.url === '/api/send-message' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const phone = (payload.phone || '').toString().trim();
        const message = (payload.message || '').trim();

        if (!phone || !message) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(JSON.stringify({ error: 'phone and message are required' }));
        }

        if (!isClientReady || !sock) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(JSON.stringify({ error: 'WhatsApp client is not currently connected' }));
        }

        let cleanDigits = phone.replace(/\D/g, '');
        // If 10 digits (common for Indian mobile numbers), prepend '91'
        if (cleanDigits.length === 10) {
          cleanDigits = '91' + cleanDigits;
        }

        const jid = `${cleanDigits}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        console.log(`📤 [Outbound] WhatsApp message sent to ${jid}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ success: true, jid, status: 'sent' }));
      } catch (err) {
        console.error('Error sending outbound WhatsApp message:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: isClientReady ? 'online' : 'connecting',
      ready: isClientReady,
      engine: 'baileys-websocket',
      ramEstimate: '~40MB',
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (isClientReady) {
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>WhatsApp Gemini Assistant - Online</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #111b21; color: #e9edef; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #202c33; padding: 40px; border-radius: 16px; text-align: center; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { color: #25d366; margin-top: 0; }
          .badge { display: inline-block; background: #25d366; color: #111b21; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
          p { color: #8696a0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● ONLINE & 24/7 ACTIVE</div>
          <h1>WhatsApp Gemini Assistant</h1>
          <p>Powered by ultra-fast Baileys Engine (40MB RAM). Active and replying to incoming messages in real-time.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (latestQrDataUrl) {
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Scan WhatsApp QR Code</title>
        <meta http-equiv="refresh" content="18">
        <style>
          body { font-family: -apple-system, sans-serif; background: #111b21; color: #e9edef; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #202c33; padding: 32px; border-radius: 16px; text-align: center; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { color: #25d366; font-size: 22px; margin-top: 0; }
          .qr-box { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin: 16px 0; }
          img { display: block; width: 300px; height: 300px; }
          .note { color: #8696a0; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Link WhatsApp Assistant</h1>
          <p style="color:#8696a0;">Scan this QR code with WhatsApp on your phone:</p>
          <div class="qr-box">
            <img src="${latestQrDataUrl}" alt="WhatsApp QR Code" />
          </div>
          <p class="note">Page automatically refreshes every 18s</p>
        </div>
      </body>
      </html>
    `);
  }

  return res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="4">
      <title>Starting WhatsApp Assistant...</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #111b21; color: #e9edef; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #202c33; padding: 36px; border-radius: 16px; text-align: center; max-width: 460px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .status-box { background: #111b21; color: #25d366; padding: 12px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 18px 0; border: 1px solid #374248; word-break: break-word; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2 style="color:#25d366;margin-top:0;">WhatsApp Assistant Starting...</h2>
        <div class="status-box">${currentStatus}</div>
        <p style="color:#8696a0;font-size:13px;line-height:1.5;">Connecting to WhatsApp servers. QR code will appear here in seconds.</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Web service listening on port ${PORT}`);

  // 24/7 Keep-Alive Self-Ping (Prevents Render Free Tier from going to sleep after 15m)
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || 'https://whatsapp-assistant-iqpi.onrender.com';
  console.log(`⏰ Starting 24/7 Keep-Alive monitor for ${keepAliveUrl} (Every 8 minutes)`);
  setInterval(() => {
    try {
      const client = keepAliveUrl.startsWith('https') ? https : http;
      client.get(`${keepAliveUrl}/healthz`, (res) => {
        // Resets Render idle timer
      }).on('error', () => {
        // Ignore errors during spin-up
      });
    } catch (e) {}
  }, 8 * 60 * 1000);
});
