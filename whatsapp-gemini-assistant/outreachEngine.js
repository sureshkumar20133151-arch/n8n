// SOLODEVELOPER AI BUSINESS AGENT - OUTREACH & LEAD GENERATION ENGINE
// Based on Alex Hormozi's Lead Magnet & Cold Outreach Framework:
// "It took me 5 years to solve [pain]. After 100+ trials I built [lead magnet] that helps [audience] achieve [outcome]. Mind if I share it?"
// Transforms cold target lists into qualified conversations and fills the CRM pipeline automatically.

const { detectIndustry } = require('./industryKnowledgeBase');

const INDUSTRY_LEAD_MAGNETS = {
  construction: {
    leadMagnet: "Free 5-Minute Builder AI Site & Workflow Automation Audit",
    painPoint: "managing construction bills, labor attendance, site pictures, site stocks, and machines manually across calls and notebooks",
    dreamOutcome: "manage construction bills, attendance, site pictures, site stocks, machines handling, and 24/7 client inquiries — all done by AI inside WhatsApp",
    targetAudience: "construction firms and builders",
    revenueImpact: "Eliminating missed material/bill leakage and 1 missed villa inquiry per month saves Lakhs in revenue & site overhead.",
    auditDeliverable: "1. Construction Bills & Tally/Sheets Sync via WhatsApp\n2. Daily Labor Attendance, Site Stocks & Machines Handling AI\n3. Site Pictures Vault (Upload & Instant Retrieval) + 24/7 Client Qualifier"
  },
  interiorDesign: {
    leadMagnet: "Premium Interior Client Qualification Blueprint",
    painPoint: "wasting hours answering casual Instagram messages instead of closing ₹5L–₹15L luxury turnkey villa projects",
    dreamOutcome: "automatically filter low-budget tire-kickers and book high-ticket 3D design consultations",
    targetAudience: "luxury interior design studios",
    revenueImpact: "Filtering 15+ low-ticket queries saves 10 hours weekly and recovers 2-3 premium villa clients.",
    auditDeliverable: "1. Instagram Direct-to-WhatsApp Portfolio Filter\n2. Luxury Villa Budget Pre-Qualifier\n3. Automated 3D Concept Booking Sequence"
  },
  clinicHealthcare: {
    leadMagnet: "24-Hour Patient Booking Automation Checklist",
    painPoint: "reception desks missing incoming patient calls and appointment queries during busy clinic hours",
    dreamOutcome: "enable patients to book doctor consultation slots and get directions 24/7 on WhatsApp",
    targetAudience: "doctors and specialty clinics",
    revenueImpact: "Recovers 15–20 missed patient consultations/month, adding ₹30,000 to ₹75,000 in monthly collections.",
    auditDeliverable: "1. Peak-Hour Call Missed-Inquiry Recovery Map\n2. 24/7 Doctor Slot Booking Flow\n3. Automated Appointment Reminder & No-Show Reducer"
  },
  restaurantFood: {
    leadMagnet: "₹50,000/month Direct WhatsApp Ordering Calculator",
    painPoint: "losing 25% to 30% of your hard-earned margins on every order to Swiggy & Zomato",
    dreamOutcome: "drive repeat customers to re-order directly through your zero-commission WhatsApp digital menu",
    targetAudience: "popular restaurants and cloud kitchens",
    revenueImpact: "Saving 25% commission across 150 direct repeat orders saves ₹45,000–₹75,000 monthly in pure profits.",
    auditDeliverable: "1. Zero-Commission WhatsApp Digital Menu Architecture\n2. Dine-In Table QR to WhatsApp VIP Club Funnel\n3. Automated Weekend Re-order Broadcast System"
  },
  realEstate: {
    leadMagnet: "High-Net-Worth Plot & Villa Buyer Fast-Track System",
    painPoint: "inquiries going cold because property brochures and DTCP layout PDFs take hours to dispatch manually",
    dreamOutcome: "instantly qualify buyer budgets, dispatch verified layout maps, and schedule guided site visits",
    targetAudience: "real estate promoters and land developers",
    revenueImpact: "Closing just 1 extra plot booking/month pays for your entire digital automation 50x over.",
    auditDeliverable: "1. 30-Second DTCP Layout & Price-Sheet Dispatcher\n2. High-Net-Worth Buyer Budget Qualifier\n3. Site Visit Driver & Slot Booking Automation"
  },
  retailBoutique: {
    leadMagnet: "WhatsApp VIP Catalog & 60-Second Re-Order Engine",
    painPoint: "customers asking 'price please' on Instagram but abandoning before making an order",
    dreamOutcome: "convert Instagram comments into instant WhatsApp orders with UPI payment links",
    targetAudience: "boutiques and designer apparel brands",
    revenueImpact: "Recovers 25-35% of abandoned Instagram product inquiries into paid orders.",
    auditDeliverable: "1. 1-Click Instagram Direct to WhatsApp Catalog\n2. UPI / Razorpay Instant Payment Button\n3. Automated Restock VIP Notification Broadcast"
  },
  educationCoaching: {
    leadMagnet: "Zero-Staff Student Admissions & Fee Inquiry Automation Audit",
    painPoint: "parents inquiring about course syllabus and batches during evenings when admission staff is offline",
    dreamOutcome: "qualify student admission eligibility and book demo classes instantly 24/7",
    targetAudience: "academies and coaching institutes",
    revenueImpact: "Increases student batch enrollment conversion by 25–40% without hiring night staff.",
    auditDeliverable: "1. 24/7 Course Syllabus & Fee Schedule Auto-Responder\n2. Student Eligibility Pre-Screener\n3. 1-Click Free Trial Class Booking Funnel"
  },
  manufacturingB2B: {
    leadMagnet: "B2B RFP & Buyer Catalog Automated Dispatcher",
    painPoint: "delayed technical catalog dispatch to procurement managers looking for immediate quotes",
    dreamOutcome: "pre-qualify purchase order quantity and dispatch verified technical specs in 30 seconds",
    targetAudience: "manufacturers and industrial suppliers",
    revenueImpact: "Prevents high-value corporate buyers from bouncing to competing manufacturers.",
    auditDeliverable: "1. Instant B2B Technical Spec & Brochure Dispatcher\n2. Minimum Order Quantity (MOQ) Pre-Qualifier\n3. Direct Founder Call Scheduling Flow"
  },
  professionalServices: {
    leadMagnet: "Client Onboarding & Document Collection Automation Kit",
    painPoint: "chasing corporate clients for GST/tax documents and payment invoices manually",
    dreamOutcome: "streamline consultation bookings and automated document collection on WhatsApp",
    targetAudience: "CAs, legal consultants, and agency owners",
    revenueImpact: "Saves 15 hours of manual admin work weekly and eliminates lost billing hours.",
    auditDeliverable: "1. Automated Client Intake & Checklist Bot\n2. WhatsApp Secure Document Upload Collector\n3. Automated Retainer Payment Reminder Sequence"
  },
  ecommerceD2C: {
    leadMagnet: "Abandoned Cart WhatsApp Recovery & COD Verification Blueprint",
    painPoint: "high RTO (Return to Origin) on COD orders and cart abandonment without checkout",
    dreamOutcome: "verify COD delivery addresses in 30 seconds on WhatsApp and recover abandoned checkouts",
    targetAudience: "D2C ecommerce founders",
    revenueImpact: "Cuts fake RTO orders by 40% and boosts checkout conversion by 18-22%.",
    auditDeliverable: "1. 30-Second WhatsApp COD Address Confirmation Bot\n2. 1-Click UPI Discount Payment Link (Converts COD to Prepaid)\n3. Automated 30-Minute Abandoned Cart Recovery Hook"
  }
};

