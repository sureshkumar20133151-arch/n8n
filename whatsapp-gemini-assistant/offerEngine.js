// SOLODEVELOPER AI BUSINESS AGENT - GRAND SLAM OFFER & CRM PIPELINE INTELLIGENCE ENGINE
// Based on Alex Hormozi's Value Equation: (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
// Turns raw lead data into an irresistible 6-part Grand Slam Offer, calculates Value Gap, classifies CRM Pipeline Deal, and generates hyper-personalized follow-up sequences.

const { INDUSTRY_KNOWLEDGE } = require('./industryKnowledgeBase');

const PIPELINE_STAGES = [
  "1. NEW LEAD",
  "2. QUALIFIED",
  "3. DISCOVERY COMPLETED",
  "4. STRATEGY CALL BOOKED",
  "5. PROPOSAL SENT",
  "6. NEGOTIATION",
  "7. WON (CLOSED)",
  "8. LOST"
];

const CONVERSATION_INTENTS = [
  "Ready To Buy",
  "Urgent Problem",
  "Comparing Options",
  "Researching",
  "Just Curious"
];

const OBJECTION_BUSTING_BONUSES = [
  {
    name: "Bonus #1: Local Authority & Google Maps 5-Star SEO Blueprint",
    value: "₹4,999 (Included Free)",
    removesObjection: "Removes: 'Will local customers actually find me online?'",
    description: "Optimized Google Business profile setup to capture local searchers before competitors."
  },
  {
    name: "Bonus #2: Automated Multi-Stage CRM Follow-up Sequence in n8n",
    value: "₹7,999 (Included Free)",
    removesObjection: "Removes: 'What happens after leads come? We might drop them.'",
    description: "Automated 24h, 3-day, and 7-day re-engagement messages for cold inquiries on WhatsApp."
  },
  {
    name: "Bonus #3: Lifetime Free Cloud Hosting Architecture",
    value: "₹3,500/year (Included Free)",
    removesObjection: "Removes: 'Are there expensive monthly software subscriptions?'",
    description: "Deployed on high-speed Vercel/Render edge networks with zero mandatory monthly SaaS fees."
  },
  {
    name: "Bonus #4: Founder Screen-Recorded Walkthrough & Staff Training Video",
    value: "₹2,500 (Included Free)",
    removesObjection: "Removes: 'My team is non-technical, what if we can't operate it?'",
    description: "A tailored step-by-step video training your team how to manage inquiries in 5 minutes a day."
  }
];

const RISK_REVERSAL_GUARANTEES = [
  "⚡ 7-Day Fast Turnaround Guarantee (Launch before your next campaign or rush)",
  "🏷️ 100% Fixed Transparent Pricing (Zero hidden charges, zero surprise invoices)",
  "🛠️ 30-Day Free Post-Launch Support & Optimization (Direct WhatsApp support from Suresh)",
  "🛡️ Demo-First Process: Plan -> Interactive Wireframe Review -> Live Production Deployment",
  "🤝 Zero-Complexity Guarantee: If your team cannot comfortably use the system after training, Suresh personally configures and simplifies the workflow until your team is 100% confident."
];

const OFFER_MATURITY_LEVELS = {
  1: {
    level: "Level 1: Digital Foundation",
    idealFor: "Freelancers, solo professionals, early-stage businesses (< ₹5L/year)",
    deliverables: "High-Speed Mobile-First Website + SEO Foundation + Direct WhatsApp Chat Button + Google Maps Setup",
    pricing: "₹8,999 – ₹9,999 fixed",
    estimatedDealValue: 9999
  },
  2: {
    level: "Level 2: Lead Generation Funnel",
    idealFor: "Growing local businesses & service providers (₹5L – ₹25L/year)",
    deliverables: "High-Converting Landing Page + Lead Capture Form + Meta/Google Ads Funnel + Instant Lead Notification to WhatsApp & Sheet",
    pricing: "₹14,999 – ₹24,999 fixed",
    estimatedDealValue: 19999
  },
  3: {
    level: "Level 3: Autonomous AI Agent System",
    idealFor: "Scaling companies with high inquiry volume (₹25L – ₹1Cr/year)",
    deliverables: "Full Business Website + 24/7 Autonomous WhatsApp AI Agent (Tamil & English NLP) + Pre-Qualification + Instant Calendar Site/Consultation Booking + n8n Multi-Stage CRM",
    pricing: "Custom Quote tailored to lead volume",
    estimatedDealValue: 29999
  },
  4: {
    level: "Level 4: Complete Business Operating System",
    idealFor: "Established enterprises & multi-branch firms (₹1Cr+/year)",
    deliverables: "Multi-Agent AI Ecosystem + ERP/Inventory Integration + Automated Multi-Stage Customer Followup + Custom Admin Analytics Dashboard",
    pricing: "Custom Quote Enterprise",
    estimatedDealValue: 49999
  }
};

