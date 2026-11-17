/**
 * instagramProFeatures.js
 * 
 * 7 Advanced Pro Features for the Omnichannel Instagram AI Agent:
 * 1. Smart Forwarded Reel Vision & Caption Reader
 * 2. Own Reel Context-Aware Comment-to-DM (Media Caption Fetch + Cache)
 * 3. Auto-Load Previous Chat History directly from Meta Instagram Inbox (Zero Memory Loss)
 * 4. Tap-to-Reply Native Instagram Quick Reply Buttons
 * 5. Auto-Send Portfolio / 3D Elevation Carousel Cards in DM
 * 6. Story Mention Auto-Thank-You & Lead Capture
 * 7. Smart 4-Hour Warm Follow-Up Nudge (within 24h Meta Free Window) + Instant Hot Lead Alert
 */

const FB_PAGE_ID = process.env.FB_PAGE_ID || '524523260748621';
const INSTA_BUSINESS_ACCOUNT_ID = process.env.INSTA_BUSINESS_ACCOUNT_ID || '17841471872515616';

// In-memory caches (strictly bounded for 512MB Render Free Tier)
const mediaCaptionCache = new Map(); // mediaId -> { caption, mediaType, permalink, thumbnailUrl, cachedAt }
const hydratedSessions = new Set();  // chatId -> already hydrated from Meta inbox this boot
const warmFollowUpTimers = new Map(); // senderId -> { timer, lastUserMsgAt, activeMode }
const hotLeadAlertedUsers = new Set(); // senderId -> already sent hot-lead WhatsApp alert

function getCleanToken() {
  const raw = process.env.INSTA_PAGE_ACCESS_TOKEN || '';
  return String(raw).replace(/\s+/g, '');
}

function getGraphHost(token) {
  return token.startsWith('IG') ? 'graph.instagram.com' : 'graph.facebook.com';
}

// ---------------------------------------------------------------------------
// FEATURE 1 & 2: FETCH OWN REEL / POST CAPTION & MEDIA CONTEXT (CACHED 30m)
// ---------------------------------------------------------------------------
async function fetchMediaContext(mediaId) {
  if (!mediaId) return null;

  const cached = mediaCaptionCache.get(mediaId);
  if (cached && (Date.now() - cached.cachedAt) < 30 * 60 * 1000) {
    return cached;
  }

  const token = getCleanToken();
  if (!token || token.includes('your_')) {
    return null;
  }

  try {
    const host = getGraphHost(token);
    const url = `https://${host}/v21.0/${encodeURIComponent(mediaId)}?fields=id,caption,media_type,thumbnail_url,media_url,permalink`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.id) return null;

    const info = {
      id: data.id,
      caption: (data.caption || '').trim(),
      mediaType: data.media_type || 'REEL',
      thumbnailUrl: data.thumbnail_url || data.media_url || null,
      permalink: data.permalink || null,
      cachedAt: Date.now()
    };

    mediaCaptionCache.set(mediaId, info);
    if (mediaCaptionCache.size > 200) {
      const oldest = mediaCaptionCache.keys().next().value;
      mediaCaptionCache.delete(oldest);
    }
    console.log(`🎬 [Reel Context Loaded] Media ${mediaId}: "${info.caption.slice(0, 70)}..."`);
    return info;
  } catch (err) {
    console.warn('⚠️ [Media Context Notice]:', err.message);
    return null;
  }
}

/**
 * Extracts caption, metadata, and downloads video/thumbnail for a Forwarded Reel or Share attachment
 */
async function analyzeForwardedReelAttachment(att, downloadMediaFn) {
  const payload = att?.payload || {};
  const title = (payload.title || '').trim();
  const reelUrl = payload.url || '';
  const reelId = payload.reel_video_id || payload.id || null;

  let ownMediaContext = null;
  if (reelId) {
    ownMediaContext = await fetchMediaContext(reelId);
  }

  const combinedCaption = ownMediaContext?.caption || title || '';

  // Try downloading thumbnail first (fast & small for Gemini Vision) or short video clip (<=4MB)
  let mediaPayload = null;
  const visualUrl = ownMediaContext?.thumbnailUrl || reelUrl;
  if (visualUrl && typeof downloadMediaFn === 'function') {
    mediaPayload = await downloadMediaFn(visualUrl, 'video/mp4');
  }

  const contextLines = ['[VIDEO_OR_REEL_SHARED]'];
  if (combinedCaption) {
    contextLines.push(`Reel Caption / Details: "${combinedCaption.slice(0, 500)}"`);
  }
  if (ownMediaContext?.permalink) {
    contextLines.push(`Our Official Reel Link: ${ownMediaContext.permalink}`);
  }
  contextLines.push('DIRECTIVE: The customer forwarded/shared this Instagram Reel. Read the Reel caption and examine the visual frames/thumbnail carefully. Identify the exact house/project/service shown in this Reel and answer the customer\'s doubt clearly and specifically in respectful Tamil (or their language).');

  return {
    reelContextText: contextLines.join('\n'),
    caption: combinedCaption,
    mediaPayload
  };
}

