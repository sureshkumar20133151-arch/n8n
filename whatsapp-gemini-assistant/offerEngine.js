// SOLODEVELOPER AI BUSINESS AGENT - GRAND SLAM OFFER & CRM PIPELINE INTELLIGENCE ENGINE
// Based on Alex Hormozi's Value Equation: (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
// Turns raw lead data into an irresistible 6-part Grand Slam Offer, calculates Value Gap, classifies CRM Pipeline Deal, and generates hyper-personalized follow-up sequences.

const { INDUSTRY_KNOWLEDGE } = require('./industryKnowledgeBase');

const PIPELINE_STAGES = [
  "1. PROSPECT IDENTIFIED",
  "2. AI RESEARCHED",
  "3. OUTREACH SENT",
  "4. INTERESTED REPLY",
  "5. QUALIFIED",
  "6. STRATEGY CALL BOOKED",
  "7. PROPOSAL SENT",
  "8. NEGOTIATION",
  "9. WON (CLOSED)",
  "10. LOST"
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
    level: "Level 1: Growth Stack — Modern Digital Foundation",
    category: "Growth-Focused",
    idealFor: "Freelancers, solo professionals, early-stage businesses (< ₹5L/year) needing brand elevation and first clients",
    deliverables: "High-Speed Modern Website with Scroll Animations & Micro-interactions + SEO Foundation + Direct WhatsApp Chat CTA + Google Maps Setup",
    pricing: "₹8,999 – ₹9,999 fixed",
    estimatedDealValue: 9999
  },
  2: {
    level: "Level 2: Growth Stack — High-Converting Ads & Funnel",
    category: "Growth-Focused",
    idealFor: "Growing local businesses & service providers (₹5L – ₹25L/year) seeking predictable inbound leads",
    deliverables: "Modern Conversion Landing Page (Interactive UI + Micro-interactions) + Lead Capture Funnel + Meta/Google Ads Architecture + Instant WhatsApp & Sheet Lead Notifications",
    pricing: "₹14,999 – ₹24,999 fixed",
    estimatedDealValue: 19999
  },
  3: {
    level: "Level 3: Automation Stack — Autonomous AI Agent & CRM",
    category: "Automation-Focused",
    idealFor: "Scaling companies with high inquiry volume (₹25L – ₹1Cr/year) struggling with manual tracking, Excel/notebook logs, and slow replies",
    deliverables: "24/7 Autonomous WhatsApp AI Receptionist (Tamil & English NLP) + Zero-Interrogation Qualification + Instant Calendar Booking + n8n Multi-Stage CRM Pipeline (eliminates Excel/notebooks)",
    pricing: "Custom Quote tailored to lead volume",
    estimatedDealValue: 29999
  },
  4: {
    level: "Level 4: Full-Stack Digital Ecosystem — Growth & Automation Partner",
    category: "All-in-One (Growth + Automation)",
    idealFor: "Established enterprises & ambitious businesses (₹25L – ₹1Cr+/year) that need both world-class branding AND automated operations",
    deliverables: "Modern Website with Scroll Animations & Micro-interactions + 24/7 WhatsApp AI Sales Agent + Multi-Stage n8n CRM Pipeline + ERP/Inventory Webhooks + Staff Training",
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

  const parseTeam = (t) => {
    const m = t.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const teamNum = parseTeam(team);

  if (rev.includes('1cr+') || teamNum >= 50 || team.includes('multi')) {
    return OFFER_MATURITY_LEVELS[4];
  } else if (/\b1cr\b/.test(rev) || /\b25l\b/.test(rev) || (teamNum >= 10 && teamNum < 50)) {
    return OFFER_MATURITY_LEVELS[3];
  } else if (/\b5l\b/.test(rev) || (teamNum >= 3 && teamNum < 10) || team.includes('team')) {
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

  // Pipeline Stage (aligned with PIPELINE_STAGES constants)
  let stage = PIPELINE_STAGES[0]; // "1. PROSPECT IDENTIFIED"
  if (score === 'hot' || intent === 'Ready To Buy' || intent === 'Urgent Problem') {
    stage = PIPELINE_STAGES[4]; // "5. QUALIFIED"
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
  const salesManager = calculateSalesManagerMetrics({ ...lead, pipelineDeal: deal });
  const followups = generatePersonalizedFollowups({ ...lead, grandSlamOffer: `${company} — ${mod.offerTemplate}` });

  const coreOfferName = `${company} — ${mod.offerTemplate}`;
  const uniqueMechanism = mod.mechanism || `24/7 Bilingual (Tamil + English) WhatsApp AI Qualifier for ${mod.name} + Autonomous n8n Lead Capture + Next.js Authority System`;

  return {
    company,
    industry: mod.name,
    pipelineDeal: deal,
    salesManager,
    priorityRank: salesManager.priorityRank,
    aiRecommendedAction: salesManager.aiRecommendedAction,
    dealRisk: salesManager.dealRisk,
    closingProbabilityReason: salesManager.closingProbabilityReason,
    nextBestMessage: salesManager.nextBestMessage,
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
 * Calculate AI Sales Manager Priority Score (0-100), Rank, Recommended Action, Deal Risk, Probability Reason, and Next Best Message
 * @param {object} lead
 * @returns {object}
 */
function calculateSalesManagerMetrics(lead = {}) {
  // 1. Pain Severity Score (max 25)
  const painSev = (lead.painSeverity || '').toLowerCase();
  let painScore = 15;
  if (painSev.includes('critical')) painScore = 25;
  else if (painSev.includes('high')) painScore = 20;
  else if (painSev.includes('mod')) painScore = 12;
  else if (painSev.includes('low')) painScore = 5;

  // 2. Buying Intent Score (max 25)
  const intent = (lead.conversationIntent || lead.pipelineDeal?.conversationIntent || '').toLowerCase();
  let intentScore = 15;
  if (intent.includes('ready to buy')) intentScore = 25;
  else if (intent.includes('urgent')) intentScore = 22;
  else if (intent.includes('comparing')) intentScore = 16;
  else if (intent.includes('researching')) intentScore = 10;
  else if (intent.includes('curious')) intentScore = 5;

  // 3. Budget Availability Score (max 20)
  const budget = (lead.budgetStatus || '').toLowerCase();
  let budgetScore = 12;
  if (budget.includes('allocated')) budgetScore = 20;
  else if (budget.includes('deciding')) budgetScore = 15;
  else if (budget.includes('guidance')) budgetScore = 10;
  else if (budget.includes('none') || budget.includes('no')) budgetScore = 3;

  // 4. Timeline Urgency Score (max 15)
  const timeline = (lead.timeline || '').toLowerCase();
  const urgency = (lead.urgency || '').toLowerCase();
  let timelineScore = 10;
  if (timeline.includes('immediate') || urgency.includes('critical')) timelineScore = 15;
  else if (timeline.includes('month') || urgency.includes('high')) timelineScore = 12;
  else if (timeline.includes('exploring') || urgency.includes('low')) timelineScore = 5;

  // 5. Revenue Potential Score (max 15)
  const rev = (lead.revenueRange || '').toLowerCase();
  let revenueScore = 10;
  if (rev.includes('1cr+')) revenueScore = 15;
  else if (/\b1cr\b/.test(rev)) revenueScore = 14;
  else if (/\b25l\b/.test(rev)) revenueScore = 12;
  else if (/\b5l\b/.test(rev)) revenueScore = 10;
  else revenueScore = 6;

  const priorityScore = Math.min(100, painScore + intentScore + budgetScore + timelineScore + revenueScore);

  // Priority Rank
  let priorityRank = "#3 Priority (Nurture & Demo)";
  if (priorityScore >= 80) {
    priorityRank = "#1 Priority (VIP Closing Call)";
  } else if (priorityScore >= 65) {
    priorityRank = "#2 Priority (High Probability)";
  } else if (priorityScore < 50) {
    priorityRank = "#4 Priority (Automated Follow-up)";
  }

  // AI Recommended Action
  let aiRecommendedAction = "Schedule Demo / Walkthrough";
  if (priorityScore >= 80 && (intent.includes('ready') || intent.includes('urgent') || timeline.includes('immediate') || painSev.includes('critical'))) {
    aiRecommendedAction = "Call Now (Direct Closing Call)";
  } else if (intent.includes('comparing')) {
    aiRecommendedAction = "Send Proposal & Interactive Wireframe";
  } else if (budget.includes('guidance') || intent.includes('researching')) {
    aiRecommendedAction = "Send Case Study & ROI Breakdown";
  } else if (priorityScore < 50) {
    aiRecommendedAction = "Reactivate via Automated Nurture Sequence";
  }

  // Deal Risk
  const auth = (lead.authorityLevel || '').toLowerCase();
  let dealRisk = "Low Risk (Fast close expected)";
  const riskReasons = [];
  if (auth.includes('employee') || auth.includes('researcher')) {
    riskReasons.push("Non-decision maker contact");
  }
  if (budget.includes('guidance') || budget.includes('none') || budget.includes('no')) {
    riskReasons.push("Budget unallocated");
  }
  if (timeline.includes('exploring') || intent.includes('curious')) {
    riskReasons.push("Low urgency / exploring");
  }

  if (riskReasons.length >= 2) {
    dealRisk = `High Risk (${riskReasons.join(', ')})`;
  } else if (riskReasons.length === 1) {
    dealRisk = `Medium Risk (${riskReasons[0]})`;
  }

  // Closing Probability Reason
  const positiveSignals = [];
  if (auth.includes('decision') || auth.includes('founder') || auth.includes('owner')) positiveSignals.push('Direct Decision Maker');
  if (budget.includes('allocated')) positiveSignals.push('Allocated Budget');
  if (timeline.includes('immediate') || urgency.includes('high') || urgency.includes('critical')) positiveSignals.push('Urgent Timeline');
  if (painScore >= 20) positiveSignals.push('Critical Pain');
  if (revenueScore >= 12) positiveSignals.push('Strong Revenue Base');

  const closingProbabilityReason = positiveSignals.length > 0
    ? `Score: ${priorityScore}/100. High probability drivers: ${positiveSignals.join(', ')}.`
    : `Score: ${priorityScore}/100. Nurture required: Needs decision-maker buy-in and timeline confirmation.`;

  // Next Best Message (WhatsApp ready copy-paste)
  const name = lead.name || 'Friend';
  const company = lead.company || 'your business';
  const pain = lead.painPoint || 'lead bottlenecks';
  const offer = lead.grandSlamOffer || 'Growth & AI System';

  let nextBestMessage = "";
  if (aiRecommendedAction.includes('Call Now')) {
    nextBestMessage = `வணக்கம் ${name}! Suresh here from SoloDeveloper. I reviewed your requirements for ${company} regarding ${pain}. I've mapped out a live 10-minute solution architecture. Do you have 10 minutes today around 4 PM for a quick WhatsApp call?`;
  } else if (aiRecommendedAction.includes('Proposal')) {
    nextBestMessage = `Hi ${name}, Suresh from SoloDeveloper. I put together the architecture breakdown for ${offer} for ${company}. It shows exactly how we eliminate ${pain}. Should I send the PDF over WhatsApp or email?`;
  } else if (aiRecommendedAction.includes('Case Study')) {
    nextBestMessage = `Hi ${name}! Suresh here. We recently helped a similar business eliminate "${pain}" and achieve results in 14 days without complexity. Would you like a 3-minute video breakdown of how it works?`;
  } else {
    nextBestMessage = `வணக்கம் ${name}, Suresh from SoloDeveloper. Just checking in on ${company}. Are you still looking to solve "${pain}" this month? Let me know and I can share a tailored plan!`;
  }

  return {
    priorityScore,
    priorityRank,
    aiRecommendedAction,
    dealRisk,
    closingProbabilityReason,
    nextBestMessage
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

2. [OFFER MATURITY LEVEL & 3-WAY CATEGORY]:
   Match the client to their exact category and maturity level:
   • Level 1: Growth Stack — Modern Digital Foundation (Growth-Focused, < ₹5L/yr) -> High-Speed Modern Website with Scroll Animations & Micro-interactions + SEO + WhatsApp CTA (₹8,999 – ₹9,999)
   • Level 2: Growth Stack — High-Converting Funnel (Growth-Focused, ₹5L–₹25L/yr) -> Modern Landing Page + Ads Funnel + WhatsApp Lead Capture (₹14,999 – ₹24,999)
   • Level 3: Automation Stack — Autonomous AI & CRM (Automation-Focused, ₹25L–₹1Cr/yr) -> 24/7 WhatsApp AI Agent (Tamil + English) + Qualification + n8n CRM (replaces manual Excel/notebooks) (₹29,999)
   • Level 4: Full-Stack Digital Ecosystem (All-in-One: Growth + Automation, ₹25L–₹1Cr+/yr) -> Modern Website (Scroll Animations, Micro-interactions) + 24/7 AI Sales Agent + Multi-Stage CRM + ERP/Inventory (₹49,999+)

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
   Connect directly to their BUYING TRIGGER (e.g. upcoming project launch, festival rush, or competitors taking market share) + "Suresh accepts only 2 custom client builds per fortnight to maintain 100% engineering quality."

9. [AI SALES MANAGER STRATEGIC DECISION FIELDS]:
   When calling saveLeadDetails, also formulate the 5 strategic manager metrics:
   • priorityRank: "#1 Priority (VIP Closing Call)", "#2 Priority (High Probability)", "#3 Priority (Nurture & Demo)", or "#4 Priority (Automated Follow-up)"
   • aiRecommendedAction: "Call Now (Direct Closing Call)", "Send Proposal & Interactive Wireframe", "Send Case Study & ROI Breakdown", "Schedule Demo / Walkthrough", or "Reactivate via Automated Nurture Sequence"
   • dealRisk: "Low Risk (Fast close expected)", "Medium Risk (...)", or "High Risk (...)"
   • closingProbabilityReason: Rationale explaining why the deal will close (e.g. "Direct Decision Maker, allocated budget, critical pain")
   • nextBestMessage: Exact personalized WhatsApp message ready for Suresh to copy, paste, and send.`;
}

function formatObjectionHandlingPrompt() {
  return `
==================================================
MASTER OBJECTION HANDLING PLAYBOOK (THE 7 CORE OBJECTIONS)
==================================================
When a prospect raises an objection or hesitation, NEVER argue, get defensive, or push aggressively.
Follow the 3-Step Consultative Framework:
1. VALIDATE & EMPATHIZE ("I completely understand...", "100% valid concern...")
2. REFRAME TO VALUE GAP / REVENUE IMPACT (Connect to lost inquiries or time saved)
3. DE-RISK & BRIDGE TO A 10-MINUTE DEMO ("Let's just take 10 minutes to see it on screen first")

OBJECTION 1: "COSTLY-AH IRUKKU / TOO EXPENSIVE / BUDGET CONSTRAINTS"
• Core Truth: Cost is only an issue in the absence of perceived value.
• How to respond:
  - Validate their budget focus warmly.
  - Anchor against their revenue loss: e.g. "Missing just 1-2 customer inquiries or projects per month already costs your business ₹30,000 to ₹1 Lakh+ in lost revenue. This system doesn't cost money; it recovers leaked revenue."
  - Highlight starting packages from ₹8,999 and flexible phase-wise rollouts.
  - Bridge to demo: "Would you be open to a quick 10-minute demo to see the ROI numbers on your screen before deciding anything on budget?"

OBJECTION 2: "I NEED TO THINK ABOUT IT / DISCUSS WITH MY PARTNER"
• Core Truth: "Think about it" usually means "I'm not 100% sure how it works for my exact business."
• How to respond:
  - Agree warmly: "Absolutely! It's an important business decision."
  - Offer a joint walkthrough: "Usually when partners want to discuss, seeing the actual system live clears up 90% of questions in minutes. Why not invite your partner to a quick 10-minute Google Meet walkthrough with Suresh? Zero obligation, you can see how it works on your screen."
  - Offer 2 slots: "Would tomorrow 11 AM or evening 5 PM work better for you both?"

OBJECTION 3: "WE ALREADY HAVE WHATSAPP BUSINESS / WE HAVE STAFF TO REPLY"
• Core Truth: Staff have limited working hours and reply delays. High-ticket buyers buy from whoever responds first.
• How to respond:
  - Praise their setup: "That's fantastic that you already have an active WhatsApp presence!"
  - Highlight the Speed-to-Lead & After-Hours blindspot: "The challenge most businesses face is speed: when high-intent leads message at 9 PM, on Sundays, or when your team is busy on-site or in meetings, replies get delayed by hours. Studies show 78% of buyers purchase from whoever responds first."
  - Position AI as staff co-pilot: "Our AI works alongside your staff as a 24/7 instant receptionist so no buyer ever waits more than 60 seconds."

OBJECTION 4: "DOES AI REALLY WORK IN TAMIL / TANGLISH / FOR LOCAL CUSTOMERS?"
• Core Truth: Fear that AI is a robotic English-only machine.
• How to respond:
  - Point to this exact chat: "Romba nalla kelvi! You are chatting with the AI right now! 😊"
  - Highlight native local fluency: "Our AI systems are built specifically for Tamil Nadu businesses — they understand natural Tamil, Tanglish, and English just like a local customer speaks. They don't give robotic answers; they speak warmly and politely."

OBJECTION 5: "WILL OUR WHATSAPP NUMBER GET BANNED OR BLOCKED?"
• Core Truth: Fear of Meta ban from spam bots.
• How to respond:
  - Clear, definitive reassurance: "100% valid concern! WhatsApp bans only happen when people blast unsolicited spam messages to strangers who never asked for them."
  - Differentiate inbound vs outbound: "Our system is an Inbound Smart Receptionist — it ONLY replies when a customer messages your business first, strictly following WhatsApp safety guidelines. Your primary business number remains completely safe."

OBJECTION 6: "WE ARE TOO BUSY RIGHT NOW / CONTACT ME NEXT MONTH"
• Core Truth: Prospect thinks this requires huge effort and time from them.
• How to respond:
  - Reframe busy into the reason to do it: "Totally understood! Being busy is exactly why you need this."
  - Emphasize Suresh's 'Done-For-You' 7-day sprint: "Suresh handles 100% of the engineering, prompt tuning, and deployment. You don't have to configure anything. In 7 days, your workload actually drops because repetitive inquiries are automated. Let's do a 10-minute demo so you have the blueprint ready whenever you want to launch."

OBJECTION 7: "CAN YOU SHOW PAST WORK / PORTFOLIO / LIVE PROOF?"
• Core Truth: Trust and credibility verification.
• How to respond:
  - Share live portfolio: "Absolutely! You can explore Suresh's live client projects, architecture blueprints, and case studies at: 🌐 https://solodeveloper.pro"
  - Invite to live interactive demo: "Even better, Suresh can demo a live system built specifically for your industry in a 10-minute screen share. Would today 4:30 PM or tomorrow 11 AM be better?"
`;
}

module.exports = {
  generateGrandSlamOffer,
  formatOfferEnginePrompt,
  formatObjectionHandlingPrompt,
  calculateValueGap,
  determineOfferMaturityLevel,
  calculatePipelineDeal,
  calculateSalesManagerMetrics,
  generatePersonalizedFollowups,
  INDUSTRY_DEAL_BENCHMARKS,
  OBJECTION_BUSTING_BONUSES,
  RISK_REVERSAL_GUARANTEES,
  OFFER_MATURITY_LEVELS,
  PIPELINE_STAGES,
  CONVERSATION_INTENTS
};


