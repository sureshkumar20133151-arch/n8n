/**
 * instagramService.js
 * 
 * Danam Holdings & SoloDeveloper Instagram AI Agent & DM / Comment Automation Engine
 * Architecture: Meta Official Instagram Graph API (v19.0) + Google Gemini AI + WhatsApp Bridge
 * Operating Cost: ₹0 (100% Free Tier Compliant)
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const GeminiService = require('./geminiService');
const builderCustomerMemory = require('./builderCustomerMemory');
const personaManager = require('./personaManager');
const channelControls = require('./channelControls');
const proFeatures = require('./instagramProFeatures');

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
// DEDUPLICATION, CONCURRENCY LOCKS & LOOP GUARDS (MATCHING WHATSAPP AGENT)
// ---------------------------------------------------------------------------
const processedCommentIds = new Set();
const processedMessageIds = new Set();
const activeInstaLocks = new Set();
const recentInstaMessages = new Map(); // senderId -> { text, timestamp }
const optedOutUsers = new Set(); // Users who sent STOP / unsubscribe

function isDummyPhoneNumber(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 10) return true;
  return /^(91)?(98765\d{5}|12345\d{5}|00000\d{5}|11111\d{5}|99999\d{5}|0{10}|1{10})/.test(digits) ||
         digits.startsWith('91000000') ||
         digits === '910000000000' ||
         digits === '0000000000';
}

// Zero-Sinhala / Zero-Malayalam Sanitizer + Instagram DM Cleaner (No ugly raw Markdown)
function sanitizeAndFormatForInstagram(text = '') {
  if (!text) return '';
  let clean = String(text)
    // Strip any accidental Sinhala (\u0D80-\u0DFF) or Malayalam (\u0D00-\u0D7F) characters
    .replace(/[\u0D80-\u0DFF\u0D00-\u0D7F]/g, '')
    // Replace corrupted Tamil word if LLM ever outputs it
    .replace(/நியமங்களின்படி/g, 'விதிமுறைகளின்படி')
    // Replace awkward Tamil transliterations of English construction terms with clean English script
    .replace(/நான் உங்கள் கன்ஸ்ட்ரக்ஷன் அசிஸ்டன்ட்/g, 'நான் Danam Holdings-இன் AI Assistant')
    .replace(/3D\s*ஃப்ளோர்\s*பிளான்\s*டிசைனிங்/g, '2D Floor Plan & 3D Elevation Design')
    .replace(/கன்ஸ்ட்ரக்ஷன்/g, 'Construction')
    .replace(/அசிஸ்டன்ட்/g, 'Assistant')
    .replace(/இன்டிபென்டன்ட்/g, 'Independent')
    .replace(/ஃப்ளோர்\s*பிளான்/g, 'Floor Plan')
    .replace(/டிசைனிங்/g, 'Design')
    .replace(/பிளானிங்\s*ஸ்டேஜில்/g, 'திட்டமிடும் கட்டத்தில்')
    // Strip markdown heading hashes and double asterisks (Instagram DM doesn't render Markdown)
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
  return clean;
}

// Meta Instagram DM Hard Limit is 1,000 characters — cleanly split long replies at paragraph/sentence boundaries
function splitForInstagramDM(text = '', maxLen = 950) {
  const clean = sanitizeAndFormatForInstagram(text);
  if (clean.length <= maxLen) return [clean];
  const chunks = [];
  let remaining = clean;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf(' ', maxLen);
    if (splitAt < 1) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function downloadInstagramMedia(url, fallbackMime = 'image/jpeg') {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 4 * 1024 * 1024) return null; // Skip >4MB to protect 512MB RAM
    const contentType = res.headers.get('content-type') || fallbackMime;
    return {
      mimetype: contentType.split(';')[0].trim(),
      data: Buffer.from(arrayBuf).toString('base64'),
      isAudio: contentType.startsWith('audio/'),
      isVideo: contentType.startsWith('video/')
    };
  } catch (err) {
    console.warn('⚠️ [Instagram Media Download Notice]:', err.message);
    return null;
  }
}

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
// 2. INCOMING EVENT DISPATCHER (POST) + HMAC-SHA256 SIGNATURE VERIFICATION
// ---------------------------------------------------------------------------
function verifyMetaSignature(rawBody, signatureHeader) {
  const appSecret = process.env.INSTA_APP_SECRET || '';
  if (!appSecret) return true; // Optional unless INSTA_APP_SECRET is configured
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const sigBuf = Buffer.from(signatureHeader, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

async function handleWebhookEvent(req, res, sock = null) {
  let body = '';
  let bodySize = 0;
  let aborted = false;
  const MAX_SIZE = 100 * 1024; // 100KB

  req.on('error', (err) => {
    aborted = true;
    console.error('❌ [Instagram Webhook Stream Error]:', err.message);
  });

  req.on('data', chunk => {
    if (aborted) return;
    bodySize += chunk.length;
    if (bodySize > MAX_SIZE) {
      aborted = true;
      if (!res.headersSent) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
      }
      req.destroy();
    } else {
      body += chunk;
    }
  });

  req.on('end', async () => {
    if (aborted || res.headersSent) return;
    try {
      // Verify Meta X-Hub-Signature-256 when INSTA_APP_SECRET is configured
      const sigHeader = req.headers['x-hub-signature-256'];
      if (!verifyMetaSignature(body, sigHeader)) {
        console.warn('🛡️ [Security Alert] Rejected Instagram webhook with invalid X-Hub-Signature-256!');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
      }

      const payload = JSON.parse(body || '{}');

      // Acknowledge Meta immediately with 200 OK to avoid timeout & retries
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');

      if (payload.object === 'instagram') {
        for (const entry of (payload.entry || [])) {
          // A. Process Direct Messages (DMs — Text, Images, Voice Notes, Reels & Story Replies!)
          if (Array.isArray(entry.messaging)) {
            for (const event of entry.messaging) {
              const senderId = String(event.sender?.id || '');
              if (!senderId || senderId === INSTA_BUSINESS_ACCOUNT_ID) continue;

              // Postback button click (from Carousel / Ice Breakers)
              if (event.postback && (event.postback.payload || event.postback.title)) {
                const pbId = `pb_${senderId}_${event.timestamp}`;
                if (!isDuplicateMessage(pbId)) {
                  await handleIncomingDM(senderId, event.postback.payload || event.postback.title, sock, event);
                }
                continue;
              }

              if (event.message && !event.message.is_echo) {
                const msgId = event.message.mid || `${senderId}_${event.timestamp}`;
                if (isDuplicateMessage(msgId)) continue;

                let msgText = (event.message.text || '').trim();
                const quickReplyPayload = event.message.quick_reply?.payload || '';
                let mediaPayload = null;

                // Story reply context
                if (event.message.reply_to && event.message.reply_to.story) {
                  msgText = msgText ? `[STORY_REPLY] ${msgText}` : '[STORY_REPLY] Customer replied to our Instagram Story';
                }

                // Multimodal attachments (image / audio / forwarded reel / video / story_mention)
                const attachments = Array.isArray(event.message.attachments) ? event.message.attachments : [];
                if (attachments.length > 0) {
                  const att = attachments[0];
                  const attType = (att.type || '').toLowerCase();
                  const attUrl = att.payload?.url || '';

                  // Feature #6: Story Mention Auto-Thank-You
                  if (attType === 'story_mention') {
                    await handleStoryMention(senderId, att.payload || {});
                    continue;
                  }

                  if (attType === 'image') {
                    mediaPayload = await downloadInstagramMedia(attUrl, 'image/jpeg');
                    if (!msgText) msgText = '[IMAGE_SCREENSHOT_SHARED]';
                  } else if (attType === 'audio') {
                    mediaPayload = await downloadInstagramMedia(attUrl, 'audio/mp4');
                    if (mediaPayload) mediaPayload.isAudio = true;
                    if (!msgText) msgText = '';
                  } else if (attType === 'video' || attType === 'ig_reel' || attType === 'reel' || attType === 'share') {
                    // Feature #1: Smart Forwarded Reel Vision & Caption Reader
                    const reelAnalysis = await proFeatures.analyzeForwardedReelAttachment(att, downloadInstagramMedia);
                    mediaPayload = reelAnalysis.mediaPayload;
                    msgText = msgText ? `${reelAnalysis.reelContextText}\nCustomer Question: "${msgText}"` : reelAnalysis.reelContextText;
                  }
                }

                if (msgText || mediaPayload) {
                  await handleIncomingDM(senderId, msgText, sock, event, { media: mediaPayload, quickReplyPayload });
                }
              }
            }
          }

          // B. Process Reel / Post Comments & Mentions
          if (Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'comments' && change.value) {
                const commentId = change.value.id;
                if (!isDuplicateComment(commentId)) {
                  await handleReelComment(change.value, sock);
                }
              } else if (change.field === 'mentions' && change.value) {
                const mentionId = change.value.comment_id || change.value.media_id || `m_${Date.now()}`;
                if (!isDuplicateComment(`mention_${mentionId}`)) {
                  console.log(`📣 [Instagram Mention Detected]:`, JSON.stringify(change.value));
                  if (change.value.comment_id) {
                    await handleReelComment({
                      id: change.value.comment_id,
                      text: '@solodeveloper.pro mention',
                      media: { id: change.value.media_id },
                      from: { username: 'Follower' }
                    }, sock);
                  }
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

async function handleReelComment(commentData, sock = null, options = {}) {
  const commentId = commentData.id;
  const commentText = commentData.text || '';
  const fromId = String(commentData.from?.id || '');
  const fromUser = commentData.from?.username || 'Client';

  // Self-comment loop guard: ignore comments posted by our own Instagram Business Account
  if (fromId === INSTA_BUSINESS_ACCOUNT_ID || fromUser.toLowerCase() === INSTA_OWN_USERNAME) {
    console.log(`🛡️ [Instagram Loop Guard] Ignored own reply/comment from @${fromUser} (${commentId})`);
    return { skipped: true, reason: 'self_comment_guard' };
  }

  // Channel ON/OFF Toggle Check
  if (!options.bypassToggle && !channelControls.isInstagramCommentEnabled()) {
    console.log(`⏸️ [Instagram Comment Auto-Reply PAUSED] Skipped comment from @${fromUser} (Toggle is OFF)`);
    return { paused: true, activeMode: channelControls.getInstagramPersona(), message: 'Instagram Reel Comment Auto-Reply is currently PAUSED (Toggle is OFF).' };
  }

  const activeMode = channelControls.getInstagramPersona() || 'dev';
  const template = PERSONA_COMMENT_TEMPLATES[activeMode] || PERSONA_COMMENT_TEMPLATES.dev;

  recordProcessedComment(commentId);

  console.log(`💬 [Instagram Comment from @${fromUser}] (Mode: ${activeMode}): "${commentText}" (ID: ${commentId})`);

  // Step 1: Public Reply to Comment (Rotating variations to comply with Meta anti-spam rules)
  const chosenReply = template.publicReplies[Math.floor(Math.random() * template.publicReplies.length)];
  const pubResult = await sendPublicCommentReply(commentId, chosenReply);
  console.log(`📢 [Public Reply Sent to @${fromUser}]: "${chosenReply}" (Result: ${pubResult.success ? 'Success' : 'Simulated/Error'})`);

  // Step 2: Fetch Own Reel/Post Caption for Context-Aware Private DM (Feature #2)
  const mediaId = commentData.media?.id || null;
  const mediaCtx = mediaId ? await proFeatures.fetchMediaContext(mediaId) : null;
  let privateDmGreeting = template.buildPrivateDm(fromUser);
  if (mediaCtx && mediaCtx.caption) {
    const shortCaption = mediaCtx.caption.replace(/\s+/g, ' ').slice(0, 90);
    privateDmGreeting = `🎬 நீங்கள் பார்த்த எங்கள் பதிவு: "${shortCaption}${mediaCtx.caption.length > 90 ? '...' : ''}"\n\n` + privateDmGreeting;
  }

  const privResult = await sendPrivateDMByComment(commentId, privateDmGreeting);
  console.log(`📩 [Private DM Triggered for @${fromUser}]: (ReelCtx: ${Boolean(mediaCtx)}, Result: ${privResult.success ? 'Success' : 'Simulated/Error'})`);

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

  return { activeMode, mediaContext: mediaCtx, publicReply: chosenReply, privateDm: privateDmGreeting, pubResult, privResult };
}

// Feature #6: Story Mention Auto-Thank-You & Lead Capture
async function handleStoryMention(senderId, mentionPayload = {}) {
  if (!channelControls.isInstagramDmEnabled()) {
    return { paused: true };
  }
  const activeMode = channelControls.getInstagramPersona() || 'builder';
  const thankYouText = proFeatures.buildStoryMentionReply(activeMode);
  const quickReplies = proFeatures.getQuickRepliesForMode(activeMode);
  const sendRes = await sendInstagramDM(senderId, thankYouText, quickReplies);
  console.log(`📣 [Story Mention Auto-Thank-You Sent] to ${senderId} (Mode: ${activeMode})`);
  return { activeMode, replyText: thankYouText, sendRes };
}

// ---------------------------------------------------------------------------
// 4. INCOMING DIRECT MESSAGE (DM) PROCESSING WITH GEMINI
// ---------------------------------------------------------------------------
async function handleIncomingDM(senderId, userText = '', sock = null, rawEvent = null, options = {}) {
  const activeMode = channelControls.getInstagramPersona() || 'builder';

  // 0. Channel ON/OFF Toggle Check
  if (!options.bypassToggle && !channelControls.isInstagramDmEnabled()) {
    console.log(`⏸️ [Instagram DM AI PAUSED] Skipped DM from ${senderId} (Toggle is OFF)`);
    return { paused: true, activeMode, replyText: '⏸️ Instagram DM AI is currently PAUSED (Toggle is OFF on Dashboard).' };
  }

  const trimmed = String(userText || '').trim();
  const lower = trimmed.toLowerCase();

  // 0b. 5-Second Rapid Duplicate Message Debounce (e.g. customer sends "Hi" twice in 2 seconds)
  const prev = recentInstaMessages.get(senderId);
  if (prev && prev.text === lower && (Date.now() - prev.timestamp) < 5000 && !options.media) {
    console.log(`⏳ [Instagram Debounce] Skipped duplicate rapid message from ${senderId}: "${trimmed}"`);
    return { skipped: true, reason: 'duplicate_debounce', activeMode };
  }
  recentInstaMessages.set(senderId, { text: lower, timestamp: Date.now() });

  // 0c. Per-Sender Concurrency Lock (prevent overlapping Gemini runs — matches WhatsApp agent!)
  if (activeInstaLocks.has(senderId)) {
    console.log(`⏳ [Instagram Lock] Already processing a reply for ${senderId}, skipping overlap.`);
    return { skipped: true, reason: 'concurrency_lock', activeMode };
  }

  // Scope chatId per persona so switching modes in live demos starts a clean, unmixed conversation!
  const chatId = `insta_${activeMode}_${senderId}`;
  const gemini = getGemini();

  // 0d. Quick Reset Command (!reset / /reset)
  if (lower === '!reset' || lower === '/reset') {
    gemini.resetHistory(chatId);
    optedOutUsers.delete(senderId);
    const resetMsg = '✅ Conversation cleanly reset! How can I assist you today?';
    const sendRes = await sendInstagramDM(senderId, resetMsg);
    return { activeMode, replyText: resetMsg, sendRes };
  }

  // 0e. Polite Opt-Out / Unsubscribe Guard (100% Meta Policy Compliant — matches WhatsApp agent!)
  if (/\b(stop|unsubscribe|don't message|dont message|no messages|not interested)\b/i.test(lower) || /வேண்டாம்|மெசேஜ் பண்ணாதீங்க|மெசேஜ் செய்ய வேண்டாம்/.test(trimmed)) {
    optedOutUsers.add(senderId);
    const stopMsg = activeMode === 'builder'
      ? 'கண்டிப்பாக சார், உங்கள் முடிவை மதிக்கிறோம்! இனி மெசேஜ் அனுப்ப மாட்டோம். எதிர்காலத்தில் வீடு கட்ட உதவி தேவைப்பட்டால் +91 93615 99097-ல் தொடர்பு கொள்ளலாம். நன்றி 🙏'
      : 'Understood! We respect your choice and will not message you further. Feel free to reach out anytime at +91 93615 99097. Have a wonderful day! 🙏';
    const sendRes = await sendInstagramDM(senderId, stopMsg);
    return { activeMode, optedOut: true, replyText: stopMsg, sendRes };
  }

  // If user previously opted out and didn't explicitly restart, stay quiet unless they ask a real question
  if (optedOutUsers.has(senderId) && trimmed.length < 4) {
    return { skipped: true, reason: 'user_opted_out', activeMode };
  }

  activeInstaLocks.add(senderId);
  try {
    // Cancel any pending 4-hour warm follow-up since the customer just replied!
    proFeatures.cancelWarmFollowUp(senderId);

    console.log(`📩 [Instagram DM from ${senderId}] (Active Mode: ${activeMode}): "${trimmed || '[MEDIA]'}"`);

    // Feature #3: Auto-Load Previous Chat History from Meta Instagram Inbox on Cold Start!
    await proFeatures.hydrateHistoryFromInstagramInbox(senderId, chatId, activeMode, gemini, builderCustomerMemory);

    // 1. Update builder customer memory only when in builder mode
    let profile = {};
    if (activeMode === 'builder' && trimmed) {
      builderCustomerMemory.updateFromMessage(chatId, trimmed);
      profile = builderCustomerMemory.getProfile(chatId);
    }

    // 2. Check if user provided their WhatsApp phone number in this message
    const detectedPhone = extractPhoneNumber(trimmed);
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
        userText: trimmed
      }, sock);
    }

    // 3. Generate response using Gemini Engine (full multimodal + WhatsApp rules + live admin rules!)
    let replyText = '';
    try {
      replyText = await gemini.generateResponse(chatId, trimmed, options.media || null, {
        platform: 'instagram',
        senderId: senderId,
        overrideMode: activeMode
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

    // 5. Sanitize (Zero-Sinhala / Clean Instagram formatting) & Auto-Chunk under Meta's 1,000-char limit!
    // Feature #4: Attach Native Tap-to-Reply Quick Reply Buttons on the final chunk!
    const chunks = splitForInstagramDM(replyText, 950);
    const quickReplies = proFeatures.getQuickRepliesForMode(activeMode);
    let sendRes = null;
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      sendRes = await sendInstagramDM(senderId, chunks[i], isLast ? quickReplies : null);
    }

    const cleanReply = chunks.join('\n\n');

    // Feature #5: Auto-Send HD Portfolio / 3D Elevation Carousel Cards when customer asks for samples/photos/plans!
    let carouselSent = false;
    if (proFeatures.shouldSendPortfolioCarousel(trimmed, cleanReply) && (activeMode === 'builder' || activeMode === 'dev')) {
      const carouselPayload = proFeatures.buildPortfolioCarouselPayload(activeMode);
      const carRes = await sendInstagramCarousel(senderId, carouselPayload);
      carouselSent = Boolean(carRes && carRes.success);
      console.log(`🖼️ [Portfolio Carousel Dispatched] to ${senderId} (Mode: ${activeMode}, Success: ${carouselSent})`);
    }

    // Feature #7: Instant Hot Lead WhatsApp Alert + Smart 4-Hour Warm Follow-Up Nudge
    await proFeatures.maybeSendHotLeadWhatsAppAlert(senderId, activeMode, profile, trimmed, sock, BUILDER_PHONE);
    proFeatures.scheduleWarmFollowUp(senderId, activeMode, profile, {
      shouldSkip: () => optedOutUsers.has(senderId) || !channelControls.isInstagramDmEnabled(),
      sendDM: sendInstagramDM
    });

    console.log(`📤 [Instagram DM Reply Sent to ${senderId}] (Mode: ${activeMode}, Chunks: ${chunks.length}, Carousel: ${carouselSent}, Length: ${cleanReply.length} chars)`);
    return { activeMode, replyText: cleanReply, chunks: chunks.length, quickRepliesCount: quickReplies.length, carouselSent, sendRes };
  } finally {
    activeInstaLocks.delete(senderId);
  }
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

  // Step 2: Dummy Phone Safety Guard (Never fire outbound WhatsApp to test/dummy numbers like 9876543210)
  if (isDummyPhoneNumber(cleanDigits)) {
    console.log(`🛡️ [Instagram Safety Guard] Skipped outbound WhatsApp bridge for dummy/test phone: ${cleanDigits}`);
    return;
  }

  // Step 3: Persona-Aware WhatsApp Welcome to Customer
  const activeMode = leadData.activeMode || channelControls.getInstagramPersona() || 'builder';
  const welcomeMap = {
    builder: `வணக்கம் ${customerName} சார்! 🏡✨\nDanam Holdings Civil Engineering & Turnkey EPC, மதுரை.\n\nநீங்கள் எங்கள் Instagram பக்கத்தில் கேட்ட வீடு கட்டும் விபரங்களுக்கான 2D Floor Plan மற்றும் Elevation மாதிரிகள்:\n• Standard Package: ₹1,850 – ₹1,950 / Sq.Ft\n• Premium Luxury: ₹2,250 – ₹2,350 / Sq.Ft\n• Elite Royal Villa: ₹2,750 – ₹2,950 / Sq.Ft\n\n📍 உங்கள் இடம்: ${location}\n📐 Plot விபரம்: ${plotSize}\n\nஎங்கள் Chief Engineer Er. Dhilip Kumar விரைவில் உங்களைத் தொடர்பு கொள்வார்.\nமுழு விபரங்களுக்கு: https://danamholdings.com`,
    dev: `வணக்கம் ${customerName}! 💻⚡\nSoloDeveloper.pro (Suresh Kumar — AI & Web Automation, Madurai).\n\nநீங்கள் Instagram-ல் கேட்ட விபரங்கள்:\n• Modern Business Website: ₹8,999 முதல் (7 Days Delivery)\n• 24/7 WhatsApp & Instagram AI Agent + CRM: ₹19,999 முதல்\n\nLive Portfolio: https://solodeveloper.pro\nநேரடி ஆலோசனைக்கு இப்போதே இங்கே ரிப்ளை செய்யலாம்!`,
    restaurant: `வணக்கம் ${customerName}! 🍗✨\nமதுரை தாஜ் ஹோட்டல் (Authentic Seeraga Samba Dum Biryani).\n• Chicken Biryani: ₹190 | Mutton Biryani: ₹290 | Fish Biryani: ₹270\nஎத்தனை பார்சல் வேண்டும் என்று இங்கே அனுப்புங்கள் — உடனே Digital Token அனுப்புகிறோம்!`,
    wholesale: `வணக்கம் ${customerName} அண்ணா! 📦\nஅண்ணாமலையார் ஆயில் ஸ்டோர் (மாட்டுத்தாவணி, மதுரை).\n• Gold Winner 1L Box: ₹1,420 | 15Ltr Tin: ₹2,180 | 15Kg Tin: ₹2,420\nஎத்தனை பாக்ஸ் லோடிங் போட வேண்டும் அண்ணா?`
  };
  const homeownerWelcome = welcomeMap[activeMode] || welcomeMap.builder;

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

function getMessagesEndpoint() {
  const rawToken = process.env.INSTA_PAGE_ACCESS_TOKEN || INSTA_PAGE_ACCESS_TOKEN || '';
  const token = String(rawToken).replace(/\s+/g, '');
  // Facebook Page Tokens (EAA...) MUST post to /{IG_BUSINESS_ACCOUNT_ID}/messages (NOT /me/messages which requires pages_messaging!)
  if (token && !token.startsWith('IG') && INSTA_BUSINESS_ACCOUNT_ID) {
    return `/${INSTA_BUSINESS_ACCOUNT_ID}/messages`;
  }
  return '/me/messages';
}

function sendInstagramDM(recipientId, text, quickReplies = null) {
  const messageObj = { text: text };
  if (Array.isArray(quickReplies) && quickReplies.length > 0) {
    messageObj.quick_replies = quickReplies;
  }
  return callMetaGraphApi(getMessagesEndpoint(), {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message: messageObj
  });
}

function sendInstagramCarousel(recipientId, attachmentObj) {
  return callMetaGraphApi(getMessagesEndpoint(), {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message: { attachment: attachmentObj }
  });
}

function sendPrivateDMByComment(commentId, text) {
  return callMetaGraphApi(getMessagesEndpoint(), {
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
    const rawToken = process.env.INSTA_PAGE_ACCESS_TOKEN || INSTA_PAGE_ACCESS_TOKEN || '';
    // Strip any accidental spaces or line-breaks pasted from Meta Access Token Debugger
    const token = String(rawToken).replace(/\s+/g, '');
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
      path: `/${apiVersion}${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    let settled = false;
    const done = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            done({ success: true, data: parsed });
          } else {
            console.error(`❌ [Meta Graph API Error ${res.statusCode}]:`, parsed);
            done({ success: false, error: parsed, statusCode: res.statusCode });
          }
        } catch (e) {
          done({ success: false, raw: data });
        }
      });
    });

    req.on('timeout', () => {
      console.error('❌ [Meta Graph API Timeout] Aborting hung socket after 10s');
      req.destroy();
      done({ success: false, error: 'Request timed out' });
    });

    req.on('error', (err) => {
      console.error('❌ [Meta Graph API Network Error]:', err.message);
      done({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function verifyLiveToken() {
  const rawToken = process.env.INSTA_PAGE_ACCESS_TOKEN || INSTA_PAGE_ACCESS_TOKEN || '';
  const token = String(rawToken).replace(/\s+/g, '');
  if (!token) return { valid: false, error: 'INSTA_PAGE_ACCESS_TOKEN is not configured' };

  const isIg = token.startsWith('IG');
  const host = isIg ? 'graph.instagram.com' : 'graph.facebook.com';
  const url = `https://${host}/v21.0/me?fields=id,name,instagram_business_account{id,username}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000)
    });
    const data = await res.json();
    if (res.ok && data.id) {
      return {
        valid: true,
        tokenLength: token.length,
        pageId: data.id,
        pageName: data.name || null,
        igId: data.instagram_business_account?.id || null,
        igUsername: data.instagram_business_account?.username || null
      };
    }
    return {
      valid: false,
      tokenLength: token.length,
      tokenPrefix: token.slice(0, 4),
      error: data.error?.message || 'Token validation failed'
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function getStatus() {
  const rawToken = process.env.INSTA_PAGE_ACCESS_TOKEN || INSTA_PAGE_ACCESS_TOKEN || '';
  const token = String(rawToken).replace(/\s+/g, '');
  const hasLiveToken = Boolean(token && !token.includes('your_') && token !== '');
  return {
    engine: 'instagram-graph-api-v21.0',
    hasToken: hasLiveToken,
    hasVerifyToken: Boolean(process.env.INSTA_VERIFY_TOKEN || INSTA_VERIFY_TOKEN),
    signatureVerificationEnabled: Boolean(process.env.INSTA_APP_SECRET),
    webhookEndpoint: '/webhook/instagram',
    processedComments: processedCommentIds.size,
    processedMessages: processedMessageIds.size,
    simulationMode: !hasLiveToken,
    proFeatures: proFeatures.getProFeaturesStatus(),
    costPerMessage: '₹0 (Meta Free Direct Message Tier)'
  };
}

module.exports = {
  handleVerification,
  handleWebhookEvent,
  handleReelComment,
  handleStoryMention,
  handleIncomingDM,
  bridgeLeadToWhatsApp,
  extractPhoneNumber,
  sendInstagramDM,
  sendInstagramCarousel,
  sendPublicCommentReply,
  sendPrivateDMByComment,
  callMetaGraphApi,
  verifyLiveToken,
  getStatus
};