const INDUSTRY_DEAL_BENCHMARKS = {
  construction: { avgDeal: "₹15 Lakh – ₹40 Lakh", unit: "per turnkey villa / apartment project" },
  interiorDesign: { avgDeal: "₹4 Lakh – ₹15 Lakh", unit: "per luxury villa design contract" },
  realEstate: { avgDeal: "₹25 Lakh – ₹1 Crore", unit: "per plot / apartment booking" },
  clinicHealthcare: { avgDeal: "₹1,500 – ₹10,000", unit: "per patient treatment course" },
  restaurantFood: { avgDeal: "₹600 – ₹3,000", unit: "per direct order / banquet event" },
  retailBoutique: { avgDeal: "₹2,000 – ₹10,000", unit: "per order basket" },
  educationCoaching: { avgDeal: "₹20,000 – ₹75,000", unit: "per annual student enrollment" },
  manufacturingB2B: { avgDeal: "₹3 Lakh – ₹25 Lakh", unit: "per commercial Purchase Order" },
  professionalServices: { avgDeal: "₹35,000 – ₹3 Lakh", unit: "per annual corporate retainer" },
  ecommerceD2C: { avgDeal: "₹1,000 – ₹4,000", unit: "per customer order (AOV)" }
};

/**
 * Calculate the Opportunity Gap and ROI anchor
 * @param {object} lead
 * @returns {object}
 */
function calculateValueGap(lead = {}) {
  const industryKey = lead.industryKey || 'construction';
  const benchmark = INDUSTRY_DEAL_BENCHMARKS[industryKey] || INDUSTRY_DEAL_BENCHMARKS.construction;
  const currentVolume = lead.monthlyEnquiries || "3-5 current monthly deals";
  const dreamVolume = lead.dreamOutcome || "10+ monthly qualified deals";
  
  return {
    averageCustomerValue: benchmark.avgDeal,
    unit: benchmark.unit,
    currentVolume,
    desiredVolume: dreamVolume,
    opportunitySummary: `At an average customer value of ${benchmark.avgDeal} ${benchmark.unit}, bridging the gap to ${dreamVolume} represents massive revenue potential where an automation system pays for itself 20x to 50x over on the first closed deal.`
  };
}

/**
 * Determine the Offer Maturity Level based on company size and revenue
 * @param {object} lead
 * @returns {object}
 */
function determineOfferMaturityLevel(lead = {}) {
  const rev = (lead.revenueRange || '').toLowerCase();
  const team = (lead.teamSize || '').toLowerCase();

  if (rev.includes('1cr+') || team.includes('50+') || team.includes('multi')) {
    return OFFER_MATURITY_LEVELS[4];
  } else if (rev.includes('25l') || rev.includes('1cr') || team.includes('10') || team.includes('20')) {
    return OFFER_MATURITY_LEVELS[3];
  } else if (rev.includes('5l') || rev.includes('25l') || team.includes('5') || team.includes('team')) {
    return OFFER_MATURITY_LEVELS[2];
  } else {
    return OFFER_MATURITY_LEVELS[1];
  }
}

/**
 * Calculate CRM Pipeline deal data: stage, intent, deal value, probability & forecast
 * @param {object} lead
 * @returns {object}
 */
function calculatePipelineDeal(lead = {}) {
  const maturity = determineOfferMaturityLevel(lead);
  const score = (lead.leadScore || 'Hot').toLowerCase();
  const urgency = (lead.urgency || '').toLowerCase();
  const timeline = (lead.timeline || '').toLowerCase();

  // Conversation Intent
  let intent = "Researching";
  if (timeline.includes('immediate') || urgency.includes('critical')) {
    intent = "Ready To Buy";
  } else if (urgency.includes('high') || lead.painSeverity === 'Critical') {
    intent = "Urgent Problem";
  } else if (timeline.includes('month') || lead.budgetStatus === 'Allocated') {
    intent = "Comparing Options";
  }

  // Pipeline Stage
  let stage = "1. NEW LEAD";
  if (score === 'hot' || intent === 'Ready To Buy' || intent === 'Urgent Problem') {
    stage = "2. QUALIFIED";
  }

  // Deal Value & Probability
  const dealValue = maturity.estimatedDealValue;
  let winProb = 50;
  if (score === 'hot') winProb = 80;
  else if (score === 'cold') winProb = 25;

  const revenueForecast = Math.round(dealValue * (winProb / 100));

  return {
    pipelineStage: stage,
    conversationIntent: intent,
    estimatedDealValue: `₹${dealValue.toLocaleString('en-IN')}`,
    winProbability: `${winProb}%`,
    revenueForecast: `₹${revenueForecast.toLocaleString('en-IN')}`
  };
}

