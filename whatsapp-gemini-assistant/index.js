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
const adminRules = require('./adminRulesManager');

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

// ============================================================
// LOOP PREVENTION, DEDUPLICATION & CONCURRENCY CONTROLS
// ============================================================
const sentByBotIds = new Set();
const processedMessageIds = new Set();
const activeChatLocks = new Set();
const recentBotReplies = new Map(); // remoteJid -> { text, timestamp }

function recordBotSentId(msgId) {
  if (!msgId) return;
  sentByBotIds.add(msgId);
  if (sentByBotIds.size > 2000) {
    const first = sentByBotIds.values().next().value;
    sentByBotIds.delete(first);
  }
}

function recordProcessedMessageId(msgId) {
  if (!msgId) return;
  processedMessageIds.add(msgId);
  if (processedMessageIds.size > 2000) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
}

async function sendBotMessage(socket, targetJid, content, options = {}) {
  const sent = await socket.sendMessage(targetJid, content, options);
  if (sent?.key?.id) {
    recordBotSentId(sent.key.id);
  }
  if (content && content.text) {
    recentBotReplies.set(targetJid, {
      text: content.text.trim(),
      timestamp: Date.now()
    });
    if (recentBotReplies.size > 500) {
      const oldestKey = recentBotReplies.keys().next().value;
      recentBotReplies.delete(oldestKey);
    }
  }
  return sent;
}

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

