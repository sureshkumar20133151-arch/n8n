/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Multi-Session WhatsApp Manager for Budget Tracker Pro
 *  Allows individual users to scan their own QR code and connect their WhatsApp.
 *  Uses Baileys to isolate sessions and routes transactions directly to that user's DB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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
const path = require('path');
const fs = require('fs');

// Whitelisted owner/test numbers (last 10 digits) exempt from 10-minute demo auto-disconnect
const DEMO_WHITELIST_PHONES = new Set(['8072239594', '7871762490', '9361599097']);
const DEMO_GUEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for external demo users

class MultiSessionManager {
  constructor(geminiService) {
    this.gemini = geminiService;
    this.sessions = new Map(); // userId -> { sock, status, qrDataUrl, userJid, phone, lastActive }
    this.baseDir = path.resolve(__dirname, 'user_sessions');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getUserSessionDir(userId) {
    const cleanUid = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.baseDir, cleanUid);
  }

  getSessionStatus(userId) {
    if (!this.sessions.has(userId)) {
      // Check if session directory exists on disk with saved credentials
      const sessionDir = this.getUserSessionDir(userId);
      const credsPath = path.join(sessionDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        // Auto-reconnect stored session (restore saved demo mode if present)
        let savedMode = 'finance';
        try {
          const metaPath = path.join(sessionDir, 'session_meta.json');
          if (fs.existsSync(metaPath)) {
            savedMode = JSON.parse(fs.readFileSync(metaPath, 'utf-8')).mode || 'finance';
          }
        } catch (e) {}
        this.startSession(userId, { mode: savedMode }).catch(e => console.error(`Error auto-reconnecting ${userId}:`, e.message));
        return { status: 'reconnecting', qr: null, phone: null, mode: savedMode };
      }
      return { status: 'disconnected', qr: null, phone: null, mode: 'finance' };
    }

    const session = this.sessions.get(userId);
    return {
      status: session.status,
      qr: session.qrDataUrl,
      phone: session.phone || null,
      userJid: session.userJid || null,
      mode: session.mode || 'finance'
    };
  }