/**
 * Detect industry key from text or prospect record
 * @param {string} text
 * @returns {string}
 */
function resolveIndustryKey(text = '') {
  const t = text.toLowerCase();
  if (t.includes('construct') || t.includes('builder') || t.includes('civil') || t.includes('contractor')) return 'construction';
  if (t.includes('interior') || t.includes('decor')) return 'interiorDesign';
  if (t.includes('real estate') || t.includes('plot') || t.includes('property') || t.includes('developer')) return 'realEstate';
  if (t.includes('clinic') || t.includes('doctor') || t.includes('dental') || t.includes('health') || t.includes('hospital')) return 'clinicHealthcare';
  if (t.includes('restaur') || t.includes('cafe') || t.includes('food') || t.includes('hotel') || t.includes('kitchen')) return 'restaurantFood';
  if (t.includes('boutique') || t.includes('retail') || t.includes('saree') || t.includes('clothing') || t.includes('shop')) return 'retailBoutique';
  if (t.includes('educat') || t.includes('coach') || t.includes('academy') || t.includes('school') || t.includes('institute')) return 'educationCoaching';
  if (t.includes('manufactur') || t.includes('factory') || t.includes('industrial') || t.includes('b2b')) return 'manufacturingB2B';
  if (/\bca\b/i.test(t) || t.includes('legal') || t.includes('consult') || /\bagency\b/i.test(t) || t.includes('professional')) return 'professionalServices';
  if (t.includes('ecom') || t.includes('d2c') || t.includes('online store') || /\bapparel\s+brand\b/i.test(t)) return 'ecommerceD2C';

  // Fallback using detectIndustry helper
  const detected = detectIndustry(text);
  return detected?.id || 'construction';
}