// ---------------------------------------------------------------------------
// FEATURE 3: AUTO-LOAD PREVIOUS CHAT HISTORY FROM META INSTAGRAM INBOX
// ---------------------------------------------------------------------------
async function hydrateHistoryFromInstagramInbox(senderId, chatId, activeMode, geminiInstance, builderMemory) {
  if (!senderId || hydratedSessions.has(chatId)) return { hydrated: false, count: 0 };

  const existing = geminiInstance.getOrCreateHistory(chatId);
  if (existing && existing.length > 0) {
    hydratedSessions.add(chatId);
    return { hydrated: false, count: existing.length };
  }

  const token = getCleanToken();
  if (!token || token.includes('your_')) {
    hydratedSessions.add(chatId);
    return { hydrated: false, count: 0 };
  }

  // Mark as attempted so we never re-query Meta on every turn
  hydratedSessions.add(chatId);
  if (hydratedSessions.size > 1000) {
    const first = hydratedSessions.values().next().value;
    hydratedSessions.delete(first);
  }

  try {
    const host = getGraphHost(token);
    const convUrl = `https://${host}/v21.0/${FB_PAGE_ID}/conversations?platform=instagram&user_id=${encodeURIComponent(senderId)}&fields=id,messages.limit(12){id,from,message,created_time}`;
    const res = await fetch(convUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5500)
    });
    if (!res.ok) return { hydrated: false, count: 0 };

    const data = await res.json();
    const thread = data?.data?.[0];
    const msgs = thread?.messages?.data;
    if (!Array.isArray(msgs) || msgs.length <= 1) {
      return { hydrated: false, count: 0 };
    }

    // Meta returns newest-first; drop the very latest message (which is the current incoming turn) & reverse to chronological
    const pastMsgs = msgs.slice(1).reverse().filter(m => m.message && m.message.trim().length > 0);
    if (pastMsgs.length === 0) return { hydrated: false, count: 0 };

    let hydratedCount = 0;
    for (const m of pastMsgs) {
      const fromId = String(m.from?.id || '');
      const isBot = fromId === INSTA_BUSINESS_ACCOUNT_ID || fromId === FB_PAGE_ID;
      const role = isBot ? 'model' : 'user';
      const cleanText = m.message.trim();

      // Avoid invalid consecutive same-role entries for Gemini API
      const lastEntry = existing[existing.length - 1];
      if (lastEntry && lastEntry.role === role) {
        lastEntry.parts[0].text += `\n${cleanText}`;
      } else {
        existing.push({ role, parts: [{ text: cleanText }] });
      }

      if (!isBot && activeMode === 'builder' && builderMemory) {
        builderMemory.updateFromMessage(chatId, cleanText);
      }
      hydratedCount++;
    }

    // Ensure history starts with 'user' role (Gemini requirement)
    while (existing.length > 0 && existing[0].role !== 'user') {
      existing.shift();
    }

    geminiInstance.saveHistory(chatId);
    console.log(`🧠 [Previous Chat Hydrated] Loaded ${hydratedCount} real historical Instagram messages for ${senderId}!`);
    return { hydrated: true, count: hydratedCount };
  } catch (err) {
    console.warn('⚠️ [History Hydration Notice]:', err.message);
    return { hydrated: false, count: 0 };
  }
}

