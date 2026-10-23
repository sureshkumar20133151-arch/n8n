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
const personaManager = require('./personaManager');
const wholesaleInventory = require('./wholesaleInventoryService');

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
  try {
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
  } catch (err) {
    if (options && options.quoted) {
      console.warn(`[sendBotMessage] Quoted send failed to ${targetJid}, retrying plain:`, err.message);
      const plainSent = await socket.sendMessage(targetJid, content);
      if (plainSent?.key?.id) recordBotSentId(plainSent.key.id);
      return plainSent;
    }
    throw err;
  }
}

console.log('='.repeat(55));
console.log(`🤖 Starting ${botName} with Ultra-Lightweight Baileys Engine...`);
console.log(`📡 Model: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
console.log(`⚡ Auto-reply 1-on-1 chats: ${autoReplyDM}`);
console.log(`💬 Group chats enabled: ${enableGroups} (Prefix: "${triggerPrefix}")`);
console.log(`💾 Memory Footprint: ~40 MB RAM (100% Free on Render)`);
console.log('='.repeat(55));

function detectModeSwitchIntent(rawText) {
  if (!rawText) return null;
  const cleaned = rawText.toLowerCase().trim();

  // 1. Direct query commands: !mode, /mode, mode, switch, !switch, /switch, which mode
  if (
    cleaned === '!mode' || cleaned === '/mode' || cleaned === 'mode' ||
    cleaned === '!switch' || cleaned === '/switch' || cleaned === 'switch' ||
    cleaned === 'switch mode' || cleaned === 'change mode' ||
    /^(which|what|check|show|current|active)\s+mode/i.test(cleaned)
  ) {
    return { isQuery: true };
  }

  // Parameterized commands: !mode wholesale, /switch dev, !setmode restaurant, etc.
  if (/^(!|\/)(mode|switch|setmode)\s+/i.test(cleaned)) {
    const target = cleaned.replace(/^(!|\/)(mode|switch|setmode)\s+/, '').trim();
    return { target };
  }

  // 2. Wholesale / Oil Store triggers
  // Handles: "switch to oil store", "switch oil", "oil store", "wholesale mode", "oil store ku mathu", "wholesale", "annamaliyar"
  if (
    /\b(oil store|oil shop|wholesale|annamaliyar|oil mode|wholesale mode)\b/i.test(cleaned) ||
    /(?:switch|change|set|activate|turn on|go|mathu|maathu)\s*(?:mode|to|mode to|ku)?\s*(?:oil|wholesale|annamaliyar|shop|store)/i.test(cleaned) ||
    /(?:oil|wholesale|annamaliyar|shop|store)\s*(?:ku\s*)?(?:switch|mathu|maathu|mode)/i.test(cleaned)
  ) {
    return { target: 'wholesale' };
  }

  // 3. Restaurant / Taj Hotel Biryani triggers
  // Handles: "switch to restaurant", "switch restaurant", "biryani mode", "taj hotel", "restaurant ku mathu", "biryani"
  if (
    /\b(restaurant|biryani|taj hotel|taj|food mode|restaurant mode|biryani mode)\b/i.test(cleaned) ||
    /(?:switch|change|set|activate|turn on|go|mathu|maathu)\s*(?:mode|to|mode to|ku)?\s*(?:restaurant|biryani|taj|hotel|food)/i.test(cleaned) ||
    /(?:restaurant|biryani|taj|hotel|food)\s*(?:ku\s*)?(?:switch|mathu|maathu|mode)/i.test(cleaned)
  ) {
    return { target: 'restaurant' };
  }

  // 4. Dev / SoloDeveloper triggers
  // Handles: "switch to dev", "switch dev", "dev mode", "developer mode", "dev ku mathu", "sales os", "solodeveloper"
  if (
    /\b(dev|developer|solodeveloper|sales os|dev mode|developer mode)\b/i.test(cleaned) ||
    /(?:switch|change|set|activate|turn on|go|mathu|maathu)\s*(?:mode|to|mode to|ku)?\s*(?:dev|developer|sales|suresh)/i.test(cleaned) ||
    /(?:dev|developer|sales|suresh)\s*(?:ku\s*)?(?:switch|mathu|maathu|mode)/i.test(cleaned)
  ) {
    return { target: 'dev' };
  }

  return null;
}

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
      // Process real-time incoming user notifications ('notify') AND self-chat test messages ('append')
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const msgId = msg.key.id;
          const remoteJid = msg.key.remoteJid;
          const isGroup = remoteJid.endsWith('@g.us');
          const isFromMe = Boolean(msg.key.fromMe);

          // If 'append', ONLY process if it is from me to own self-chat (Message Yourself)
          if (type === 'append' && !isFromMe) continue;

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
            const myDigits = (sock.user?.id || '').replace(/\D/g, '').slice(0, 12);
            const remoteDigits = (remoteJid || '').replace(/\D/g, '');
            const ownerPhoneDigits = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');

            const isSelfChat = 
              (myDigits && remoteDigits && remoteDigits.startsWith(myDigits)) ||
              (ownerPhoneDigits && remoteDigits && remoteDigits.startsWith(ownerPhoneDigits)) ||
              (remoteJid && remoteJid.includes(ownerPhoneDigits)) ||
              remoteJid === 'me' ||
              remoteJid.endsWith('@lid');

            if (!isSelfChat) {
              continue; // Message sent from Suresh's phone to an external chat -> NEVER auto-reply
            }
          }

          // Unwrap ephemeral, viewOnce, and edited message containers
          let innerMsg = msg.message;
          if (innerMsg.ephemeralMessage?.message) innerMsg = innerMsg.ephemeralMessage.message;
          if (innerMsg.viewOnceMessage?.message) innerMsg = innerMsg.viewOnceMessage.message;
          if (innerMsg.viewOnceMessageV2?.message) innerMsg = innerMsg.viewOnceMessageV2.message;
          if (innerMsg.editedMessage?.message) innerMsg = innerMsg.editedMessage.message;
          if (innerMsg.documentWithCaptionMessage?.message) innerMsg = innerMsg.documentWithCaptionMessage.message;

          // Extract text from various message types
          const textMessage = innerMsg.conversation ||
            innerMsg.extendedTextMessage?.text ||
            innerMsg.imageMessage?.caption ||
            innerMsg.videoMessage?.caption ||
            innerMsg.buttonsResponseMessage?.selectedButtonId ||
            innerMsg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            innerMsg.templateButtonReplyMessage?.selectedId ||
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

          const modeIntentEarly = detectModeSwitchIntent(body);

          // Decide whether to reply
          if (isGroup) {
            if (!enableGroups && !modeIntentEarly) continue;
            if (!body.toLowerCase().startsWith(triggerPrefix) && !modeIntentEarly) continue;
          } else {
            // Mode switch commands and autoReplyDM allow processing
            if (!modeIntentEarly && !autoReplyDM && !body.toLowerCase().startsWith(triggerPrefix)) continue;
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

          // Routable destination JID: route self-chat or @lid to owner phone @s.whatsapp.net
          const isSelfRoute = isFromMe && (remoteJid === 'me' || remoteJid.endsWith('@lid') || (typeof isSelfChat !== 'undefined' && isSelfChat));
          const replyJid = isSelfRoute
            ? `${ownerPhone}@s.whatsapp.net`
            : remoteJid;
          const quoteOption = isFromMe ? {} : { quoted: msg };

          // Handle quick reset command for clean state
          if (prompt.toLowerCase() === '!reset' || prompt.toLowerCase() === '/reset') {
            gemini.resetHistory(replyJid);
            const resetReply = isOwner
              ? "✅ Conversation history has been cleanly reset, Suresh! How can I assist you today?"
              : "✅ Conversation restarted. How can I assist you today?";
            await sendBotMessage(sock, replyJid, { text: resetReply }, quoteOption);
            console.log(`🔄 [Reset] History cleared for ${replyJid}\n`);
            continue;
          }

          // Multi-Persona Switcher: Supports !mode wholesale, /mode dev, "switch to restaurant", "restaurant mode", etc.
          const modeIntent = detectModeSwitchIntent(prompt);
          if (modeIntent) {
            if (modeIntent.isQuery) {
              const currentModeInfo = personaManager.formatCurrentModeReply();
              await sendBotMessage(sock, replyJid, { text: currentModeInfo }, quoteOption);
              console.log(`🎛️ [Mode Status Queried] Current: ${personaManager.getActiveMode()} by ${replyJid}\n`);
              continue;
            } else if (modeIntent.target) {
              const switchRes = personaManager.setMode(modeIntent.target, `WhatsApp (${replyJid})`);
              if (switchRes.success) {
                await sendBotMessage(sock, replyJid, { text: switchRes.switchMessage }, quoteOption);
                console.log(`⚡ [Mode Switched in 0.1s] Now active: ${switchRes.currentMode} by ${replyJid} (via: "${prompt}")\n`);
              } else {
                await sendBotMessage(sock, replyJid, { text: `⚠️ ${switchRes.error}` }, quoteOption);
              }
              continue;
            }
          }

          // Handle Boss / Admin Commands from Suresh (e.g. !rule, /rule, !rules, /rules, !delrule, !setslots, !setprice, !help)
          // Smart Zero-Token Content Intent Routing (Zero LLM Tokens!)
          const lowerPrompt = prompt.toLowerCase().trim();
          if (/^(1|one)$/i.test(lowerPrompt)) {
            personaManager.setMode('wholesale', 'Selection 1');
            prompt = 'வணக்கம்! அண்ணாமலையார் ஆயில் ஸ்டோர் மொத்த விலை மற்றும் ஸ்டாக் விபரங்களை சொல்லுங்கள்.';
          } else if (/^(2|two)$/i.test(lowerPrompt)) {
            personaManager.setMode('restaurant', 'Selection 2');
            prompt = 'வணக்கம்! தாஜ் ஹோட்டல் பிரியாணி மெனு மற்றும் டோக்கன் ஆர்டர் விபரம் சொல்லுங்கள்.';
          } else if (/^(3|three)$/i.test(lowerPrompt)) {
            personaManager.setMode('dev', 'Selection 3');
            prompt = 'Hello! I am looking for a website and WhatsApp automation solutions for my business.';
          }

          if (isOwner && (prompt.startsWith('!') || prompt.startsWith('/'))) {
            const adminReply = adminRules.handleAdminCommand(prompt);
            if (adminReply) {
              await sendBotMessage(sock, replyJid, { text: adminReply }, quoteOption);
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
            // Send typing indicator (non-blocking)
            sock.sendPresenceUpdate('composing', replyJid).catch(() => {});

            // Generate response with Gemini AI
            const reply = await gemini.generateResponse(replyJid, prompt, mediaPayload, { isOwner, senderName });

            sock.sendPresenceUpdate('paused', replyJid).catch(() => {});

            // Send message safely using sendBotMessage
            await sendBotMessage(sock, replyJid, { text: reply }, quoteOption);
            console.log(`✅ [Gemini] Reply sent to ${senderName} (${replyJid})!\n`);
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
  const allowedOrigin = req.headers.origin || process.env.CORS_ORIGIN || '*';

  // CORS support for website chatbots & Vercel Switcher dashboard
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // Multi-Persona API: GET current active persona & catalog of all personas
  if (req.url === '/api/persona' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    });
    return res.end(JSON.stringify({
      success: true,
      activeMode: personaManager.getActiveMode(),
      persona: personaManager.getPersonaDetails(),
      allPersonas: personaManager.getAllPersonas(),
      lastUpdated: personaManager.lastUpdated,
      updatedBy: personaManager.updatedBy
    }));
  }

  // Multi-Persona API: POST switch active persona in 0.1s
  if (req.url === '/api/persona' && req.method === 'POST') {
    let body = '';
    let bodySize = 0;
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetMode = payload.mode || payload.persona || '';
        const updatedBy = payload.updatedBy || 'Vercel Web Switcher Dashboard';

        const switchResult = personaManager.setMode(targetMode, updatedBy);
        if (switchResult.success) {
          // Send instant WhatsApp confirmation alert to Suresh's phone so he knows it was switched!
          if (sock && isClientReady) {
            const ownerPhoneDigits = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');
            const ownerJid = `${ownerPhoneDigits}@s.whatsapp.net`;
            sendBotMessage(sock, ownerJid, { text: `⚡ [Dashboard Alert]\n${switchResult.switchMessage}\n_(Source: ${updatedBy})_` }).catch(e => {
              console.warn('[Dashboard Switch Notify Error]:', e.message);
            });
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({
            success: true,
            activeMode: switchResult.currentMode,
            persona: switchResult.persona,
            message: `Switched WhatsApp assistant to ${switchResult.persona.name}`
          }));
        } else {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          });
          return res.end(JSON.stringify({ success: false, error: switchResult.error }));
        }
      } catch (e) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Wholesale Live Google Sheet / Inventory API: GET live items
  if (req.url === '/api/wholesale/inventory' && req.method === 'GET') {
    const items = wholesaleInventory.getAll();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    });
    return res.end(JSON.stringify({
      success: true,
      client: 'Annamaliyar Oil Store, Mattuthavani, Madurai',
      proprietor: 'Manikanda Vinayaga Prabhu',
      moqPolicy: 'Strictly 1 Box / 1 Tin/Can',
      itemCount: items.length,
      items: items,
      lastLoaded: wholesaleInventory.lastLoaded
    }));
  }

  // Wholesale Google Sheets Trigger Sync
  if (req.url === '/api/wholesale/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const syncRes = await wholesaleInventory.syncFromGoogleSheet(payload.sheetUrl);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify(syncRes));
      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Serve Switcher Dashboard directly from server at /switcher or /admin/switcher
  if (req.url === '/switcher' || req.url === '/admin/switcher') {
    const candidatePaths = [
      path.resolve(__dirname, 'data', 'switcher_web_page.html'),
      path.resolve(__dirname, '..', 'project', 'switcher_web_page.html'),
      path.resolve(__dirname, 'switcher_web_page.html')
    ];
    for (const switcherPath of candidatePaths) {
      if (fs.existsSync(switcherPath)) {
        const html = fs.readFileSync(switcherPath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': allowedOrigin
        });
        return res.end(html);
      }
    }
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

    // Dynamic QR Code API for the Switcher Dashboard
  if (req.url === '/api/qr-data' || req.url === '/qr-data') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    });
    return res.end(JSON.stringify({
      ready: isClientReady,
      status: isClientReady ? 'online' : 'connecting',
      qrDataUrl: latestQrDataUrl || null
    }));
  }

  // Serve the complete Interactive Multi-Persona Switcher Dashboard for Home (/) and (/switcher)
  const candidatePaths = [
    path.resolve(__dirname, 'data', 'switcher_web_page.html'),
    path.resolve(__dirname, 'switcher_web_page.html'),
    path.resolve(__dirname, '..', 'project', 'switcher_web_page.html')
  ];
  for (const switcherPath of candidatePaths) {
    if (fs.existsSync(switcherPath)) {
      const html = fs.readFileSync(switcherPath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': allowedOrigin
      });
      return res.end(html);
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end('<h1>SoloDeveloper.pro Switcher Dashboard is loading...</h1>');
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