/**
 * Generate Hormozi 5-Year Lead Magnet Outreach Script
 * @param {object} prospect
 * @returns {object}
 */
function generateOutreachScript(prospect = {}) {
  const owner = prospect.ownerName || prospect.name || 'there';
  const company = prospect.company || prospect.businessName || 'your business';
  const indKey = resolveIndustryKey(prospect.industry || prospect.businessName || '');
  const magnet = INDUSTRY_LEAD_MAGNETS[indKey] || INDUSTRY_LEAD_MAGNETS.construction;

  const englishHook = `Hi ${owner},

We don't just build websites — we help ${magnet.targetAudience} operate and automate their entire business workflow using AI right inside WhatsApp.

Whether it's connecting WhatsApp to your existing tools (Tally, Zoho, Excel/Sheets, Billing), uploading & retrieving site/work photos on-demand, or handling ${magnet.painPoint} 24/7 — we automate it end-to-end.

Mind if I share a quick breakdown of how our "${magnet.leadMagnet}" works for ${company}?`;

  const tamilHook = `வணக்கம் ${owner}!

நாங்கள் வெறும் Website மட்டும் செய்து தருவதில்லை — உங்கள் Business-ன் முழு Workflow-ஐயும் AI & WhatsApp மூலம் Automate செய்து இயக்க உதவுகிறோம்.

நீங்கள் ஏற்கனவே பயன்படுத்தும் Tally, Excel/Sheets, Billing போன்ற Software-களை WhatsApp AI Agent உடன் கனெக்ட் செய்வது, Site/Work Photos-ஐ WhatsApp-லேயே Upload செய்து தேவையானபோது எடுப்பது, மற்றும் ${magnet.painPoint} போன்ற சவால்களை 24/7 தீர்ப்பது என அனைத்தையும் Automate செய்கிறோம்.

"${magnet.leadMagnet}" உங்கள் ${company}-க்கு எப்படி உதவும் என்ற சின்ன Breakdown-ஐ அனுப்பலாமா?`;

  return {
    industryKey: indKey,
    leadMagnetName: magnet.leadMagnet,
    revenueImpact: magnet.revenueImpact,
    painPoint: magnet.painPoint,
    dreamOutcome: magnet.dreamOutcome,
    auditDeliverable: magnet.auditDeliverable,
    englishHook,
    tamilHook,
    primaryMessage: englishHook
  };
}

/**
 * Generate the Audit Delivery message when prospect replies affirmatively
 * @param {object} prospect
 * @returns {string}
 */