// ---------------------------------------------------------------------------
// FEATURE 4: NATIVE INSTAGRAM QUICK REPLY BUTTONS (<= 20 CHARS PER TITLE)
// ---------------------------------------------------------------------------
function getQuickRepliesForMode(activeMode = 'builder') {
  const map = {
    builder: [
      { content_type: 'text', title: '📐 Cost Estimate', payload: 'QR_COST_ESTIMATE' },
      { content_type: 'text', title: '🏡 2D/3D Plans', payload: 'QR_3D_PLANS' },
      { content_type: 'text', title: '📍 Free Site Visit', payload: 'QR_SITE_VISIT' },
      { content_type: 'text', title: '💬 WhatsApp Chat', payload: 'QR_WHATSAPP' }
    ],
    dev: [
      { content_type: 'text', title: '💻 Website Price', payload: 'QR_WEB_PRICE' },
      { content_type: 'text', title: '🤖 AI Agent Demo', payload: 'QR_AI_DEMO' },
      { content_type: 'text', title: '📞 Book 10m Call', payload: 'QR_BOOK_CALL' }
    ],
    restaurant: [
      { content_type: 'text', title: '🍗 Biryani Menu', payload: 'QR_MENU' },
      { content_type: 'text', title: '🛒 Order Now', payload: 'QR_ORDER' },
      { content_type: 'text', title: '📍 Location', payload: 'QR_LOCATION' }
    ],
    wholesale: [
      { content_type: 'text', title: '📦 Today Oil Rate', payload: 'QR_OIL_RATE' },
      { content_type: 'text', title: '🛢️ 15Kg Tin Price', payload: 'QR_TIN_PRICE' },
      { content_type: 'text', title: '🚚 Place Order', payload: 'QR_PLACE_ORDER' }
    ]
  };
  return map[activeMode] || map.builder;
}

// ---------------------------------------------------------------------------
// FEATURE 5: AUTO-SEND PORTFOLIO / 3D ELEVATION CAROUSEL CARDS IN DM
// ---------------------------------------------------------------------------
function shouldSendPortfolioCarousel(userText = '', replyText = '') {
  const combined = `${userText} ${replyText}`.toLowerCase();
  return /\b(portfolio|sample|samples|elevation|3d|2d|photo|photos|pictures|pics|design|designs|villa|projects|completed|work|demo|plans)\b/i.test(userText) ||
         /போட்டோ|மாதிரி|பிளான்|எலிவேஷன்|டிசைன்|பழைய வீடு/.test(userText) ||
         combined.includes('qr_3d_plans');
}

function buildPortfolioCarouselPayload(activeMode = 'builder') {
  if (activeMode === 'dev') {
    return {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: 'SoloDeveloper.pro — Modern 3D Websites',
            subtitle: 'Next.js Business Websites from ₹8,999 • 7-Day Fast Delivery',
            default_action: { type: 'web_url', url: 'https://solodeveloper.pro' },
            buttons: [
              { type: 'web_url', url: 'https://solodeveloper.pro', title: '🌐 View Portfolio' },
              { type: 'postback', title: '📞 Book Free Demo', payload: 'Book a free 10-minute strategy call' }
            ]
          },
          {
            title: '24/7 WhatsApp & Instagram AI Sales Agents',
            subtitle: 'Automated Lead Qualification, CRM & Multi-Language Replies',
            default_action: { type: 'web_url', url: 'https://solodeveloper.pro' },
            buttons: [
              { type: 'web_url', url: 'https://wa.me/919361599097', title: '💬 WhatsApp Suresh' },
              { type: 'postback', title: '💰 Get Pricing', payload: 'Share AI Agent pricing packages' }
            ]
          }
        ]
      }
    };
  }

  // Default: Danam Holdings Builder Portfolio Cards
  return {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements: [
        {
          title: '🏡 Ocean Peacock SR Villa — 4,400 Sq.Ft (G+2)',
          subtitle: '4 BHK Luxury Villa, Madurai • Italian Marble • 360° VR Design',
          default_action: { type: 'web_url', url: 'https://danamholdings.com' },
          buttons: [
            { type: 'web_url', url: 'https://danamholdings.com', title: '🌐 View 3D Projects' },
            { type: 'postback', title: '📐 Get Similar Quote', payload: 'I want an estimate similar to Ocean Peacock Villa' }
          ]
        },
        {
          title: '🏠 Vinoth BJV Residence — 2,600 Sq.Ft (G+1)',
          subtitle: '3 BHK Contemporary Duplex, Selvapuram, Madurai • Delivered Early',
          default_action: { type: 'web_url', url: 'https://danamholdings.com' },
          buttons: [
            { type: 'web_url', url: 'https://wa.me/919361599097', title: '💬 WhatsApp Engineer' },
            { type: 'postback', title: '📍 Book Site Visit', payload: 'I want to book a Free Site Inspection' }
          ]
        },
        {
          title: '🏡 Maruthupandiyar Nagar Villa — 1,950 Sq.Ft (G+1)',
          subtitle: '3 BHK Independent Duplex, Madurai • Standard/Premium Balance',
          default_action: { type: 'web_url', url: 'https://danamholdings.com' },
          buttons: [
            { type: 'postback', title: '💰 Standard ₹1,950', payload: 'Explain Standard Package ₹1,950 per sq.ft' },
            { type: 'postback', title: '✨ Premium ₹2,350', payload: 'Explain Premium Luxury Package ₹2,350 per sq.ft' }
          ]
        }
      ]
    }
  };
}

