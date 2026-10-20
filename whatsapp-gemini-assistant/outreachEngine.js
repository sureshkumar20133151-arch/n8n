// SOLODEVELOPER AI BUSINESS AGENT - OUTREACH & LEAD GENERATION ENGINE
// Based on Alex Hormozi's Lead Magnet & Cold Outreach Framework:
// "It took me 5 years to solve [pain]. After 100+ trials I built [lead magnet] that helps [audience] achieve [outcome]. Mind if I share it?"
// Transforms cold target lists into qualified conversations and fills the CRM pipeline automatically.

const { detectIndustry } = require('./industryKnowledgeBase');

const INDUSTRY_LEAD_MAGNETS = {
  construction: {
    leadMagnet: "Free 5-Minute Builder WhatsApp Sales Leakage Audit",
    painPoint: "losing high-ticket villa enquiries when site teams are busy on construction sites",
    dreamOutcome: "qualify every home buyer's budget in 60 seconds and book site visits 24/7 without extra staff",
    targetAudience: "construction firms and builders",
    revenueImpact: "At ₹25L–₹40L per villa project, even 1 missed inquiry per month is a ₹30 Lakh+ revenue leak.",
    auditDeliverable: "1. Speed-to-Lead Response Test (How fast buyers get brochures)\n2. 60-Second Budget Qualification Flow\n3. Instant Google Calendar Site Visit Booking Blueprint"
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

It took me 5 years to solve the problem of ${magnet.painPoint}.

After 100+ trials I built a ${magnet.leadMagnet} that helps ${magnet.targetAudience} ${magnet.dreamOutcome}.

Mind if I share it with you?`;

  const tamilHook = `வணக்கம் ${owner}!

${company}-ல் ${magnet.painPoint} போன்ற சவால்களை தவிர்க்க 5 வருட அனுபவத்தில் ஒரு சிஸ்டம் உருவாக்கியுள்ளேன்.

இதற்காக நாங்கள் உருவாக்கியுள்ள "${magnet.leadMagnet}" மூலம் ${magnet.dreamOutcome} எளிதாக சாத்தியமாகிறது.

உங்களுக்கு இந்த 3-Minute Audit Breakdown-ஐ WhatsApp-ல் அனுப்பலாமா?`;

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

  return `Great to connect with you, ${owner}! Here is the core framework of the *${magnet.leadMagnet}* for ${company}:

${magnet.auditDeliverable}

💡 *Financial Impact:* ${magnet.revenueImpact}

We build autonomous WhatsApp systems that solve this in 60 seconds with zero staff overhead.

Are most of your current inquiries coming from Instagram, Google, or referrals?`;
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
When a prospect replies to an outbound outreach message (e.g. "Yes", "Sure", "Send it", "What is this?"):
1. ACKNOWLEDGE & DELIVER:
   Deliver the specific Lead Magnet for their industry concisely.
2. FINANCIAL IMPACT ANCHOR:
   State the revenue leakage in their industry (e.g. "Missing just 1 villa inquiry is a ₹30 Lakh revenue leak").
3. ASK 1 SHARP QUALIFICATION QUESTION:
   Never interrogate. Ask ONLY ONE question to diagnose their current channel (e.g. "Are most of your inquiries coming from Instagram or referrals?").
4. TRANSITION TO CRM PIPELINE:
   Once they share their situation, trigger saveLeadDetails tool to automatically move them into the CRM pipeline at stage "4. INTERESTED REPLY" or "5. QUALIFIED" so Suresh can review them in the Daily AI Sales Manager Briefing!`;
}

module.exports = {
  INDUSTRY_LEAD_MAGNETS,
  resolveIndustryKey,
  generateOutreachScript,
  generateAuditDeliveryMessage,
  formatOutreachEnginePrompt
};