function generateAuditDeliveryMessage(prospect = {}) {
  const owner = prospect.ownerName || prospect.name || 'there';
  const company = prospect.company || prospect.businessName || 'your business';
  const indKey = resolveIndustryKey(prospect.industry || '');
  const magnet = INDUSTRY_LEAD_MAGNETS[indKey] || INDUSTRY_LEAD_MAGNETS.construction;

  return `Great to connect with you, ${owner}! Here is how we automate the workflow for ${company} (*${magnet.leadMagnet}*):

${magnet.auditDeliverable}

⚙️ *What Else We Connect & Automate Inside WhatsApp:*
• *Existing Software Sync:* Voice/text entries straight into Tally Prime, Zoho Books, or Excel/Google Sheets
• *AI Photo Vault:* Upload site/work/bill photos on WhatsApp & retrieve them anytime on-demand
• *Instant Billing & Ops:* Auto-generate GST/Thermal PDFs, track expenses, and qualify leads 24/7

💡 *Financial Impact:* ${magnet.revenueImpact}

Which tools or software do you currently use to manage daily work (e.g., Tally, Excel, WhatsApp, or manual notebooks)?`;
}

/**
 * Format instructions for Gemini System Prompt when handling cold outreach replies
 * @returns {string}
 */
function formatOutreachEnginePrompt() {
  return `
==================================================
OUTREACH & LEAD GENERATION REPLY-HANDLING PLAYBOOK
==================================================
When a prospect replies to an outbound outreach message (e.g. "Yes", "Sure", "Send it", "What is this?", "How does it work?"):
1. ACKNOWLEDGE & DELIVER:
   Deliver the specific Lead Magnet / Workflow Automation breakdown for their industry concisely. Highlight that we don't just build websites — we automate their entire business workflow inside WhatsApp by connecting to their existing software (Tally, Zoho, Excel/Sheets, Billing) and supporting photo upload/retrieval.
2. FINANCIAL & TIME IMPACT ANCHOR:
   State the revenue/time leakage in their industry (e.g. "Missing just 1 villa inquiry is a ₹30 Lakh revenue leak" or saving 10+ hours/week of manual entry).
3. ASK 1 SHARP QUALIFICATION QUESTION:
   Never interrogate. Ask ONLY ONE question to diagnose their current tools or channel (e.g. "Which tools do you currently use for billing/tracking — Tally, Excel, or WhatsApp/notebooks?").
4. TRANSITION TO CRM PIPELINE:
   Once they share their situation, trigger saveLeadDetails tool to automatically move them into the CRM pipeline at stage "4. INTERESTED REPLY" or "5. QUALIFIED" so Suresh can review them in the Daily AI Sales Manager Briefing!`;
}

/**
 * Generate Multi-Stage Follow-Up Message (Day 1, Day 3, Day 7, Day 14)
 * Focused on End-to-End AI Business Workflow Automation (Software Sync + Photo Vault + 24/7 Ops)
 * @param {object} prospect
 * @param {number} day - 1, 3, 7, or 14
 * @returns {object}
 */
