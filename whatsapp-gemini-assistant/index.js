require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { exec } = require('child_process');
const path = require('path');
const GeminiService = require('./geminiService');

const gemini = new GeminiService();

const triggerPrefix = (process.env.TRIGGER_PREFIX || '!ai').toLowerCase();
const autoReplyDM = (process.env.AUTO_REPLY_DM || 'true').toLowerCase() === 'true';
const enableGroups = (process.env.ENABLE_GROUPS || 'true').toLowerCase() === 'true';
const botName = process.env.BOT_NAME || 'Gemini Assistant';

console.log('='.repeat(55));
console.log(`🤖 Starting ${botName} for WhatsApp...`);
console.log(`📡 Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
console.log(`⚡ Auto-reply 1-on-1 chats: ${autoReplyDM}`);
console.log(`💬 Group chats enabled: ${enableGroups} (Prefix: "${triggerPrefix}")`);
console.log('='.repeat(55));

const fs = require('fs');

function getBrowserExecutablePath() {
  const candidatePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const browserPath of candidatePaths) {
    if (fs.existsSync(browserPath)) {
      console.log(`🌐 Using browser: ${browserPath}`);
      return browserPath;
    }
  }
  return undefined;
}

const browserPath = getBrowserExecutablePath();

// Clean up any stale Chrome lockfiles from previous crashes or ungraceful exits
try {
  const sessionDir = path.resolve('./.wwebjs_auth/session');
  if (fs.existsSync(sessionDir)) {
    ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'].forEach((f) => {
      const lockPath = path.join(sessionDir, f);
      if (fs.existsSync(lockPath)) {
        try { fs.unlinkSync(lockPath); } catch (_) {}
      }
    });
  }
} catch (_) {}

// Initialize WhatsApp Web Client with persistent local session
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
    ...(browserPath ? { executablePath: browserPath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--headless=new'
    ]
  }
});

let browserOpened = false;
let latestQrDataUrl = null;
let isClientReady = false;

// Display QR Code on terminal and open a clean web page in browser for easy scanning
client.on('qr', async (qr) => {
  try {
    const dataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
    latestQrDataUrl = dataUrl;
    const qrHtmlPath = path.join(__dirname, 'scan-qr.html');
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WhatsApp Gemini Assistant - Link Device</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #111b21;
      color: #e9edef;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #202c33;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      text-align: center;
      max-width: 440px;
      width: 100%;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 12px 0;
      color: #25d366;
    }
    p {
      color: #8696a0;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      display: inline-block;
      margin: 8px 0 20px 0;
    }
    img {
      display: block;
      width: 320px;
      height: 320px;
    }
    .steps {
      text-align: left;
      background: #111b21;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 13px;
      color: #aebac1;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 6px;
    }
  </style>
  <script>
    setTimeout(() => location.reload(), 18000);
  </script>
</head>
<body>
  <div class="card">
    <h1>Link WhatsApp Assistant</h1>
    <p>Point your phone camera at this QR code to connect:</p>
    <div class="qr-container">
      <img src="${dataUrl}" alt="WhatsApp QR Code" />
    </div>
    <div class="steps">
      <ol>
        <li>Open <b>WhatsApp</b> on your phone</li>
        <li>Tap <b>Settings</b> (or <b>⋮ Menu</b>)</li>
        <li>Select <b>Linked Devices</b> &gt; <b>Link a Device</b></li>
        <li>Scan the QR code above</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(qrHtmlPath, htmlContent);

    if (!browserOpened) {
      browserOpened = true;
      if (process.platform === 'win32') {
        exec(`start "" "${qrHtmlPath}"`);
      } else if (process.platform === 'darwin') {
        exec(`open "${qrHtmlPath}"`);
      } else if (process.platform === 'linux' && process.env.DISPLAY) {
        exec(`xdg-open "${qrHtmlPath}"`);
      }
      console.log(`\n🌐 Saved QR code HTML to: ${qrHtmlPath}`);
    } else {
      console.log(`\n🔄 QR code updated in browser: ${qrHtmlPath}`);
    }
  } catch (err) {
    console.error('Error generating browser QR:', err.message);
  }

  console.log('\n📲 QR CODE (Scan from browser or terminal):\n');
  qrcodeTerminal.generate(qr, { small: true });
  console.log('\nSteps: Open WhatsApp on phone -> Settings -> Linked Devices -> Link a Device\n');
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated successfully!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failure:', msg);
});

client.on('ready', () => {
  isClientReady = true;
  latestQrDataUrl = null;
  console.log(`\n🎉 ${botName} is ONLINE and ready to receive messages!`);
  console.log('Try sending a WhatsApp message to this number or ask questions with "!ai <prompt>"\n');
});

const botSentMessageIds = new Set();

client.on('message_create', async (msg) => {
  try {
    // Ignore status broadcasts
    if (msg.from === 'status@broadcast') return;

    // Ignore messages sent by the bot itself
    if (botSentMessageIds.has(msg.id._serialized)) {
      botSentMessageIds.delete(msg.id._serialized);
      return;
    }

    const myId = client.info?.wid?._serialized || client.info?.me?._serialized;
    const isSelfChat = msg.fromMe && (
      (myId && (msg.to === myId || msg.from === myId)) ||
      msg.to === msg.from
    );

    // If message is sent by the user, ONLY process if it's sent to themselves (Notes / Message yourself)
    // This ensures the bot doesn't answer when you are talking to another person
    if (msg.fromMe && !isSelfChat) {
      return;
    }

    // Determine target chat ID safely
    const targetChatId = isSelfChat ? (msg.to || msg.from) : (msg.fromMe ? msg.to : msg.from);
    const isGroup = (targetChatId || '').endsWith('@g.us');
    const body = (msg.body || '').trim();

    // Safely attempt to get chat object for metadata, but never crash if WhatsApp Web evaluate fails
    let chat = null;
    try {
      chat = await msg.getChat();
    } catch (_) {}

    const senderDisplay = chat?.name || (isSelfChat ? 'You (Self)' : msg.from);
    console.log(`\n📩 [Message Received] from: ${senderDisplay} | text: "${body}"`);

    // Check reset command
    if (body.toLowerCase() === '!reset' || body.toLowerCase() === '/reset' || body.toLowerCase() === '!clear') {
      gemini.resetHistory(targetChatId);
      const sent = await client.sendMessage(targetChatId, '🧹 *Chat memory cleared!* We are starting fresh.');
      if (sent && sent.id) botSentMessageIds.add(sent.id._serialized);
      return;
    }

    // Help command
    if (body.toLowerCase() === '!help') {
      const helpMsg = `🤖 *${botName} Commands:*\n\n` +
        `• Send any text or photo to chat with Gemini\n` +
        `• \`${triggerPrefix} <question>\` - Ask a question (required in groups)\n` +
        `• Send a photo with a caption to analyze images\n` +
        `• \`!reset\` - Clear previous conversation memory\n` +
        `• \`!help\` - Show this guide`;
      const sent = await client.sendMessage(targetChatId, helpMsg);
      if (sent && sent.id) botSentMessageIds.add(sent.id._serialized);
      return;
    }

    let shouldRespond = false;
    let queryText = body;

    if (isGroup) {
      if (enableGroups && body.toLowerCase().startsWith(triggerPrefix)) {
        shouldRespond = true;
        queryText = body.slice(triggerPrefix.length).trim();
      }
    } else {
      // 1-on-1 Direct Message or Self Chat
      if (autoReplyDM || isSelfChat) {
        shouldRespond = true;
        if (body.toLowerCase().startsWith(triggerPrefix)) {
          queryText = body.slice(triggerPrefix.length).trim();
        }
      } else if (body.toLowerCase().startsWith(triggerPrefix)) {
        shouldRespond = true;
        queryText = body.slice(triggerPrefix.length).trim();
      }
    }

    if (!shouldRespond) return;

    // Check for media (e.g. photos, screenshots, documents)
    let mediaPayload = null;
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.data && media.mimetype) {
          mediaPayload = {
            mimetype: media.mimetype,
            data: media.data
          };
          console.log(`📷 [Media] Image received (${media.mimetype})`);
        }
      } catch (mediaErr) {
        console.warn(`[Media Download Error]`, mediaErr.message);
      }
    }

    // Skip if completely empty
    if (!queryText && !mediaPayload) return;

    console.log(`🤖 [Gemini] Thinking... generating reply for: "${queryText.substring(0, 50)}"`);

    // Show WhatsApp typing indicator if supported
    if (chat && typeof chat.sendStateTyping === 'function') {
      try { await chat.sendStateTyping(); } catch (_) {}
    }

    // Generate AI response
    const reply = await gemini.generateResponse(targetChatId, queryText, mediaPayload);

    // Clear typing indicator & reply
    if (chat && typeof chat.clearState === 'function') {
      try { await chat.clearState(); } catch (_) {}
    }
    const sent = await client.sendMessage(targetChatId, reply);
    if (sent && sent.id) {
      botSentMessageIds.add(sent.id._serialized);
    }
    console.log(`✅ [Gemini] Reply sent to ${senderDisplay}!\n`);

  } catch (error) {
    console.error('❌ [Error handling message]:', error);
  }
});