  setSessionMode(userId, mode = 'builder') {
    const allowedModes = ['finance', 'builder', 'dhanam_internal', 'plumber', 'dev', 'restaurant', 'wholesale', 'meenakshi_traders'];
    const cleanMode = allowedModes.includes(mode) ? mode : 'builder';
    const sessionDir = this.getUserSessionDir(userId);
    try {
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'session_meta.json'), JSON.stringify({ mode: cleanMode, updatedAt: new Date().toISOString() }), 'utf-8');
    } catch (e) {}
    if (this.sessions.has(userId)) {
      this.sessions.get(userId).mode = cleanMode;
    }
    return { success: true, uid: userId, mode: cleanMode };
  }

  getDemoWelcomeMessage(mode) {
    if (mode === 'builder') {
      return `🏗️ *Danam Holdings Construction AI Demo Connected!*\n\nவணக்கம்! Construction Customer AI Bot உங்கள் WhatsApp-ல் இணைக்கப்பட்டுள்ளது.\n\nஇப்போது நீங்களே டெஸ்ட் செய்து பாருங்கள் (இந்த chat-ல் அல்லது வேறு நம்பரிலிருந்து message அனுப்பிப் பாருங்கள்):\n• *"1500 sq.ft வீடு கட்ட எவ்வளவு ஆகும்?"*\n• *"Madurai-ல turnkey villa packages சொல்லுங்க"*\n• *"Site visit book பண்ணனும்"*`;
    }
    if (mode === 'dhanam_internal') {
      return `🏗️💼 *Construction Site & Ops AI Demo Connected!*\n\nவணக்கம்! Site Bills, Attendance, Stocks & Machines AI Bot உங்கள் WhatsApp-ல் இணைக்கப்பட்டுள்ளது.\n\nஇப்போது டெஸ்ட் செய்து பாருங்கள்:\n• *"இன்னைக்கு சைட்ல 8 மேஸ்திரி, 12 ஹெல்பர் வந்தாங்க attendance போடு"*\n• *"சிமெண்ட் 50 மூட்டை ₹19,000-க்கு வாங்கியாச்சு bill record பண்ணு"*\n• *"JCB machine 4 மணி நேரம் ஓடுச்சு"*`;
    }
    if (mode === 'plumber') {
      return `⚡🔧 *Site Photo Vault AI Demo Connected!*\n\nவணக்கம்! Site Photo Vault & Labor Dispatch Bot இணைக்கப்பட்டுள்ளது.\n• ஏதாவது ஒரு Site Photo அனுப்பி *"Roof concrete pipe photo save பண்ணு"* என அனுப்புங்கள்\n• பிறகு *"Roof concrete photo காட்டு"* எனக் கேட்டு உடனே திரும்ப எடுத்துப் பாருங்கள்!`;
    }
    if (mode === 'dev') {
      return `💻 *SoloDeveloper.pro Sales AI Demo Connected!*\n\nAsk anything about our Starter (₹9,999), Pro (₹24,999), or Enterprise (₹49,999) AI & Website systems!`;
    }
    if (mode === 'restaurant') {
      return `🍗 *Restaurant AI Pre-Order Demo Connected!*\n\nTry asking: *"Menu enna irukku?"* or *"2 Mutton Biryani order podu"*!`;
    }
    if (mode === 'wholesale') {
      return `📦 *Wholesale B2B AI Demo Connected!*\n\nTry asking: *"Gold Winner 1L box rate enna?"* or *"10 box order podu"*!`;
    }
    return `🎉 *Budget Tracker Pro AI Connected!*\n\nவணக்கம்! உங்களுடைய வாட்ஸ்அப் கணக்கு Budget Tracker-உடன் வெற்றிகரமாக இணைக்கப்பட்டது.\n\nஇனி நீங்கள் செய்யும் செலவுகளை இந்த சாட்டிலேயே:\n• 🎙️ *Voice Note:* "டீ ₹20 cash" அல்லது "Petrol 500 GPay"\n• 📸 *Screenshot:* Google Pay / PhonePe Payment screen\n• 🧾 *Bill Photo:* உணவகம் அல்லது பில் போட்டோ\n• 💬 *Text:* "₹150 lunch" அல்லது "Balance evlo irukku?"\n\nஎன்று அனுப்பினால், அது நேரடியாக உங்கள் Budget Tracker ஆப்பில் பதிவாகிவிடும்! 💰`;
  }

  async startSession(userId, options = {}) {
    const allowedModes = ['finance', 'builder', 'dhanam_internal', 'plumber', 'dev', 'restaurant', 'wholesale', 'meenakshi_traders'];
    const requestedMode = options.mode && allowedModes.includes(options.mode) ? options.mode : null;

    if (this.sessions.has(userId)) {
      const existing = this.sessions.get(userId);
      if (requestedMode) {
        existing.mode = requestedMode;
        this.setSessionMode(userId, requestedMode);
      }
      if (existing.status === 'connected') {
        return { status: 'connected', phone: existing.phone, mode: existing.mode };
      }
      if (existing.status === 'qr_ready') {
        return { status: 'qr_ready', qr: existing.qrDataUrl, mode: existing.mode };
      }
    }

    // RAM Guard for Render Free Tier: keep at most 3 concurrent demo_ sessions
    if (userId.startsWith('demo_')) {
      const demoEntries = Array.from(this.sessions.entries()).filter(([k]) => k.startsWith('demo_') && k !== userId);
      if (demoEntries.length >= 3) {
        demoEntries.sort((a, b) => (a[1].lastActive || 0) - (b[1].lastActive || 0));
        await this.disconnectSession(demoEntries[0][0], true).catch(() => {});
      }
    }

    const sessionDir = this.getUserSessionDir(userId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    let activeMode = requestedMode || 'finance';
    const metaPath = path.join(sessionDir, 'session_meta.json');
    if (requestedMode) {
      try {
        fs.writeFileSync(metaPath, JSON.stringify({ mode: requestedMode, updatedAt: new Date().toISOString() }), 'utf-8');
      } catch (e) {}
    } else if (fs.existsSync(metaPath)) {
      try {
        activeMode = JSON.parse(fs.readFileSync(metaPath, 'utf-8')).mode || 'finance';
      } catch (e) {}
    }

    console.log(`📱 [MultiSessionManager] Initializing session for user: ${userId} (mode: ${activeMode})`);

    const sessionState = {
      sock: null,
      status: 'initializing',
      qrDataUrl: null,
      userJid: null,
      phone: null,
      mode: activeMode,
      lastActive: Date.now()
    };
    this.sessions.set(userId, sessionState);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false
    });

    sessionState.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`📷 [MultiSessionManager] New QR Code generated for user: ${userId}`);
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          sessionState.qrDataUrl = qrDataUrl;
          sessionState.status = 'qr_ready';
        } catch (err) {
          console.error(`Failed to generate QR data URL:`, err.message);
        }
      }

      if (connection === 'open') {
        sessionState.status = 'connected';
        sessionState.qrDataUrl = null;
        sessionState.userJid = sock.user?.id;
        sessionState.phone = (sock.user?.id || '').split(':')[0].split('@')[0];
        console.log(`✅ [MultiSessionManager] User ${userId} CONNECTED as WhatsApp: +${sessionState.phone}`);

        // Send confirmation welcome message to the user's self-chat
        try {
          const selfJid = sock.user?.id;
          if (selfJid) {
            await sock.sendMessage(selfJid, {
              text: this.getDemoWelcomeMessage(sessionState.mode)
            });
          }
        } catch (msgErr) {
          console.warn(`Could not send welcome message to ${userId}:`, msgErr.message);
        }

        // Auto-expire external demo_ sessions after 10 minutes (exempting whitelisted owner/test numbers)
        if (userId.startsWith('demo_')) {
          if (sessionState.expireTimer) clearTimeout(sessionState.expireTimer);
          const last10 = (sessionState.phone || '').replace(/\D/g, '').slice(-10);
          if (!DEMO_WHITELIST_PHONES.has(last10)) {
            console.log(`⏱️ [MultiSessionManager] Scheduling 10-minute auto-disconnect for guest demo ${userId} (+${sessionState.phone})`);
            sessionState.expireTimer = setTimeout(() => {
              console.log(`⌛ [MultiSessionManager] 10-minute demo expired for guest ${userId} (+${sessionState.phone}), disconnecting...`);
              this.disconnectSession(userId, true, true).catch(() => {});
            }, DEMO_GUEST_TIMEOUT_MS);
            if (typeof sessionState.expireTimer.unref === 'function') sessionState.expireTimer.unref();
          } else {
            console.log(`🛡️ [MultiSessionManager] Whitelisted number (${last10}) connected on ${userId} — exempt from 10-min auto-disconnect.`);
          }
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ [MultiSessionManager] Connection closed for user ${userId}. Code: ${statusCode}, ShouldReconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          sessionState.status = 'disconnected';
          this.disconnectSession(userId, false);
        } else if (shouldReconnect) {
          sessionState.status = 'reconnecting';
          setTimeout(() => {
            this.startSession(userId).catch(e => console.error(`Reconnect error:`, e.message));
          }, 5000);
        }
      }
    });

    // ── Listen for Incoming Messages ───────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message) continue;

        const isSelf = msg.key.fromMe;
        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');

        // Only handle:
        // 1. Messages sent by the user to themselves (Self-Chat / Message Yourself)
        // 2. Direct messages received on 1-on-1 chats
        if (!isSelf && isGroup) continue;

        // Extract message text & media
        const innerMsg = msg.message;
        let textMessage = innerMsg.conversation ||
          innerMsg.extendedTextMessage?.text ||
          innerMsg.imageMessage?.caption ||
          '';

        let mediaPayload = null;

        if (innerMsg.imageMessage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaPayload = {
              mimetype: innerMsg.imageMessage.mimetype || 'image/jpeg',
              data: buffer.toString('base64'),
              isImage: true
            };
          } catch (e) {
            console.error(`Failed to download image for ${userId}:`, e.message);
          }
        } else if (innerMsg.audioMessage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const rawMime = innerMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus';
            mediaPayload = {
              mimetype: rawMime.split(';')[0].trim() || 'audio/ogg',
              data: buffer.toString('base64'),
              isAudio: true
            };
          } catch (e) {
            console.error(`Failed to download audio for ${userId}:`, e.message);
          }
        }

        if (!textMessage.trim() && !mediaPayload) continue;

        console.log(`📩 [MultiSession] Incoming from user ${userId} (${remoteJid}): "${textMessage.slice(0, 50)}"${mediaPayload ? ' [Media attached]' : ''}`);

        // Set typing indicator
        try {
          await sock.sendPresenceUpdate('composing', remoteJid);
        } catch (e) {}

        try {
          sessionState.lastActive = Date.now();
          const activeOverrideMode = sessionState.mode || 'finance';
          // Process via Gemini AI in the session's selected mode
          const aiReply = await this.gemini.generateResponse(
            `${remoteJid}__user_${userId}`,
            textMessage,
            mediaPayload,
            {
              overrideMode: activeOverrideMode,
              targetUid: userId
            }
          );

          if (aiReply && aiReply.trim()) {
            await sock.sendMessage(remoteJid, { text: aiReply.trim() }, { quoted: msg });
          }
        } catch (err) {
          console.error(`❌ [MultiSession AI Error] for user ${userId}:`, err.message);
          await sock.sendMessage(remoteJid, {
            text: '⚠️ மன்னிக்கவும், உங்கள் கோரிக்கையைச் செயலாக்குவதில் ஒரு சிறிய சிக்கல். தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
          }, { quoted: msg });
        }
      }
    });

    return { status: sessionState.status, qr: sessionState.qrDataUrl };
  }

  async disconnectSession(userId, deleteFiles = true, logoutFromDevice = false) {
    if (this.sessions.has(userId)) {
      const session = this.sessions.get(userId);
      if (session.expireTimer) clearTimeout(session.expireTimer);
      try {
        if (logoutFromDevice && session.sock && typeof session.sock.logout === 'function') {
          await session.sock.logout().catch(() => {});
        }
        session.sock?.ev.removeAllListeners();
        session.sock?.ws?.close();
      } catch (e) {}
      this.sessions.delete(userId);
    }

    if (deleteFiles) {
      const sessionDir = this.getUserSessionDir(userId);
      try {
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      } catch (e) {
        console.error(`Failed to delete session files for ${userId}:`, e.message);
      }
    }

    console.log(`🗑️ [MultiSessionManager] Disconnected session for user: ${userId}`);
    return { success: true };
  }
}

module.exports = MultiSessionManager;
