/**
 * instagramService.js
 * 
 * Danam Holdings & SoloDeveloper Instagram AI Agent & DM / Comment Automation Engine
 * Architecture: Meta Official Instagram Graph API (v19.0) + Google Gemini AI + WhatsApp Bridge
 * Operating Cost: ₹0 (100% Free Tier Compliant)
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const GeminiService = require('./geminiService');
const builderCustomerMemory = require('./builderCustomerMemory');
const personaManager = require('./personaManager');

// Environment configuration
const INSTA_PAGE_ACCESS_TOKEN = process.env.INSTA_PAGE_ACCESS_TOKEN || '';
const INSTA_VERIFY_TOKEN = process.env.INSTA_VERIFY_TOKEN || 'DANAM_INSTA_VERIFY_TOKEN_2026';
const N8N_WEBHOOK_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';
const BUILDER_PHONE = '919361599097'; // Er. Dhilip Kumar

// Storage file for Instagram construction enquiries
const ENQUIRIES_FILE = path.resolve(__dirname, 'data', 'construction_enquiries.json');

// Initialize Gemini Service
let geminiInstance = null;
function getGemini() {
  if (!geminiInstance) {
    geminiInstance = new GeminiService();
  }
  return geminiInstance;
}

// ---------------------------------------------------------------------------
// DEDUPLICATION & LOOP GUARDS
// ---------------------------------------------------------------------------
const processedCommentIds = new Set();
const processedMessageIds = new Set();
const recentCommentReplies = new Map(); // commentId -> timestamp

function recordProcessedComment(commentId) {
  if (!commentId) return;
  processedCommentIds.add(commentId);
  if (processedCommentIds.size > 2000) {
    const first = processedCommentIds.values().next().value;
    processedCommentIds.delete(first);
  }
}

function recordProcessedMessage(msgId) {
  if (!msgId) return;
  processedMessageIds.add(msgId);
  if (processedMessageIds.size > 2000) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
}

function isDuplicateComment(commentId) {
  if (!commentId) return false;
  if (processedCommentIds.has(commentId)) return true;
  recordProcessedComment(commentId);
  return false;
}

function isDuplicateMessage(msgId) {
  if (!msgId) return false;
  if (processedMessageIds.has(msgId)) return true;
  recordProcessedMessage(msgId);
  return false;
}

// ---------------------------------------------------------------------------
// 1. WEBHOOK VERIFICATION ENDPOINT (GET)
// ---------------------------------------------------------------------------
function handleVerification(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const mode = urlObj.searchParams.get('hub.mode');
  const token = urlObj.searchParams.get('hub.verify_token');
  const challenge = urlObj.searchParams.get('hub.challenge');

  console.log(`🔍 [Instagram Webhook Verification] Mode: ${mode}, Token: ${token ? 'PROVIDED' : 'MISSING'}`);

  if (mode === 'subscribe' && token === INSTA_VERIFY_TOKEN) {
    console.log('✅ [Instagram Webhook] Successfully verified by Meta!');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(challenge);
  }

  console.warn('❌ [Instagram Webhook] Verification failed: Token mismatch or invalid mode.');
  res.writeHead(403, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Forbidden: Verification token mismatch' }));
}

// ---------------------------------------------------------------------------
// 2. INCOMING EVENT DISPATCHER (POST)
// ---------------------------------------------------------------------------
async function handleWebhookEvent(req, res, sock = null) {
  let body = '';
  let bodySize = 0;
  const MAX_SIZE = 100 * 1024; // 100KB

  req.on('data', chunk => {
    bodySize += chunk.length;
    if (bodySize > MAX_SIZE) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload too large' }));
      req.destroy();
    } else {
      body += chunk;
    }
  });

  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');

      // Acknowledge Meta immediately with 200 OK to avoid timeout & retries
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');

      if (payload.object === 'instagram') {
        for (const entry of (payload.entry || [])) {
          // A. Process Direct Messages (DMs)
          if (Array.isArray(entry.messaging)) {
            for (const event of entry.messaging) {
              if (event.message && !event.message.is_echo && event.message.text && String(event.sender?.id) !== INSTA_BUSINESS_ACCOUNT_ID) {
                const msgId = event.message.mid || `${event.sender?.id}_${event.timestamp}`;
                if (!isDuplicateMessage(msgId)) {
                  await handleIncomingDM(event.sender.id, event.message.text, sock, event);
                }
              }
            }
          }

          // B. Process Reel / Post Comments
          if (Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'comments' && change.value) {
                const commentId = change.value.id;
                if (!isDuplicateComment(commentId)) {
                  await handleReelComment(change.value, sock);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ [Instagram Webhook Error]:', err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// 3. REEL / POST COMMENT PROCESSING & AUTO-DM TRIGGER (MULTI-PERSONA)
// ---------------------------------------------------------------------------
const PERSONA_COMMENT_TEMPLATES = {
  dev: {
    publicReplies: [
      'நன்றி ப்ரோ! உங்கள் DM-ல் Website & AI Automation முழு விபரங்களையும் அனுப்பியுள்ளோம் 📩⚡',
      'Hi! Sent full pricing, portfolio & live demo link directly to your DM 🚀 Check inbox!',
      'நன்றி! SoloDeveloper.pro சார்பாக உங்கள் DM-ல் முழு விபரங்களைப் பகிர்ந்துள்ளோம் 💻✨',
      'Check your DM! Sent our 7-Day Website & 24/7 AI Agent details right now 📩🔥'
    ],
    buildPrivateDm: (fromUser) => `வணக்கம் @${fromUser}! SoloDeveloper.pro (Suresh Kumar — AI & Web Automation) 💻⚡
நீங்கள் எங்கள் இன்ஸ்டா பதிவில் கேட்ட விபரங்கள்:
• Modern 3D / Business Website: ₹8,999 முதல் (7 நாட்களில் Delivery)
• 24/7 WhatsApp & Instagram AI Agent + CRM: ₹19,999 முதல்
• Live Portfolio: https://solodeveloper.pro

உங்கள் பிசினஸ் என்ன பிரிவு சார்? Website வேண்டுமா அல்லது AI Chatbot Automation வேண்டுமா?`
  },
  builder: {
    publicReplies: [
      'நன்றி சார்! உங்கள் DM-ல் முழு விபரங்களையும் அனுப்பியுள்ளோம், தயவுசெய்து செக் செய்யவும் 📩',
      'வணக்கம் சார்! இந்த எலிவேஷன் மற்றும் பிளான் விபரங்களை உங்கள் DM-க்கு அனுப்பியுள்ளோம் 🙏',
      'நன்றி! Danam Holdings சார்பாக உங்கள் DM-ல் முழு விபரங்களைப் பகிர்ந்துள்ளோம் 🏡',
      'வணக்கம்! உங்கள் கேள்விகளுக்கான முழு பிளான் மற்றும் விலை விபரங்கள் உங்கள் DM-க்கு அனுப்பப்பட்டுள்ளது ✨',
      'நன்றி சார்! உங்கள் வீட்டுக் கனவிற்கான முழு விபரங்களும் உங்கள் DM-ல் உள்ளன, பார்க்கவும் 📩'
    ],
    buildPrivateDm: (fromUser) => `வணக்கம் @${fromUser} சார்! Danam Holdings Civil Engineering & Turnkey EPC 🏡.
நீங்கள் எங்கள் இன்ஸ்டா ரீல் பதிவில் கேட்ட வீடு கட்டும் விபரங்கள்:
• Standard Package: ₹1,850 – ₹1,950 / Sq.Ft
• Premium Luxury Package: ₹2,250 – ₹2,350 / Sq.Ft
• Elite Royal Villa: ₹2,750 – ₹2,950 / Sq.Ft

உங்கள் இடம் மதுரை அல்லது சுற்றியுள்ள எந்தப் பகுதியில் உள்ளது சார்? மற்றும் Plot அளவு (cents / Sq.Ft) என்ன சார்?`
  },
  restaurant: {
    publicReplies: [
      'வணக்கம்! இன்றைய தாஜ் ஹோட்டல் பிரியாணி மெனு & ஆர்டர் விபரங்கள் உங்கள் DM-க்கு அனுப்பப்பட்டுள்ளது 🍗📩',
      'நன்றி சார்! உங்கள் DM-ல் லைவ் மெனு மற்றும் Skip-the-Line டோக்கன் விபரங்களைப் பகிர்ந்துள்ளோம் 🙏✨'
    ],
    buildPrivateDm: (fromUser) => `வணக்கம் @${fromUser}! மதுரை தாஜ் ஹோட்டல் (Authentic Seeraga Samba Dum Biryani) 🍗✨
• Chicken Biryani: ₹190 | Mutton Biryani: ₹290 | Fish Biryani: ₹270
• 10 வினாடியில் Counter Pickup செய்ய Digital Token வசதி உள்ளது!

எத்தனை பார்சல் வேண்டும் சார்? உங்கள் WhatsApp நம்பர் பகிருங்கள், உடனே டோக்கன் அனுப்புகிறோம்!`
  },
  wholesale: {
    publicReplies: [
      'வணக்கம் அண்ணா! இன்றைய Gold Winner ஹோல்சேல் பாக்ஸ் விலை பட்டியல் உங்கள் DM-ல் அனுப்பியுள்ளோம் 📦📩',
      'நன்றி! அண்ணாமலையார் ஆயில் ஸ்டோர் (மாட்டுத்தாவணி) விலை விபரங்கள் உங்கள் DM-ல் உள்ளன 🙏'
    ],
    buildPrivateDm: (fromUser) => `வணக்கம் @${fromUser} அண்ணா! அண்ணாமலையார் ஆயில் ஸ்டோர், மாட்டுத்தாவணி 📦
• Gold Winner 1L Box (10 pouches): ₹1,420
• 15Ltr Tin: ₹2,180 | 15Kg Bulk Tin: ₹2,420
• குறைந்தபட்சம் 1 பாக்ஸ் / 1 டின் கூட ஆர்டர் செய்யலாம்!

எத்தனை பாக்ஸ் தேவைப்படுகிறது அண்ணா? உங்கள் கடை ஊர் & WhatsApp நம்பர் சொல்லுங்க!`
  }
};

const INSTA_BUSINESS_ACCOUNT_ID = process.env.INSTA_BUSINESS_ACCOUNT_ID || '17841471872515616';
const INSTA_OWN_USERNAME = (process.env.INSTA_OWN_USERNAME || 'solodeveloper.pro').toLowerCase();

async function handleReelComment(commentData, sock = null) {
  const commentId = commentData.id;
  const commentText = commentData.text || '';
  const fromId = String(commentData.from?.id || '');
  const fromUser = commentData.from?.username || 'Client';

  // Self-comment loop guard: ignore comments posted by our own Instagram Business Account
  if (fromId === INSTA_BUSINESS_ACCOUNT_ID || fromUser.toLowerCase() === INSTA_OWN_USERNAME) {
    console.log(`🛡️ [Instagram Loop Guard] Ignored own reply/comment from @${fromUser} (${commentId})`);
    return { skipped: true, reason: 'self_comment_guard' };
  }

  const activeMode = personaManager.getActiveMode() || 'dev';
  const template = PERSONA_COMMENT_TEMPLATES[activeMode] || PERSONA_COMMENT_TEMPLATES.dev;

  recordProcessedComment(commentId);

  console.log(`💬 [Instagram Comment from @${fromUser}] (Mode: ${activeMode}): "${commentText}" (ID: ${commentId})`);

  // Step 1: Public Reply to Comment (Rotating variations to comply with Meta anti-spam rules)
  const chosenReply = template.publicReplies[Math.floor(Math.random() * template.publicReplies.length)];
  const pubResult = await sendPublicCommentReply(commentId, chosenReply);
  console.log(`📢 [Public Reply Sent to @${fromUser}]: "${chosenReply}" (Result: ${pubResult.success ? 'Success' : 'Simulated/Error'})`);

  // Step 2: Private DM Triggered from Comment (Dynamic per Active Persona)
  const privateDmGreeting = template.buildPrivateDm(fromUser);

  const privResult = await sendPrivateDMByComment(commentId, privateDmGreeting);
  console.log(`📩 [Private DM Triggered for @${fromUser}]: (Result: ${privResult.success ? 'Success' : 'Simulated/Error'})`);

  // Check if commenter included phone number directly in comment
  const phone = extractPhoneNumber(commentText);
  if (phone) {
    console.log(`🎯 [Instagram Comment Lead Capture] Phone detected in comment: ${phone}`);
    await bridgeLeadToWhatsApp({
      source: 'Instagram Comment',
      username: fromUser,
      commentId,
      phone,
      commentText,
      activeMode
    }, sock);
  }

  return { activeMode, publicReply: chosenReply, privateDm: privateDmGreeting, pubResult, privResult };
}

// ---------------------------------------------------------------------------
// 4. INCOMING DIRECT MESSAGE (DM) PROCESSING WITH GEMINI
// ---------------------------------------------------------------------------
async function handleIncomingDM(senderId, userText, sock = null, rawEvent = null) {
  const activeMode = personaManager.getActiveMode() || 'builder';
  // Scope chatId per persona so switching modes in live demos starts a clean, unmixed conversation!
  const chatId = `insta_${activeMode}_${senderId}`;
  console.log(`📩 [Instagram DM from ${senderId}] (Active Mode: ${activeMode}): "${userText}"`);

  // 1. Update builder customer memory only when in builder mode
  let profile = {};
  if (activeMode === 'builder') {
    builderCustomerMemory.updateFromMessage(chatId, userText);
    profile = builderCustomerMemory.getProfile(chatId);
  }

  // 2. Check if user provided their WhatsApp phone number in this message
  const detectedPhone = extractPhoneNumber(userText);
  if (detectedPhone && !profile.customer_phone) {
    if (activeMode === 'builder') {
      profile.customer_phone = detectedPhone;
      builderCustomerMemory.saveProfiles();
    }
    console.log(`🎯 [Instagram Phone Captured] (${activeMode}): ${detectedPhone} from user ${senderId}`);

    // Bridge lead to WhatsApp CRM and trigger automated welcome
    await bridgeLeadToWhatsApp({
      source: 'Instagram DM',
      activeMode,
      instagramSenderId: senderId,
      phone: detectedPhone,
      profile,
      userText
    }, sock);
  }

  // 3. Generate response using Gemini Engine (automatically uses activeMode from personaManager!)
  const gemini = getGemini();
  let replyText = '';

  try {
    replyText = await gemini.generateResponse(chatId, userText, null, {
      platform: 'instagram',
      senderId: senderId
    });
  } catch (err) {
    console.error('❌ [Gemini Error on Instagram DM]:', err.message);
    const fallbacks = {
      builder: `வணக்கம் சார்! Danam Holdings Civil Engineering & Turnkey EPC 🏡.\nஎங்கள் Chief Engineer Er. Dhilip Kumar: +91 93615 99097.\nஉங்கள் Plot விபரங்கள் மற்றும் WhatsApp எண்ணைப் பகிருங்கள் சார்!`,
      restaurant: `வணக்கம்! மதுரை தாஜ் ஹோட்டல் 🍗✨ Chicken Biryani ₹190 | Mutton Biryani ₹290. ஆர்டர் செய்ய உங்கள் விருப்பத்தை அனுப்புங்கள்!`,
      wholesale: `வணக்கம் அண்ணா! அண்ணாமலையார் ஆயில் ஸ்டோர், மாட்டுத்தாவணி 📦 Gold Winner 1L Box ₹1,420 | 15Kg Tin ₹2,420. எத்தனை பாக்ஸ் வேண்டும்?`,
      dev: `வணக்கம்! SoloDeveloper.pro ⚡ Modern Websites from ₹8,999 & 24/7 AI Agents from ₹19,999. நேரடி தொடர்புக்கு: +91 93615 99097 (https://solodeveloper.pro)`
    };
    replyText = fallbacks[activeMode] || fallbacks.dev;
  }

  // 4. Builder-specific WhatsApp CTA when plot requirements are known but phone is missing
  if (activeMode === 'builder' && profile.plot_size && profile.location && !profile.customer_phone) {
    if (!replyText.toLowerCase().includes('whatsapp') && !replyText.includes('வாட்ஸ்அப்') && !replyText.includes('எண்')) {
      replyText += `\n\nசார், உங்கள் ${profile.plot_size} Plot-க்கு ஏற்ற 2D Floor Plan மற்றும் 3D Elevation மாதிரிகளை உடனே உங்கள் வாட்ஸ்அப்பிற்கு அனுப்பலாமா? உங்கள் WhatsApp Mobile Number பகிருங்கள் சார்!`;
    }
  }

  // 5. Send reply back to customer via Meta Send API
  const sendRes = await sendInstagramDM(senderId, replyText);
  console.log(`📤 [Instagram DM Reply Sent to ${senderId}] (Mode: ${activeMode}, Length: ${replyText.length} chars)`);

  return { activeMode, replyText, sendRes };
}

// ---------------------------------------------------------------------------
// 5. INSTAGRAM-TO-WHATSAPP FUNNEL BRIDGE
// ---------------------------------------------------------------------------
async function bridgeLeadToWhatsApp(leadData, sock = null) {
  const phone = leadData.phone;
  let cleanDigits = (phone || '').replace(/\D/g, '');
  if (cleanDigits.length === 10) {
    cleanDigits = '91' + cleanDigits;
  }

  const profile = leadData.profile || {};
  const customerName = leadData.username || profile.customer_name || 'Instagram Prospect';
  const location = profile.location || 'Madurai';
  const plotSize = profile.plot_size || 'Requirement Shared in DM';
  const timestamp = new Date().toISOString();

  console.log(`🌉 [Instagram-to-WhatsApp Bridge Triggered] Customer Phone: ${cleanDigits}`);

  // Step 1: Save Lead to Local construction_enquiries.json
  try {
    let enquiries = [];
    if (fs.existsSync(ENQUIRIES_FILE)) {
      enquiries = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf-8') || '[]');
    }
    const newEnquiry = {
      id: `INSTA-${Date.now().toString().slice(-6)}`,
      timestamp,
      channel: 'Instagram',
      customerName,
      customerPhone: cleanDigits,
      siteLocation: location,
      plotSize,
      plotType: profile.plot_type || 'unspecified',
      status: 'NEW_LEAD',
      notes: leadData.commentText || leadData.userText || 'Captured from Instagram'
    };
    enquiries.push(newEnquiry);
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(enquiries, null, 2), 'utf-8');
    console.log(`💾 [Lead Logged] Saved enquiry #${newEnquiry.id} to construction_enquiries.json`);
  } catch (err) {
    console.error('❌ Failed to write lead to construction_enquiries.json:', err.message);
  }

  // Step 2: Send WhatsApp Portfolio Welcome to Homeowner
  const homeownerWelcome = `வணக்கம் ${customerName} சார்! 🏡✨
Danam Holdings Civil Engineering & Turnkey EPC, மதுரை.

நீங்கள் எங்கள் Instagram பக்கத்தில் கேட்ட வீடு கட்டும் விபரங்களுக்கான 2D Floor Plan மற்றும் Elevation மாதிரிகள்:
• Standard Package: ₹1,850 – ₹1,950 / Sq.Ft
• Premium Luxury: ₹2,250 – ₹2,350 / Sq.Ft
• Elite Royal Villa: ₹2,750 – ₹2,950 / Sq.Ft

📍 உங்கள் இடம்: ${location}
📐 Plot விபரம்: ${plotSize}

எங்கள் Chief Engineer Er. Dhilip Kumar அவர்கள் விரைவில் உங்களைத் தொடர்பு கொண்டு இலவச Site & Soil Inspection ஏற்பாடு செய்வார்.
முழு விபரங்களுக்கு: https://danamholdings.com`;

  if (sock && sock.user && cleanDigits) {
    try {
      const recipientJid = `${cleanDigits}@s.whatsapp.net`;
      await sock.sendMessage(recipientJid, { text: homeownerWelcome });
      console.log(`✅ [WhatsApp Outbound] Welcome quotation sent to customer ${recipientJid}`);
    } catch (err) {
      console.error('⚠️ Could not send WhatsApp via Baileys sock:', err.message);
    }
  }

  // Step 3: Send VIP Alert to Chief Engineer (Er. Dhilip Kumar)
  const engineerAlert = `🚨 *NEW INSTAGRAM LEAD CONVERTED!* 📸➔💬
━━━━━━━━━━━━━━━━━━━━━━
👤 *Client:* ${customerName}
📱 *Phone:* +${cleanDigits}
📍 *Location:* ${location}
📐 *Plot:* ${plotSize}
🌐 *Source:* ${leadData.source || 'Instagram'}
━━━━━━━━━━━━━━━━━━━━━━
👉 *Quick WhatsApp Chat:* https://wa.me/${cleanDigits}
👉 *Direct Call:* tel:${cleanDigits}`;

  if (sock && sock.user) {
    try {
      const engineerJid = `${BUILDER_PHONE}@s.whatsapp.net`;
      await sock.sendMessage(engineerJid, { text: engineerAlert });
      console.log(`🚨 [VIP Alert] Dispatched lead alert to Chief Engineer (+${BUILDER_PHONE})`);
    } catch (err) {
      console.error('⚠️ Could not send Engineer WhatsApp alert:', err.message);
    }
  }

  // Step 4: Forward to n8n Webhook for Sheets Logging
  forwardLeadToN8n({
    customerName,
    customerPhone: cleanDigits,
    siteLocation: location,
    plotSize,
    channel: 'Instagram',
    timestamp
  });
}

function forwardLeadToN8n(payload) {
  try {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: N8N_WEBHOOK_HOST,
      port: 443,
      path: '/webhook/construction-enquiry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      console.log(`📡 [n8n Webhook Forward] Status: ${res.statusCode}`);
    });

    req.on('error', (err) => {
      console.warn(`ℹ️ [n8n Forward Notice]: Could not reach ${N8N_WEBHOOK_HOST} (${err.message}). Local lead safely preserved.`);
    });

    req.write(postData);
    req.end();
  } catch (e) {
    console.error('Error forwarding lead to n8n:', e.message);
  }
}

// ---------------------------------------------------------------------------
// 6. HELPER FUNCTIONS: PHONE EXTRACTION & META API CALLS
// ---------------------------------------------------------------------------
function extractPhoneNumber(text = '') {
  if (!text) return null;
  // Match 10-digit Indian numbers with optional country code or separators
  const phoneRegex = /(?:(?:\+?91[\s-]?)?[6-9]\d{9})\b/g;
  const matches = text.match(phoneRegex);
  if (matches && matches.length > 0) {
    let clean = matches[0].replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      clean = clean.slice(2);
    }
    if (clean.length === 10) {
      return clean;
    }
  }
  return null;
}

function sendInstagramDM(recipientId, text) {
  return callMetaGraphApi('/me/messages', {
    recipient: { id: recipientId },
    message: { text: text }
  });
}

function sendPrivateDMByComment(commentId, text) {
  return callMetaGraphApi('/me/messages', {
    recipient: { comment_id: commentId },
    message: { text: text }
  });
}

function sendPublicCommentReply(commentId, text) {
  return callMetaGraphApi(`/${commentId}/replies`, {
    message: text
  });
}

function callMetaGraphApi(endpoint, payload, method = 'POST') {
  return new Promise((resolve) => {
    const token = process.env.INSTA_PAGE_ACCESS_TOKEN || INSTA_PAGE_ACCESS_TOKEN;
    // If token is missing or placeholder, run in simulation mode so tests & local runs succeed
    if (!token || token.includes('your_') || token === '') {
      console.log(`ℹ️ [Meta Graph API - Simulation Mode] Endpoint: ${endpoint}`);
      return resolve({
        success: true,
        simulated: true,
        endpoint,
        recipient: payload.recipient,
        timestamp: new Date().toISOString()
      });
    }

    // Auto-detect Instagram Login token (IGA...) vs Facebook Page token (EAA...)
    const isInstagramLoginToken = token.startsWith('IG');
    const apiHost = isInstagramLoginToken ? 'graph.instagram.com' : 'graph.facebook.com';
    const apiVersion = 'v21.0';

    const postData = JSON.stringify(payload);
    const options = {
      hostname: apiHost,
      port: 443,
      path: `/${apiVersion}${endpoint}?access_token=${encodeURIComponent(token)}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: parsed });
          } else {
            console.error(`❌ [Meta Graph API Error ${res.statusCode}]:`, parsed);
            resolve({ success: false, error: parsed, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ [Meta Graph API Network Error]:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

function getStatus() {
  return {
    engine: 'instagram-graph-api-v19.0',
    hasToken: Boolean(INSTA_PAGE_ACCESS_TOKEN && !INSTA_PAGE_ACCESS_TOKEN.includes('your_')),
    verifyToken: INSTA_VERIFY_TOKEN,
    webhookEndpoint: '/webhook/instagram',
    processedComments: processedCommentIds.size,
    processedMessages: processedMessageIds.size,
    simulationMode: !Boolean(INSTA_PAGE_ACCESS_TOKEN && !INSTA_PAGE_ACCESS_TOKEN.includes('your_')),
    costPerMessage: '₹0 (Meta Free Direct Message Tier)'
  };
}

module.exports = {
  handleVerification,
  handleWebhookEvent,
  handleReelComment,
  handleIncomingDM,
  bridgeLeadToWhatsApp,
  extractPhoneNumber,
  sendInstagramDM,
  sendPublicCommentReply,
  sendPrivateDMByComment,
  callMetaGraphApi,
  getStatus
};