client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Loading WhatsApp: ${percent}% - ${message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});

client.initialize().catch((err) => {
  console.error('❌ [Client Initialization Error]:', err);
});

// Automatically dismiss any "What's new" or intro popups that WhatsApp Web shows
setInterval(async () => {
  try {
    if (client.pupPage && !client.pupPage.isClosed()) {
      await client.pupPage.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, div[role="button"], span'));
        for (const el of elements) {
          const text = (el.textContent || '').trim().toLowerCase();
          if (text === 'continue' || text === 'got it' || text === 'ok') {
            el.click();
            break;
          }
        }
        const x = document.querySelector('span[data-icon="x"]');
        if (x) x.click();
      });
    }
  } catch (_) {}
}, 3000);

// Built-in HTTP server for cloud deployments (Render port-binding, UptimeRobot health check, and QR view)
const http = require('http');
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: isClientReady ? 'online' : 'connecting',
      ready: isClientReady,
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
          <div class="badge">● ONLINE & ACTIVE</div>
          <h1>WhatsApp Gemini Assistant</h1>
          <p>The bot is authenticated and listening for incoming messages 24/7 on WhatsApp.</p>
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
        <meta http-equiv="refresh" content="15">
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
          <p class="note">Page automatically refreshes every 15s</p>
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
      <meta http-equiv="refresh" content="5">
      <title>Starting WhatsApp Assistant...</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #111b21; color: #e9edef; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #202c33; padding: 32px; border-radius: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>WhatsApp Assistant is starting up...</h2>
        <p style="color:#8696a0;">Please wait, page will refresh automatically in 5s.</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Web service listening on port ${PORT}`);
});