// ---------------------------------------------------------------------------
// FEATURE 6: STORY MENTION AUTO-THANK-YOU MESSAGE
// ---------------------------------------------------------------------------
function buildStoryMentionReply(activeMode = 'builder') {
  const replies = {
    builder: `வணக்கம் சார்! 🙏✨ உங்கள் Instagram Story-ல் Danam Holdings-ஐ Mention செய்ததற்கு மிக்க நன்றி!\n\nநீங்கள் மதுரையில் புதிய வீடு கட்டவோ அல்லது 2D Floor Plan / 3D Elevation பார்க்கவோ திட்டமிட்டிருந்தால், இப்போதே இங்கே மெசேஜ் செய்யுங்கள் — இலவச ஆலோசனை தருகிறோம் 🏡`,
    dev: `Thank you so much for mentioning @solodeveloper.pro in your Story! 🙌⚡\n\nLooking to build a Modern Website (from ₹8,999) or a 24/7 WhatsApp & Instagram AI Agent? Tap a button below or reply right here! 💻`,
    restaurant: `நன்றி சார்! 🙏 உங்கள் Story-ல் மதுரை தாஜ் ஹோட்டலை Mention செய்ததற்கு மிக்க மகிழ்ச்சி 🍗✨ இன்றைய ஸ்பெஷல் சீரக சம்பா பிரியாணி ஆர்டர் செய்ய கீழே தட்டவும்!`,
    wholesale: `நன்றி அண்ணா! 🙏 உங்கள் Story-ல் அண்ணாமலையார் ஆயில் ஸ்டோரை Mention செய்ததற்கு மிக்க நன்றி 📦 இன்றைய Gold Winner ஹோல்சேல் ரேட் தெரிந்துகொள்ள கீழே தட்டவும்!`
  };
  return replies[activeMode] || replies.builder;
}

// ---------------------------------------------------------------------------
// FEATURE 7: SMART 4-HOUR WARM FOLLOW-UP NUDGE + INSTANT HOT LEAD ALERT
// ---------------------------------------------------------------------------
const FOLLOW_UP_DELAY_MS = Number(process.env.INSTA_FOLLOWUP_DELAY_MS) || (4 * 60 * 60 * 1000); // 4 Hours (strictly inside Meta 24h free window)

function cancelWarmFollowUp(senderId) {
  const entry = warmFollowUpTimers.get(senderId);
  if (entry && entry.timer) {
    clearTimeout(entry.timer);
  }
  warmFollowUpTimers.delete(senderId);
}

