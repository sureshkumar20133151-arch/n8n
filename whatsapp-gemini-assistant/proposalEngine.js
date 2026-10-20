// SOLODEVELOPER AI BUSINESS AGENT - PROPOSAL & INTERACTIVE WIREFRAME DELIVERY ENGINE
// Based on Alex Hormozi's $100M Offers Value Equation:
// (Dream Outcome x Perceived Likelihood of Achievement) / (Time Delay x Effort & Sacrifice)

const { INDUSTRY_KNOWLEDGE, detectIndustry } = require('./industryKnowledgeBase');
const { 
  INDUSTRY_DEAL_BENCHMARKS, 
  OBJECTION_BUSTING_BONUSES, 
  RISK_REVERSAL_GUARANTEES,
  calculateValueGap 
} = require('./offerEngine');

/**
 * Generate a complete Grand Slam Proposal Dossier
 * @param {object} leadData 
 * @returns {object}
 */
function generateProposalDossier(leadData = {}) {
  const name = (leadData.prospectName || leadData.name || 'Friend').toString().trim();
  const company = (leadData.company || 'Your Business').toString().trim();
  const industry = (leadData.industry || 'General Business').toString().trim();
  const rawPhone = (leadData.phone || '').toString().replace(/[^0-9]/g, '');
  const phone = rawPhone || '919361599097';
  const email = (leadData.email || 'sureshkumar20133151@gmail.com').toString().trim();
  const painPoint = (leadData.painPoint || 'Inquiry loss and manual qualification delays').toString().trim();
  const dreamOutcome = (leadData.dreamOutcome || 'Automate 24/7 lead capture and scale revenue predictably').toString().trim();

  // Industry benchmark & ROI anchor
  const detected = detectIndustry(industry + ' ' + company);
  const detectedKey = detected?.id || null;
  const benchmark = INDUSTRY_DEAL_BENCHMARKS[detectedKey] || INDUSTRY_DEAL_BENCHMARKS.construction;
  const avgDeal = benchmark.avgDeal;
  const unit = benchmark.unit;

  // 3-Tier Investment Options (Hormozi Decoy & Recommended Anchor)
  const pricingTiers = [
    {
      tierName: "Tier 1: Starter Foundation",
      price: "₹9,999",
      period: "one-time setup",
      highlight: false,
      tagline: "Essential digital presence & lead capture",
      deliverables: [
        "Modern Mobile-First Business Landing Page",
        "Direct WhatsApp Instant Inquiry CTA",
        "Google Business & Maps Local SEO Setup",
        "Lead Contact Form with Instant Email Alert",
        "High-Speed Cloud Hosting Deployment"
      ],
      idealFor: "Businesses wanting a clean online presence with direct WhatsApp lead capture."
    },
    {
      tierName: "Tier 2: Autonomous AI Growth System",
      price: "₹24,999",
      period: "one-time turnkey sprint",
      highlight: true,
      badge: "MOST POPULAR — RECOMMENDED",
      tagline: "24/7 AI-driven customer capture, qualification & booking",
      deliverables: [
        "Full High-Speed Business Web Portal",
        "24/7 Autonomous WhatsApp AI Agent (Tamil & English NLP)",
        "Instant Inquiry Pre-Qualification & Budget Filtering",
        "Automated Google Meet / Site Visit Calendar Booking",
        "Google Sheets & n8n Multi-Stage CRM Pipeline Integration",
        "All 4 Objection-Busting Bonuses Included Free (₹18,998 value)"
      ],
      idealFor: `Growing ${industry} companies losing deals due to delayed manual replies.`
    },
    {
      tierName: "Tier 3: Enterprise AI Operating System",
      price: "₹49,999",
      period: "one-time enterprise build",
      highlight: false,
      tagline: "Full multi-agent automation & custom management portal",
      deliverables: [
        "Everything in Tier 2 Growth System",
        "Multi-Agent AI Ecosystem (Inquiry + Support + Outreach)",
        "Custom Client / Admin Analytics Dashboard",
        "Multi-Branch / Multi-User Staff Routing",
        "ERP / Inventory / Payment Gateway Automation",
        "Dedicated Server Deployment + 90-Day Priority VIP Support"
      ],
      idealFor: "Established multi-location enterprises requiring bespoke automation."
    }
  ];

  // 7-Day Implementation Sprint
  const implementationRoadmap = [
    { day: "Day 1", phase: "Discovery & Blueprint", details: "Map customer journey, FAQs, pricing rules, and qualification criteria." },
    { day: "Day 2-3", phase: "AI Brain & Workflow Engineering", details: "Configure Gemini NLP models in Tamil/English and wire n8n webhook pipelines." },
    { day: "Day 4", phase: "CRM & Calendar Integration", details: "Connect Google Sheets, Google Meet room, and real-time owner notifications." },
    { day: "Day 5", phase: "Testing & Edge-Case Tuning", details: "Simulate 50+ real-world customer inquiries and stress-test qualification flows." },
    { day: "Day 6", phase: "Team Walkthrough & Training", details: "Live screen-recorded founder walkthrough showing team how to manage in 5 mins/day." },
    { day: "Day 7", phase: "Production Go-Live 🚀", details: "Switch live traffic to autonomous agent with 30-day dedicated post-launch support." }
  ];

  const proposalTitle = `${company} — Autonomous AI Sales & Growth System`;

  return {
    prospectName: name,
    company,
    industry,
    phone,
    email,
    painPoint,
    dreamOutcome,
    avgDeal,
    unit,
    proposalTitle,
    pricingTiers,
    bonuses: OBJECTION_BUSTING_BONUSES,
    guarantees: RISK_REVERSAL_GUARANTEES,
    implementationRoadmap,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate high-converting executive WhatsApp message with proposal link
 * @param {object} leadData 
 * @param {object} proposal 
 * @returns {string}
 */
function generateProposalWhatsAppMessage(leadData = {}, proposal = {}) {
  const name = proposal.prospectName || leadData.prospectName || 'Friend';
  const company = proposal.company || leadData.company || 'your business';
  const recTier = proposal.pricingTiers ? proposal.pricingTiers[1] : { price: '₹24,999' };

  return `📄 *Custom AI Growth Proposal & Blueprint Ready!*

வணக்கம் ${name}! Suresh Kumar has finalized the custom automation architecture for *${company}*.

🎯 *Core Transformation:*
Eliminating *'${proposal.painPoint || 'inquiry delays'}'* and achieving *'${proposal.dreamOutcome || '24/7 automated qualification'}'*.

💼 *Investment Summary:*
• Recommended System: *${recTier.tierName || 'Autonomous AI Growth System'}*
• Turnaround: *7-Day Fixed Sprint*
• Investment: *${recTier.price}* (Zero monthly mandatory subscriptions)
• Bonuses Included: *₹18,998 Free Value* (4 Objection-Busting Bonuses)
• Risk Reversal: *100% Demo-First & 30-Day Support Guarantee*

📧 The complete interactive proposal & breakdown has been sent to your email.

Ready to lock your 7-Day Sprint slot, or would you like a quick 5-minute walkthrough of the tiers? Reply *START* to begin!`;
}

/**
 * Generate premium HTML consulting deck for email dispatch
 * @param {object} leadData 
 * @param {object} proposal 
 * @returns {string}
 */
function generateProposalEmailHtml(leadData = {}, proposal = {}) {
  const name = proposal.prospectName || 'Client';
  const company = proposal.company || 'Your Business';
  const industry = proposal.industry || 'General Business';
  const tiers = proposal.pricingTiers || [];
  const bonuses = proposal.bonuses || [];
  const guarantees = proposal.guarantees || [];
  const roadmap = proposal.implementationRoadmap || [];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Growth Proposal for ${company}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; color: #ffffff; text-align: left;">
      <div style="display: inline-block; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">SoloDeveloper Autonomous Systems</div>
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #f8fafc;">${proposal.proposalTitle || (company + ' Growth Proposal')}</h1>
      <p style="margin: 0; font-size: 14px; color: #94a3b8;">Custom AI Sales Architecture & Implementation Blueprint for <strong>${name}</strong></p>
    </div>

    <div style="padding: 24px;">

      <!-- Executive Diagnosis -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">🔍 Executive Problem & Opportunity Diagnosis</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #334155;"><strong>Identified Bottleneck:</strong> ${proposal.painPoint}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #334155;"><strong>Target Transformation:</strong> ${proposal.dreamOutcome}</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #0369a1;"><strong>💡 ROI Equation:</strong> In ${industry}, average contract value is approximately <strong>${proposal.avgDeal} ${proposal.unit}</strong>. Converting just ONE additional lost customer covers the entire system investment 20x to 50x over.</p>
      </div>

      <!-- Solution Architecture Diagram -->
      <div style="margin-bottom: 28px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: 700;">⚙️ Custom System Architecture</h3>
        <div style="background: #0f172a; color: #38bdf8; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.7; overflow-x: auto;">
[Inbound Prospect (WhatsApp / Instagram / Google)]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br>
[24/7 Autonomous WhatsApp AI Agent (Tamil + English NLP)]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (Instant 60-Second Reply & Smart Discovery)<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br>
[AI Lead Qualification & Budget Filter]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (Qualifies Decision Maker & Urgency)<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br>
[Automated Strategy Demo / Site Visit Booking (Google Meet / Calendar)]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► [Instant VIP WhatsApp & Email Alert to Suresh]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─► [Real-Time 41-Field Google Sheets CRM Sync]
        </div>
      </div>

      <!-- 3-Tier Investment Options -->
      <h3 style="margin: 0 0 14px 0; font-size: 16px; color: #0f172a; font-weight: 700;">💼 Investment Options (Turnkey Delivery)</h3>
      <div style="display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 28px;">
        ${tiers.map(t => `
          <div style="border: 2px solid ${t.highlight ? '#0284c7' : '#e2e8f0'}; background: ${t.highlight ? '#f0f9ff' : '#ffffff'}; border-radius: 8px; padding: 18px; position: relative;">
            ${t.highlight ? `<span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; position: absolute; top: -10px; right: 15px;">${t.badge}</span>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <h4 style="margin: 0; font-size: 16px; color: #0f172a;">${t.tierName}</h4>
              <span style="font-size: 20px; font-weight: 800; color: ${t.highlight ? '#0284c7' : '#0f172a'};">${t.price}</span>
            </div>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">${t.tagline}</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
              ${t.deliverables.map(d => `<li>${d}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>

      <!-- Free Objection-Busting Bonuses -->
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 15px; color: #065f46; font-weight: 700;">🎁 Included Free with Tier 2 & 3 (₹18,998 Total Value)</h3>
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #047857; line-height: 1.6;">
          ${bonuses.map(b => `<li><strong>${b.name}</strong> (${b.value}): ${b.description}</li>`).join('')}
        </ul>
      </div>

      <!-- 7-Day Sprint Roadmap -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 700;">⚡ 7-Day Fast Turnaround Sprint Roadmap</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          ${roadmap.map((r, i) => `
            <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
              <td style="padding: 8px; font-weight: bold; width: 22%; border-bottom: 1px solid #e2e8f0; color: #0284c7;">${r.day} (${r.phase})</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${r.details}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Zero-Risk Guarantee -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #92400e; font-weight: 700;">🛡️ 100% Zero-Risk Guarantees:</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.6;">
          ${guarantees.map(g => `<li>${g}</li>`).join('')}
        </ul>
      </div>

      <!-- Action Button CTA -->
      <div style="text-align: center; padding: 16px 0;">
        <a href="https://wa.me/919361599097?text=Hi%20Suresh,%20I%20reviewed%20the%20proposal%20for%20${encodeURIComponent(company)}.%20Let's%20start%20the%20sprint!" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Approve Proposal & Start 7-Day Sprint 🚀</a>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">Or reply directly to Suresh's WhatsApp at +91 93615 99097</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      SoloDeveloper • Suresh Kumar • Madurai, Tamil Nadu, India • <a href="https://solodeveloper.pro" style="color: #0284c7; text-decoration: none;">solodeveloper.pro</a>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Format instructions for Gemini prompt on proposal presentation
 * @returns {string}
 */
function formatProposalEnginePrompt() {
  return `
==================================================
PROPOSAL & INTERACTIVE WIREFRAME DELIVERY PLAYBOOK
==================================================
When a prospect has completed a strategy walkthrough, asks for a formal quote, asks for pricing breakdown, or requests a project proposal:

1. PROPOSAL STRUCTURE:
   • State the core transformation clearly (From Bottleneck -> Dream Outcome).
   • Propose the 3-Tier Model, positioning Tier 2 (Autonomous AI Growth System - ₹24,999) as the Recommended Choice.
   • Emphasize the 4 Free Objection-Busting Bonuses (₹18,998 value).
   • Emphasize the 7-Day Fast Turnaround Guarantee & 30-Day Free Post-Launch Support.

2. TRIGGERING THE PROPOSAL TOOL:
   Call the \`generateAndSendProposal\` tool immediately!
   Pass:
   • prospectName
   • company
   • industry
   • phone
   • email
   • painPoint
   • dreamOutcome
   • recommendedTier ("Tier 2: Autonomous AI Growth System")
   • notes

3. AFTER TOOL DISPATCH:
   Inform the prospect warmly that their personalized consulting blueprint & proposal deck have been delivered to their WhatsApp and Email, and invite them to reply START to initiate the 7-day sprint.`;
}

module.exports = {
  generateProposalDossier,
  generateProposalWhatsAppMessage,
  generateProposalEmailHtml,
  formatProposalEnginePrompt
};
