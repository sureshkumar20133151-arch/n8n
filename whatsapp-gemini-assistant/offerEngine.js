// SOLODEVELOPER AI BUSINESS AGENT - GRAND SLAM OFFER GENERATION ENGINE
// Based on Alex Hormozi's Value Equation: (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
// Turns raw lead data into an irresistible 6-part Grand Slam Offer.

const { INDUSTRY_KNOWLEDGE } = require('./industryKnowledgeBase');

const STANDARD_BONUSES = [
  {
    name: "Bonus #1: Local Authority & Google Maps 5-Star SEO Blueprint",
    value: "₹4,999 (Included Free)",
    description: "Optimized Google Business profile setup to capture local searchers before competitors."
  },
  {
    name: "Bonus #2: Automated Multi-Stage CRM Follow-up Sequence (n8n)",
    value: "₹7,999 (Included Free)",
    description: "Automated 24h, 3-day, and 7-day re-engagement messages for cold inquiries on WhatsApp."
  },
  {
    name: "Bonus #3: Lifetime Free Cloud Hosting Architecture",
    value: "₹3,500/year (Included Free)",
    description: "Deployed on high-speed Vercel/Render edge networks with zero mandatory recurring software fees."
  },
  {
    name: "Bonus #4: Founder Screen-Recorded Walkthrough & Staff Training Video",
    value: "₹2,500 (Included Free)",
    description: "A tailored step-by-step video training your team how to manage inquiries in 5 minutes a day."
  }
];

const RISK_REVERSAL_GUARANTEES = [
  "⚡ 7-Day Fast Turnaround Guarantee (Launch before your next campaign/rush)",
  "🏷️ 100% Fixed Transparent Pricing (Zero hidden charges, zero surprise invoices)",
  "🛠️ 30-Day Free Post-Launch Support & Optimization (Direct WhatsApp support from Suresh)",
  "🛡️ Demo-First Process: Plan -> Interactive Wireframe Review -> Live Production Deployment"
];

/**
 * Programmatically generate a complete 6-part Grand Slam Offer
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

  const coreOfferName = `${company} — ${mod.offerTemplate}`;
  const uniqueMechanism = mod.mechanism || `24/7 Tamil & English WhatsApp AI Qualifier + CRM Pipeline + Next.js Authority System`;

  return {
    company,
    industry: mod.name,
    coreOfferName,
    uniqueMechanism,
    transformationStatement: `Transform ${company} from losing deals due to "${bottleneck}" into achieving "${dream}" using our ${mod.offerTemplate}.`,
    bonuses: STANDARD_BONUSES,
    guarantees: RISK_REVERSAL_GUARANTEES,
    pricingPositioning: {
      entryStartingPrice: "Starts at ₹8,999 – ₹9,999 for foundational websites",
      aiAutonomousSystem: "Custom Quote tailored to business volume",
      roiAnchor: "A single closed client/contract pays for the entire system 5x to 20x over."
    },
    urgencyHook: `Take action now: Setup is timed for "${trigger}" — Suresh onboard only 2 new client systems every fortnight to ensure 100% white-glove engineering.`,
    closingCheatSheet: {
      hook: `Hi ${lead.name || 'there'}, I noticed you run ${company}. You mentioned you're losing deals because "${bottleneck}".`,
      pitch: `We build the ${coreOfferName} which automates qualification in 60s and eliminates this bottleneck completely.`,
      callToAction: `Can I walk you through a 10-minute live demonstration on WhatsApp or Google Meet tomorrow?`
    }
  };
}

/**
 * Format instructions for Gemini System Prompt on how to craft Grand Slam Offers
 * @returns {string}
 */
function formatOfferEnginePrompt() {
  return `
==================================================
GRAND SLAM OFFER GENERATION FORMULA (ALEX HORMOZI MODEL)
==================================================
Whenever you diagnose a customer's business and call saveLeadDetails, formulate an IRRESISTIBLE GRAND SLAM OFFER combining:

1. [CORE OFFER NAME]:
   Format: [Client Business Name] + [Industry Solution Name]
   Example: "Apex Interiors — Premium Luxury Client Acquisition & WhatsApp AI System"

2. [UNIQUE MECHANISM]:
   The proprietary engine built by Suresh.
   Example: "Autonomous 60-Second Tamil & English WhatsApp Budget Qualifier + 3D Portfolio Showcase + Instant Google Calendar Site Visit Booking + n8n CRM Pipeline."

3. [HIGH-VALUE BONUSES STACK]:
   Every offer includes:
   • Bonus 1: Google Maps 5-Star Local Reputation Blueprint (₹4,999 value - FREE)
   • Bonus 2: Automated 3-Stage WhatsApp Re-engagement Sequence in n8n (₹7,999 value - FREE)
   • Bonus 3: Lifetime Cloud Architecture on Vercel/Render (Zero recurring monthly SaaS retainers)
   • Bonus 4: Personal Founder Video Training for their staff (₹2,500 value - FREE)

4. [IRONCLAD RISK REVERSAL]:
   • 7-Day Fast Turnaround Guarantee
   • 100% Fixed Pricing (Zero surprises)
   • 30-Day Free Post-Launch Engineering Support
   • Demo-First Delivery Process

5. [ROI ANCHOR & PRICING POSITIONING]:
   Anchor the investment against the cost of lost deals!
   Example: "For a builder losing ₹10L+ in apartment bookings every month, an automated qualification system pays for itself 50x over on the very first closed booking."

6. [REASON TO ACT NOW (URGENCY)]:
   Connect directly to their BUYING TRIGGER (e.g. upcoming project launch, festival rush, or competitors taking market share) + "Suresh accepts only 2 custom client builds per fortnight to maintain 100% engineering quality."`;
}

module.exports = {
  generateGrandSlamOffer,
  formatOfferEnginePrompt,
  STANDARD_BONUSES,
  RISK_REVERSAL_GUARANTEES
};