/**
 * Generate hyper-personalized multi-stage follow-up messages
 * @param {object} lead
 * @returns {object}
 */
function generatePersonalizedFollowups(lead = {}) {
  const name = lead.name || 'Friend';
  const company = lead.company || 'your business';
  const industry = lead.industry || 'your industry';
  const pain = lead.painPoint || 'manual bottlenecks';
  const dream = lead.dreamOutcome || 'more qualified clients';
  const offer = lead.grandSlamOffer || 'Growth & Automation System';

  return {
    vipAcknowledgement: `வணக்கம் ${name}! Suresh Kumar (Founder, SoloDeveloper) has received your requirement for ${company}. He is personally reviewing your ${offer} and will connect with you shortly for a 10-minute strategy call. If you have any immediate questions about eliminating "${pain}", feel free to reply right here!`,

    day1ValueHook: `Hi ${name}! Suresh here from SoloDeveloper. Yesterday you mentioned that ${company} is facing "${pain}". I put together a quick case study on how other ${industry} businesses solve this to achieve "${dream}" without hiring extra staff. Would you like to review the 3-minute video breakdown?`,

    day3Strategy: `Hi ${name}, hope your week is going great! Most ${industry} leaders we consult lose high-ticket clients simply because inquiries take more than 5 minutes to respond to. With your custom ${offer}, incoming inquiries are pre-qualified in 60 seconds 24/7. Do you have 10 minutes this week for a live walkthrough?`,

    day7ClosingInvite: `Hi ${name}, Suresh here. We are finalizing our implementation dates for this fortnight (we onboard only 2 custom client systems at a time to maintain 100% engineering quality). If you'd still like to deploy your ${offer} for ${company} before your next busy cycle, let's connect and get your pilot live this week! Direct WhatsApp: https://wa.me/919361599097`
  };
}

/**
 * Programmatically generate a complete 6-part Grand Slam Offer with CRM pipeline deal metrics
 * @param {object} lead
 * @returns {object}
 */
function generateGrandSlamOffer(lead = {}) {
  const industryKey = lead.industryKey || 'construction';
  const mod = INDUSTRY_KNOWLEDGE[industryKey] || INDUSTRY_KNOWLEDGE.construction;
  const company = lead.company || 'Your Business';
  const bottleneck = lead.painPoint || mod.commonProblems[0];
  const dream = lead.dreamOutcome || mod.dreamOutcomes[0];
  const trigger = lead.buyingTrigger || (mod.buyingTriggers ? mod.buyingTriggers[0] : 'Scaling business growth');

  const maturity = determineOfferMaturityLevel(lead);
  const valueGap = calculateValueGap(lead);
  const deal = calculatePipelineDeal(lead);
  const followups = generatePersonalizedFollowups({ ...lead, grandSlamOffer: `${company} — ${mod.offerTemplate}` });

  const coreOfferName = `${company} — ${mod.offerTemplate}`;
  const uniqueMechanism = mod.mechanism || `24/7 Tamil & English WhatsApp AI Qualifier + CRM Pipeline + Next.js Authority System`;

  return {
    company,
    industry: mod.name,
    pipelineDeal: deal,
    offerMaturityLevel: maturity.level,
    maturityDescription: maturity.deliverables,
    coreOfferName,
    uniqueMechanism,
    valueGap,
    transformationStatement: `Transform ${company} from losing deals due to "${bottleneck}" into achieving "${dream}" using our ${mod.offerTemplate}.`,
    bonuses: OBJECTION_BUSTING_BONUSES,
    guarantees: RISK_REVERSAL_GUARANTEES,
    pricingPositioning: {
      entryStartingPrice: maturity.pricing,
      roiAnchor: valueGap.opportunitySummary
    },
    urgencyHook: `Take action now: Setup is timed for "${trigger}" — Suresh onboards only 2 new client systems every fortnight to ensure 100% white-glove engineering.`,
    closingCheatSheet: {
      hook: `Hi ${lead.name || 'there'}, I noticed you run ${company}. You mentioned you're losing deals because "${bottleneck}".`,
      pitch: `We build the ${coreOfferName} (${maturity.level}) which automates qualification in 60s and eliminates this bottleneck completely.`,
      callToAction: `Can I walk you through a 10-minute live demonstration on WhatsApp or Google Meet tomorrow?`
    },
    followups
  };
}

