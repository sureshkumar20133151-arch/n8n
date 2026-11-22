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
        // Auto-reconnect stored session
        this.startSession(userId).catch(e => console.error(`Error auto-reconnecting ${userId}:`, e.message));
        return { status: 'reconnecting', qr: null, phone: null };
      }
      return { status: 'disconnected', qr: null, phone: null };
    }

    const session = this.sessions.get(userId);
    return {
      status: session.status,
      qr: session.qrDataUrl,
      phone: session.phone || null,
      userJid: session.userJid || null
    };
  }

  async startSession(userId) {
    if (this.sessions.has(userId)) {
      const existing = this.sessions.get(userId);
      if (existing.status === 'connected') {
        return { status: 'connected', phone: existing.phone };
      }
      if (existing.status === 'qr_ready') {
        return { status: 'qr_ready', qr: existing.qrDataUrl };
      }
    }

    const sessionDir = this.getUserSessionDir(userId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log(`📱 [MultiSessionManager] Initializing session for user: ${userId}`);

    const sessionState = {
      sock: null,
      status: 'initializing',
      qrDataUrl: null,
      userJid: null,
      phone: null,
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
              text: `🎉 *Budget Tracker Pro AI Connected!*\n\nவணக்கம்! உங்களுடைய வாட்ஸ்அப் கணக்கு Budget Tracker-உடன் வெற்றிகரமாக இணைக்கப்பட்டது.\n\nஇனி நீங்கள் செய்யும் செலவுகளை இந்த சாட்டிலேயே:\n• 🎙️ *Voice Note:* "டீ ₹20 cash" அல்லது "Petrol 500 GPay"\n• 📸 *Screenshot:* Google Pay / PhonePe Payment screen\n• 🧾 *Bill Photo:* உணவகம் அல்லது பில் போட்டோ\n• 💬 *Text:* "₹150 lunch" அல்லது "Balance evlo irukku?"\n\nஎன்று அனுப்பினால், அது நேரடியாக உங்கள் Budget Tracker ஆப்பில் பதிவாகிவிடும்! 💰`
            });
          }
        } catch (msgErr) {
          console.warn(`Could not send welcome message to ${userId}:`, msgErr.message);
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
          // Process via Gemini AI explicitly in finance mode with targetUid
          const aiReply = await this.gemini.generateResponse(
            `${remoteJid}__user_${userId}`,
            textMessage,
            mediaPayload,
            {
              overrideMode: 'finance',
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

  async disconnectSession(userId, deleteFiles = true) {
    if (this.sessions.has(userId)) {
      const session = this.sessions.get(userId);
      try {
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