function generateFollowUpMessage(prospect = {}, day = 1) {
  const owner = prospect.ownerName || prospect.name || 'there';
  const company = prospect.company || prospect.businessName || 'your business';
  const indKey = resolveIndustryKey(prospect.industry || prospect.businessName || '');
  const magnet = INDUSTRY_LEAD_MAGNETS[indKey] || INDUSTRY_LEAD_MAGNETS.construction;

  const stages = {
    1: {
      stageName: 'Day 1 - Workflow Automation & Software Sync Value',
      english: `Hi ${owner}, Suresh here from SoloDeveloper.pro.

Just following up on my earlier message for *${company}*. Most ${magnet.targetAudience} think we only build websites — actually, we connect *WhatsApp AI directly to your existing software* (Tally, Zoho, Excel/Sheets, Billing) so your team can run billing, expenses, and ${magnet.painPoint} right from WhatsApp.

Would you like to see a 2-minute real example of how it works?`,
      tamil: `வணக்கம் ${owner}, SoloDeveloper.pro-லிருந்து சுரேஷ் பேசுகிறேன்.

*${company}*-க்காக அனுப்பிய மெசேஜின் தொடர்ச்சியாக இது. நாங்கள் வெறும் Website மட்டுமல்ல — நீங்கள் ஏற்கனவே பயன்படுத்தும் *Tally, Zoho, Excel/Sheets, Billing* போன்ற Software-களை WhatsApp AI உடன் கனெக்ட் செய்து, உங்கள் தினசரி வேலைகளை WhatsApp-லேயே Automate செய்கிறோம்.

இதன் 2-Minute Live Example-ஐ அனுப்பலாமா?`
    },
    3: {
      stageName: 'Day 3 - AI Photo Vault & On-Demand Retrieval Proof',
      english: `Hi ${owner}, quick follow-up for *${company}*!

One feature our clients love most is the *WhatsApp AI Photo Vault* — your team simply sends site/work photos, bills, or receipts on WhatsApp, AI auto-organizes them, and anyone authorized can retrieve any photo in seconds on-demand. Combined with 24/7 customer qualification, it saves 10+ hours every week.

Do you have 10 minutes this week for a quick live screen-share demo?`,
      tamil: `வணக்கம் ${owner}! *${company}*-க்காக ஒரு சின்ன Follow-up.

நம் கிளையன்ட்கள் அதிகம் விரும்பும் வசதி *WhatsApp AI Photo Vault* — உங்கள் டீம் Site/Work Photos அல்லது Bills-ஐ WhatsApp-ல் போட்டாலே AI அதைப் பிரித்து சேமித்துவிடும்; எப்போது வேண்டுமானாலும் 2 நொடியில் அந்த போட்டோவைத் திரும்ப எடுக்கலாம். கூடவே 24/7 AI Customer Reply-உம் கிடைக்கும்.

இந்த வாரம் 10 நிமிடம் Live Demo பார்க்கலாமா?`
    },
    7: {
      stageName: 'Day 7 - Priority Pilot Slot & ROI',
      english: `Hi ${owner}, Suresh here. We onboard only 2 custom AI workflow systems at a time so every client's Tally/Sheets/WhatsApp setup runs with 100% accuracy.

If you'd like to automate *${company}*'s daily operations and eliminate manual follow-ups before your next busy cycle, just reply *"DEMO"* and I'll share 2 quick time slots!`,
      tamil: `வணக்கம் ${owner}, சுரேஷ் பேசுகிறேன். ஒவ்வொரு பிசினஸின் Tally/Sheets/WhatsApp Automation-உம் 100% துல்லியமாக இருக்க, ஒரு நேரத்தில் 2 கிளையன்ட்களுக்கு மட்டுமே Custom System அமைத்துத் தருகிறோம்.

*${company}*-ன் தினசரி வேலைகளை Automate செய்ய விருப்பம் இருந்தால் *"DEMO"* என்று reply செய்யுங்கள் — 2 நேரங்களை அனுப்புகிறேன்!`
    },
    14: {
      stageName: 'Day 14 - Polite Closing / Breakup',
      english: `Hi ${owner}, I know you're busy running *${company}*, so I won't crowd your WhatsApp further.

Whenever you're ready to connect your existing tools (Tally, Excel, Billing, Photo Vault) into one 24/7 WhatsApp AI system, just message me here or at https://wa.me/919361599097. Wishing ${company} great growth!`,
      tamil: `வணக்கம் ${owner}, *${company}* வேலைகளில் பிஸியாக இருப்பீர்கள் எனப் புரிகிறது, அதனால் இனி அடிக்கடி மெசேஜ் அனுப்பி தொந்தரவு செய்ய மாட்டேன்.

எப்போது உங்கள் Tally, Excel, Billing மற்றும் Photo Vault வேலைகளை WhatsApp AI மூலம் Automate செய்ய நினைக்கிறீர்களோ, அப்போது ஒரு மெசேஜ் செய்யுங்கள் (https://wa.me/919361599097). நன்றி!`
    }
  };

  const selected = stages[day] || stages[1];
  return {
    day,
    stageName: selected.stageName,
    english: selected.english,
    tamil: selected.tamil,
    primaryMessage: selected.english
  };
}

module.exports = {
  INDUSTRY_LEAD_MAGNETS,
  resolveIndustryKey,
  generateOutreachScript,
  generateAuditDeliveryMessage,
  generateFollowUpMessage,
  formatOutreachEnginePrompt
};