function scheduleWarmFollowUp(senderId, activeMode, profile, callbacks) {
  // Always cancel any existing timer first
  cancelWarmFollowUp(senderId);

  // Only schedule if customer has shared some interest (location or plot size) and NOT yet given phone
  if (profile?.customer_phone) return false;
  if (activeMode === 'builder' && !profile?.location && !profile?.plot_size) return false;

  const scheduledAt = Date.now();
  const timer = setTimeout(async () => {
    warmFollowUpTimers.delete(senderId);
    try {
      // Strictly verify within Meta's 24-hour messaging window (< 23 hours)
      if ((Date.now() - scheduledAt) > 23 * 60 * 60 * 1000) return;
      if (callbacks.shouldSkip && callbacks.shouldSkip()) return;

      const loc = profile?.location || 'மதுரை';
      const size = profile?.plot_size || 'உங்கள்';
      const nudgeText = activeMode === 'builder'
        ? `வணக்கம் சார்! 😊 Danam Holdings சார்பாக ஒரு சின்ன Follow-up.\n\n${loc} பகுதியில் உள்ள ${size} Plot-க்கு ஏற்ற 2D Floor Plan & 3D Elevation மாதிரிகளை உங்கள் WhatsApp-க்கு இலவசமாக அனுப்பி வைக்கலாமா சார்? உங்கள் 10-digit WhatsApp Number மட்டும் அனுப்புங்கள் 🏡`
        : `Hi! Just a quick friendly follow-up from SoloDeveloper.pro ⚡ Would you like me to share our live demo & pricing brochure directly on your WhatsApp? Just drop your 10-digit WhatsApp number!`;

      await callbacks.sendDM(senderId, nudgeText, getQuickRepliesForMode(activeMode));
      console.log(`🔔 [4-Hour Warm Follow-Up Sent] to Instagram user ${senderId} (${activeMode})`);
    } catch (err) {
      console.warn('⚠️ [Follow-Up Nudge Error]:', err.message);
    }
  }, FOLLOW_UP_DELAY_MS);

  if (typeof timer.unref === 'function') timer.unref();
  warmFollowUpTimers.set(senderId, { timer, scheduledAt, activeMode });
  return true;
}

async function maybeSendHotLeadWhatsAppAlert(senderId, activeMode, profile, userText, sock, ownerPhone = '919361599097') {
  if (hotLeadAlertedUsers.has(senderId)) return false;

  // Detect HOT lead: has both plot size & location, OR explicitly requests site visit / engineer / pricing call
  const isHotBuilder = activeMode === 'builder' && (
    (profile?.location && profile?.plot_size) ||
    profile?.site_visit_requested ||
    /\b(site visit|visit|estimate|quotation|book|call me|engineer|dhilip)\b/i.test(userText)
  );
  const isHotGeneral = activeMode !== 'builder' && /\b(book|demo|call|order|price|interested|ready|buy)\b/i.test(userText);

  if (!isHotBuilder && !isHotGeneral) return false;

  hotLeadAlertedUsers.add(senderId);
  if (hotLeadAlertedUsers.size > 1000) {
    const first = hotLeadAlertedUsers.values().next().value;
    hotLeadAlertedUsers.delete(first);
  }

  const alertMsg = `🔥 *HOT INSTAGRAM LEAD DETECTED!* 📸⚡
━━━━━━━━━━━━━━━━━━━━━━
🎯 *Mode:* ${activeMode.toUpperCase()}
🆔 *Instagram User ID:* ${senderId}
📍 *Location:* ${profile?.location || 'Checking'}
📐 *Plot / Area:* ${profile?.plot_size || 'Checking'} ${profile?.house_type ? '(' + profile.house_type + ')' : ''}
💬 *Latest Message:* "${(userText || '').slice(0, 140)}"
━━━━━━━━━━━━━━━━━━━━━━
💡 *Tip:* AI is currently qualifying & collecting their WhatsApp number automatically!`;

  if (sock && sock.user) {
    try {
      await sock.sendMessage(`${ownerPhone}@s.whatsapp.net`, { text: alertMsg });
      console.log(`🔥 [Hot Instagram Lead Alert Sent] to WhatsApp +${ownerPhone}`);
      return true;
    } catch (err) {
      console.warn('⚠️ [Hot Lead Alert Notice]:', err.message);
    }
  } else {
    console.log(`🔥 [Hot Instagram Lead Logged] (${activeMode}) user=${senderId}`);
  }
  return true;
}

function getProFeaturesStatus() {
  return {
    forwardedReelVision: true,
    ownReelContextAware: true,
    autoHydrateMetaHistory: true,
    quickReplyButtons: true,
    portfolioCarousels: true,
    storyMentionAutoThankYou: true,
    warmFollowUpNudgesActive: warmFollowUpTimers.size,
    cachedReelsCount: mediaCaptionCache.size,
    hydratedThreadsCount: hydratedSessions.size
  };
}

module.exports = {
  fetchMediaContext,
  analyzeForwardedReelAttachment,
  hydrateHistoryFromInstagramInbox,
  getQuickRepliesForMode,
  shouldSendPortfolioCarousel,
  buildPortfolioCarouselPayload,
  buildStoryMentionReply,
  cancelWarmFollowUp,
  scheduleWarmFollowUp,
  maybeSendHotLeadWhatsAppAlert,
  getProFeaturesStatus
};