function clearAuthSession() {
  try {
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.ws?.close();
      } catch (e) {}
      sock = null;
    }
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    fs.mkdirSync(authDir, { recursive: true });
    console.log('🗑️ [Auth Reset] Cleared .baileys_auth directory successfully.');
  } catch (err) {
    console.error('Error clearing auth directory:', err.message);
  }
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
        latestQrDataUrl = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        currentStatus = `Connection closed (Code: ${statusCode}). Reconnecting: ${shouldReconnect}`;
        console.log(`⚠️ Connection closed (Code: ${statusCode}), isLoggedOut: ${isLoggedOut}, reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.restartRequired) {
          currentStatus = 'Restarting WhatsApp handshake (Code 515)...';
          console.log('🔄 Restart required by WhatsApp handshake (Code 515). Reconnecting in 1s...');
          setTimeout(connectToWhatsApp, 1000);
        } else if (isLoggedOut) {
          console.log('⚠️ Logged out from WhatsApp. Auto-clearing session and generating fresh QR code...');
          currentStatus = 'Session logged out. Clearing old credentials and generating new QR code...';
          clearAuthSession();
          setTimeout(connectToWhatsApp, 1500);
        } else if (shouldReconnect) {
          currentStatus = `Reconnecting to WhatsApp (Code: ${statusCode || 'unknown'})...`;
          setTimeout(connectToWhatsApp, 3000);
        } else {
          console.log('⚠️ Disconnected. Resetting session to generate fresh QR...');
          currentStatus = 'Disconnected. Resetting and generating new QR code...';
          clearAuthSession();
          setTimeout(connectToWhatsApp, 2000);
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
      // ONLY process real-time incoming user notifications
      // Ignore 'append' (internal cache sync and outgoing sent messages emitted by Baileys)
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const msgId = msg.key.id;
          const remoteJid = msg.key.remoteJid;
          const isGroup = remoteJid.endsWith('@g.us');
          const isFromMe = Boolean(msg.key.fromMe);

          // 1. Guard against re-processing messages sent by our bot
          if (msgId && sentByBotIds.has(msgId)) {
            continue;
          }

          // 2. Guard against duplicate events
          if (msgId && processedMessageIds.has(msgId)) {
            continue;
          }
          recordProcessedMessageId(msgId);

          // 3. If from me, ONLY allow if sent to own chat (Message Yourself / Notes to self for testing)
          if (isFromMe) {
            const myJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
            const isSelfChat = myJid && remoteJid === myJid;
            if (!isSelfChat) {
              continue; // Message sent from Suresh's phone to an external chat -> NEVER auto-reply
            }
          }

          // Extract text from various message types
          const textMessage = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

          const body = textMessage.trim();

          // 4. In self-chat, ensure we never respond to our own bot reply text echoes
          if (isFromMe && body) {
            const recent = recentBotReplies.get(remoteJid);
            if (recent && recent.text === body && (Date.now() - recent.timestamp) < 60000) {
              console.log(`🛡️ [Self-Loop Guard] Discarded bot reply echo in self-chat (${remoteJid}).`);
              continue;
            }
          }

          // Handle Image / Media / Voice Note
          let mediaPayload = null;
          let isAudio = false;
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
          } else if (msg.message.audioMessage) {
            try {
              console.log(`🎙️ [Incoming Voice Note] Downloading audio stream from ${remoteJid}...`);
              const buffer = await downloadMediaMessage(msg, 'buffer', {});
              const rawMime = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
              const cleanMime = rawMime.split(';')[0].trim();
              mediaPayload = {
                mimetype: cleanMime || 'audio/ogg',
                data: buffer.toString('base64'),
                isAudio: true
              };
              isAudio = true;
              console.log(`🎙️ [Voice Note Downloaded] ${buffer.length} bytes, MIME: ${cleanMime}`);
            } catch (mediaErr) {
              console.error('Failed to download audio message:', mediaErr.message);
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
          console.log(`💬 Message: "${body || (isAudio ? '[Voice Note / Audio sent]' : '[Image sent]')}"`);

          const cleanSenderDigits = remoteJid ? remoteJid.replace(/\D/g, '') : '';
          const ownerPhone = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');
          const isOwner = Boolean(isFromMe || cleanSenderDigits === ownerPhone);

          // Handle quick reset command for clean state
          if (prompt.toLowerCase() === '!reset' || prompt.toLowerCase() === '/reset') {
            gemini.resetHistory(remoteJid);
            const resetReply = isOwner
              ? "✅ Conversation history has been cleanly reset, Suresh! How can I assist you today?"
              : "✅ Conversation restarted. How can I assist you today?";
            await sendBotMessage(sock, remoteJid, { text: resetReply }, { quoted: msg });
            console.log(`🔄 [Reset] History cleared for ${remoteJid}\n`);
            continue;
          }

          // Handle Boss / Admin Commands from Suresh (e.g. !rule, /rule, !rules, /rules, !delrule, !setslots, !setprice, !help)
          if (isOwner && (prompt.startsWith('!') || prompt.startsWith('/'))) {
            const adminReply = adminRules.handleAdminCommand(prompt);
            if (adminReply) {
              await sendBotMessage(sock, remoteJid, { text: adminReply }, { quoted: msg });
              console.log(`👑 [Admin Command Handled for Suresh]: "${prompt}"\n`);
              continue;
            }
          }

          // 5. Concurrency lock per remoteJid to prevent overlapping runs / race loops
          if (activeChatLocks.has(remoteJid)) {
            console.log(`⏳ [Debounce] Already processing a message for ${remoteJid}, skipping duplicate/overlap.`);
            continue;
          }

          activeChatLocks.add(remoteJid);
          try {
            // Send typing indicator
            await sock.sendPresenceUpdate('composing', remoteJid);

            // Generate response with Gemini AI
            const reply = await gemini.generateResponse(remoteJid, prompt, mediaPayload, { isOwner, senderName });

            await sock.sendPresenceUpdate('paused', remoteJid);

            // Send message safely using sendBotMessage
            await sendBotMessage(sock, remoteJid, { text: reply }, { quoted: msg });
            console.log(`✅ [Gemini] Reply sent to ${senderName}!\n`);
          } finally {
            activeChatLocks.delete(remoteJid);
          }

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

// Security helpers
function isDummyPhoneNumber(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 10) return true;
  return /^(91)?(98765\d{5}|12345\d{5}|00000\d{5}|11111\d{5}|99999\d{5}|0{10}|1{10})/.test(digits) ||
         digits.startsWith('91000000') ||
         digits === '910000000000' ||
         digits === '0000000000';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function authenticateRequest(req, res) {
  const API_SECRET = process.env.API_SECRET;
  if (!API_SECRET) return true; // Allows local dev if API_SECRET not set
  const authHeader = req.headers['authorization'] || '';
  if (authHeader !== `Bearer ${API_SECRET}`) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
    });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API secret' }));
    return false;
  }
  return true;
}

const MAX_BODY_SIZE = 100 * 1024; // 100 KB limit to prevent DoS

// HTTP server for Render port-binding, UptimeRobot, and Web QR viewing
const server = http.createServer((req, res) => {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  // CORS support for website chatbots
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // REST API endpoint for Website Chatbots (Option B)
  if (req.url === '/api/chat' && req.method === 'POST') {
    if (!authenticateRequest(req, res)) return;

    let body = '';
    let bodySize = 0;
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
        res.end(JSON.stringify({ error: 'Payload too large (max 100KB)' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userMsg = (payload.message || '').trim();
        const sessionId = payload.sessionId || `web_${Date.now()}`;

        if (!userMsg) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ error: 'Message is required' }));
        }

        const reply = await gemini.generateResponse(sessionId, userMsg);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ reply, sessionId }));
      } catch (apiErr) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ error: apiErr.message }));
      }
    });
    return;
  }

  // REST API endpoint for sending outbound WhatsApp messages (for n8n & webhooks)
  if (req.url === '/api/send-message' && req.method === 'POST') {
    if (!authenticateRequest(req, res)) return;

    let body = '';
    let bodySize = 0;
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
        res.end(JSON.stringify({ error: 'Payload too large (max 100KB)' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const phone = (payload.phone || '').toString().trim();
        const message = (payload.message || '').trim();

        if (!phone || !message) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ error: 'phone and message are required' }));
        }

        if (!isClientReady || !sock) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ error: 'WhatsApp client is not currently connected' }));
        }

        let cleanDigits = phone.replace(/\D/g, '');
        // If 10 digits (common for Indian mobile numbers), prepend '91'
        if (cleanDigits.length === 10) {
          cleanDigits = '91' + cleanDigits;
        }

        if (isDummyPhoneNumber(cleanDigits)) {
          console.log(`🛡️ [Safety Guard] Intercepted outbound message to dummy/test phone: ${cleanDigits}. Message was not sent.`);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ success: true, jid: `${cleanDigits}@s.whatsapp.net`, status: 'simulated_dummy_blocked' }));
        }

        const jid = `${cleanDigits}@s.whatsapp.net`;
        await sendBotMessage(sock, jid, { text: message });
        console.log(`📤 [Outbound] WhatsApp message sent to ${jid}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ success: true, jid, status: 'sent' }));
      } catch (err) {
        console.error('Error sending outbound WhatsApp message:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // REST API endpoint to proactively resume an interrupted or pending chat from the AI side
  if (req.url === '/api/resume-chat' && req.method === 'POST') {
    if (!authenticateRequest(req, res)) return;

    let body = '';
    let bodySize = 0;
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
        res.end(JSON.stringify({ error: 'Payload too large (max 100KB)' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const phone = (payload.phone || '').toString().trim();
        const customPrompt = (payload.prompt || 'Please resume our previous conversation naturally and continue qualifying').trim();

        if (!phone) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ error: 'phone is required' }));
        }

        if (!isClientReady || !sock) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ error: 'WhatsApp client is not currently connected' }));
        }

        let cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.length === 10) cleanDigits = '91' + cleanDigits;

        if (isDummyPhoneNumber(cleanDigits)) {
          console.log(`🛡️ [Safety Guard] Blocked resume-chat on dummy/test phone: ${cleanDigits}`);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ success: true, jid: `${cleanDigits}@s.whatsapp.net`, status: 'simulated_dummy_blocked' }));
        }

        const jid = `${cleanDigits}@s.whatsapp.net`;

        // Generate AI continuation reply based on the history
        const reply = await gemini.generateResponse(jid, customPrompt);

        // Send proactive message from AI to client
        await sendBotMessage(sock, jid, { text: reply });
        console.log(`🚀 [Proactive Resume] AI initiated conversation continuation to ${jid}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ success: true, jid, reply, status: 'initiated' }));
      } catch (err) {
        console.error('Error in /api/resume-chat:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
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

  // Endpoint to manually clear authentication credentials and restart QR generation
  if (req.url === '/restart' || req.url === '/api/restart') {
    console.log('🔄 [Manual Restart Requested] Resetting WhatsApp credentials and generating new QR...');
    currentStatus = 'Resetting session and generating fresh QR code...';
    latestQrDataUrl = null;
    isClientReady = false;
    clearAuthSession();
    setTimeout(connectToWhatsApp, 1000);

    if (req.method === 'POST' || (req.headers.accept && req.headers.accept.includes('text/html'))) {
      res.writeHead(302, { 'Location': '/' });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'Auth session reset. Generating fresh QR code...' }));
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
          <form method="POST" action="/restart" style="margin-top: 24px;">
            <button type="submit" style="background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; padding: 8px 18px; border-radius: 18px; cursor: pointer; font-size: 12px;">
              ⚠️ Unlink & Generate New QR Code
            </button>
          </form>
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
          <form method="POST" action="/restart" style="margin-top: 14px;">
            <button type="submit" style="background: transparent; color: #8696a0; border: 1px solid #374248; padding: 8px 16px; border-radius: 18px; cursor: pointer; font-size: 12px;">
              🔄 Refresh / Get New QR Code
            </button>
          </form>
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
        <div class="status-box">${escapeHtml(currentStatus)}</div>
        <p style="color:#8696a0;font-size:13px;line-height:1.5;">Connecting to WhatsApp servers. QR code will appear here in seconds.</p>
        <form method="POST" action="/restart" style="margin-top: 22px;">
          <button type="submit" style="background: #25d366; color: #111b21; border: none; padding: 12px 24px; border-radius: 24px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
            🔄 Reset & Generate Fresh QR Code
          </button>
        </form>
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
        // Resets Render idle timer and releases socket
        res.resume();
      }).on('error', () => {
        // Ignore errors during spin-up
      });
    } catch (e) {}
  }, 8 * 60 * 1000);
});