/**
 * Format instructions for Gemini System Prompt on how to craft Grand Slam Offers & CRM Deal Pipeline
 * @returns {string}
 */
function formatOfferEnginePrompt() {
  return `
==================================================
GRAND SLAM OFFER & CRM PIPELINE INTELLIGENCE FORMULA
==================================================
Whenever you diagnose a customer's business and call saveLeadDetails, formulate an IRRESISTIBLE GRAND SLAM OFFER and CRM PIPELINE DOSSIER:

1. [CORE OFFER NAME]:
   Format: [Client Business Name] + [Industry Solution Name]
   Example: "Apex Interiors — Premium Luxury Client Acquisition & WhatsApp AI System"

2. [OFFER MATURITY LEVEL]:
   Match the client to the right maturity level:
   • Level 1: Digital Foundation (Solo/Early-stage, < ₹5L/yr) -> High-Speed Website + SEO + WhatsApp CTA (₹8,999 – ₹9,999)
   • Level 2: Lead Generation Funnel (Scaling, ₹5L–₹25L/yr) -> Landing Page + Lead Capture + Ads Funnel (₹14,999 – ₹24,999)
   • Level 3: Autonomous AI Agent System (Growing, ₹25L–₹1Cr/yr) -> 24/7 WhatsApp AI Agent (Tamil + English) + Qualification + Calendar Booking (₹29,999)
   • Level 4: Complete Business Operating System (Established, ₹1Cr+/yr) -> Multi-Agent Ecosystem + CRM + ERP/Inventory Integration (₹49,999+)

3. [CRM PIPELINE DEAL METRICS]:
   Classify:
   • Pipeline Stage: "1. NEW LEAD" (exploring) or "2. QUALIFIED" (high urgency/fit)
   • Conversation Intent: "Ready To Buy", "Urgent Problem", "Comparing Options", "Researching", or "Just Curious"
   • Estimated Deal Value: e.g. ₹9,999, ₹19,999, ₹29,999, or ₹49,999
   • Win Probability: 80% (Hot), 50% (Warm), 25% (Cold)
   • Revenue Forecast: Estimated Deal Value × Win Probability

4. [VALUE GAP & ROI CALCULATION]:
   Calculate the financial gap to make the investment a no-brainer:
   - Identify: Average Deal Value (e.g. ₹5 Lakh for Interior Design, ₹30 Lakh for Construction)
   - Contrast: Current monthly deals vs. Desired monthly deals
   - Calculate Opportunity: e.g. "Bridging from 2 to 5 villa projects = ₹15L–₹24L/month in additional potential. A ₹25k system pays for itself 50x over on the first closed contract."

5. [UNIQUE MECHANISM]:
   The proprietary engine built by Suresh.
   Example: "Autonomous 60-Second Tamil & English WhatsApp Budget Qualifier + 3D Portfolio Showcase + Instant Google Calendar Site Visit Booking + n8n CRM Pipeline."

6. [OBJECTION-BUSTING BONUSES STACK]:
   Every offer includes:
   • Bonus 1: Google Maps 5-Star Local Authority Blueprint (Removes: 'Will customers find me?')
   • Bonus 2: Automated 3-Stage WhatsApp Re-engagement Sequence in n8n (Removes: 'What happens after leads come?')
   • Bonus 3: Lifetime Cloud Architecture on Vercel/Render (Removes: 'Are there expensive monthly SaaS bills?')
   • Bonus 4: Personal Founder Video Training for their staff (Removes: 'My team is non-technical')

7. [IRONCLAD RISK REVERSAL]:
   • 7-Day Fast Turnaround Guarantee
   • 100% Fixed Pricing (Zero surprises)
   • 30-Day Free Post-Launch Engineering Support
   • Demo-First Delivery Process
   • Zero-Complexity Guarantee: Suresh personally fine-tunes the system until the client's team is 100% comfortable.

8. [REASON TO ACT NOW (URGENCY)]:
   Connect directly to their BUYING TRIGGER (e.g. upcoming project launch, festival rush, or competitors taking market share) + "Suresh accepts only 2 custom client builds per fortnight to maintain 100% engineering quality."`;
}

module.exports = {
  generateGrandSlamOffer,
  formatOfferEnginePrompt,
  calculateValueGap,
  determineOfferMaturityLevel,
  calculatePipelineDeal,
  generatePersonalizedFollowups,
  OBJECTION_BUSTING_BONUSES,
  RISK_REVERSAL_GUARANTEES,
  OFFER_MATURITY_LEVELS,
  PIPELINE_STAGES,
  CONVERSATION_INTENTS
};
