import json
import urllib.request
import urllib.error
import sys

API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k'
BASE_URL = 'https://suresh-n8n-fhr6.onrender.com'

code_js = r'''
const body = $input.item.json.body || $input.item.json;

// Sanitize inputs
const name = (body.prospectName || body.name || 'Friend').toString().trim();
const company = (body.company || 'Business').toString().trim();
const industry = (body.industry || 'General Business').toString().trim();
let rawPhone = (body.phone || '').toString().replace(/[^0-9]/g, '');
if (!rawPhone || rawPhone.length < 10) {
  rawPhone = '919361599097';
}
const phone = rawPhone;
const email = (body.email || 'sureshkumar20133151@gmail.com').toString().trim();
const painPoint = (body.painPoint || 'Inquiry loss and delayed manual responses').toString().trim();
const dreamOutcome = (body.dreamOutcome || '24/7 automated inquiry qualification & booking').toString().trim();
const recommendedTier = (body.recommendedTier || 'Tier 2: Autonomous AI Growth System (₹24,999)').toString().trim();
const notes = (body.notes || 'Full 7-day turnkey sprint requested').toString().trim();

const now = new Date();
const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

// Tomorrow date for 24h follow-up check-in
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// 1. Prospect Proposal WhatsApp Message
const prospectProposalMessage = `📄 *Custom AI Growth Proposal & Architecture Ready!*

வணக்கம் ${name}! Suresh Kumar has finalized the complete custom automation architecture for *${company}*.

🎯 *Core Transformation:*
Eliminating *'${painPoint}'* and achieving *'${dreamOutcome}'*.

💼 *Investment Summary:*
• Recommended System: *Tier 2: Autonomous AI Growth System*
• Turnaround: *7-Day Fixed Sprint*
• Investment: *₹24,999 fixed* (Zero monthly mandatory SaaS retainers)
• Bonuses Included Free: *₹18,998 Value* (Local Maps SEO + Multi-Stage n8n Follow-up + Cloud Hosting + Founder Video Training)
• Risk Reversal: *100% Demo-First & 30-Day Free Post-Launch Support*

📧 The complete executive consulting deck & architecture blueprint has been sent to your email (${email}).

Ready to lock your 7-Day Sprint slot, or would you like a quick 5-minute walkthrough of the tiers? Reply *START* to begin!`;

// 2. Suresh Instant WhatsApp Alert
const sureshAlert = `📑 *[PROPOSAL DISPATCHED]* 🚀
━━━━━━━━━━━━━━━━━━━━━
👤 *Prospect:* ${name}
🏢 *Company:* ${company} (${industry})
📞 *Phone:* +${phone}
✉️ *Email:* ${email}
🎯 *Pain:* ${painPoint}
🏆 *Recommended:* ${recommendedTier}
💰 *Deal Value:* ₹24,999 (Win Prob: 75%)
━━━━━━━━━━━━━━━━━━━━━
📅 *Next Action:* Follow up tomorrow (${tomorrowStr}) to check Day 1 reaction.`;

// 3. Gmail HTML Executive Consulting Proposal Deck
const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Growth Proposal for ${company}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; color: #ffffff; text-align: left;">
      <div style="display: inline-block; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">SoloDeveloper Autonomous Systems</div>
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #f8fafc;">${company} — Autonomous AI Sales Architecture</h1>
      <p style="margin: 0; font-size: 14px; color: #94a3b8;">Custom AI Sales Blueprint & Grand Slam Growth Proposal for <strong>${name}</strong></p>
    </div>

    <div style="padding: 24px;">

      <!-- Executive Diagnosis -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">🔍 Executive Problem & Opportunity Diagnosis</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #334155;"><strong>Identified Bottleneck:</strong> ${painPoint}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #334155;"><strong>Target Transformation:</strong> ${dreamOutcome}</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #0369a1;"><strong>💡 ROI Equation:</strong> In ${industry}, recovering just ONE additional inquiry covers the entire system investment 20x to 50x over on the first deal.</p>
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
[Automated Strategy Demo / Walkthrough Booking (Google Meet)]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► [Instant VIP WhatsApp & Email Alert to Suresh]<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─► [Real-Time 41-Field Google Sheets CRM Sync]
        </div>
      </div>

      <!-- 3-Tier Investment Options -->
      <h3 style="margin: 0 0 14px 0; font-size: 16px; color: #0f172a; font-weight: 700;">💼 Investment Options (Turnkey Delivery)</h3>
      <div style="display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 28px;">
        
        <!-- Tier 1 -->
        <div style="border: 2px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 16px; color: #0f172a;">Tier 1: Starter Foundation</h4>
            <span style="font-size: 20px; font-weight: 800; color: #0f172a;">₹9,999</span>
          </div>
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">Essential digital presence & lead capture</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
            <li>Modern Mobile-First Business Landing Page</li>
            <li>Direct WhatsApp Instant Inquiry CTA</li>
            <li>Google Business & Maps Local SEO Setup</li>
            <li>Lead Contact Form with Instant Email Alert</li>
          </ul>
        </div>

        <!-- Tier 2 (Recommended) -->
        <div style="border: 2px solid #0284c7; background: #f0f9ff; border-radius: 8px; padding: 18px; position: relative;">
          <span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; position: absolute; top: -10px; right: 15px;">RECOMMENDED</span>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 16px; color: #0f172a;">Tier 2: Autonomous AI Growth System</h4>
            <span style="font-size: 20px; font-weight: 800; color: #0284c7;">₹24,999</span>
          </div>
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">24/7 AI customer capture, qualification & calendar booking</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
            <li>Full High-Speed Business Web Portal</li>
            <li>24/7 Autonomous WhatsApp AI Agent (Tamil & English NLP)</li>
            <li>Instant Inquiry Pre-Qualification & Budget Filtering</li>
            <li>Automated Google Meet Calendar Booking</li>
            <li>Google Sheets & n8n Multi-Stage CRM Pipeline Integration</li>
            <li>All 4 Objection-Busting Bonuses Included Free (₹18,998 value)</li>
          </ul>
        </div>

        <!-- Tier 3 -->
        <div style="border: 2px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 16px; color: #0f172a;">Tier 3: Enterprise AI Operating System</h4>
            <span style="font-size: 20px; font-weight: 800; color: #0f172a;">₹49,999</span>
          </div>
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">Full multi-agent automation & custom management portal</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
            <li>Everything in Tier 2 Growth System</li>
            <li>Multi-Agent AI Ecosystem (Inquiry + Support + Outreach)</li>
            <li>Custom Client / Admin Analytics Dashboard</li>
            <li>Multi-Branch / Multi-User Staff Routing</li>
            <li>Dedicated Server + 90-Day Priority VIP Support</li>
          </ul>
        </div>

      </div>

      <!-- Free Objection-Busting Bonuses -->
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #065f46; font-weight: 700;">🎁 Included Free with Tier 2 (₹18,998 Total Value)</h3>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #047857; line-height: 1.6;">
          <li><strong>Bonus #1: Local Authority Google Maps 5-Star SEO Blueprint</strong> (₹4,999 value)</li>
          <li><strong>Bonus #2: Automated Multi-Stage CRM Follow-up Sequence in n8n</strong> (₹7,999 value)</li>
          <li><strong>Bonus #3: Lifetime Free Cloud Hosting Architecture</strong> (₹3,500/yr value)</li>
          <li><strong>Bonus #4: Founder Screen-Recorded Walkthrough & Staff Training Video</strong> (₹2,500 value)</li>
        </ul>
      </div>

      <!-- 7-Day Sprint Roadmap -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 700;">⚡ 7-Day Fast Turnaround Sprint Roadmap</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold; width: 25%; border-bottom: 1px solid #e2e8f0; color: #0284c7;">Day 1: Discovery</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Map customer journey, FAQs, pricing rules, and qualification criteria.</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0284c7;">Day 2-3: AI Brain</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Configure Gemini NLP models in Tamil/English and wire n8n webhook pipelines.</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0284c7;">Day 4: CRM & Calendar</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Connect Google Sheets, Google Meet room, and real-time owner alerts.</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0284c7;">Day 5: Testing</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Simulate 50+ real-world customer inquiries and stress-test qualification flows.</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0284c7;">Day 6: Training</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Live screen-recorded founder walkthrough showing team how to manage in 5 mins/day.</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #16a34a;">Day 7: Launch 🚀</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Switch live traffic to autonomous agent with 30-day dedicated post-launch support.</td></tr>
        </table>
      </div>

      <!-- Zero-Risk Guarantee -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #92400e; font-weight: 700;">🛡️ 100% Zero-Risk Guarantees:</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.6;">
          <li>⚡ <strong>7-Day Fast Turnaround Guarantee:</strong> Launch before your next campaign or rush.</li>
          <li>🏷️ <strong>100% Fixed Transparent Pricing:</strong> Zero hidden charges, zero surprise invoices.</li>
          <li>🛠️ <strong>30-Day Free Post-Launch Support:</strong> Direct WhatsApp support from Suresh.</li>
          <li>🤝 <strong>Zero-Complexity Guarantee:</strong> If your team cannot comfortably use it, Suresh personally assists until 100% confident.</li>
        </ul>
      </div>

      <!-- CTA -->
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

return [{
  json: {
    // 41 Sheet2 CRM Fields
    Date: nowStr,
    Name: name,
    Phone: phone,
    Company: company,
    Industry: industry,
    Location: body.location || 'Madurai / Tamil Nadu',
    'Team Size': body.teamSize || '2-10',
    'Revenue Range': body.revenueRange || '₹5L-₹25L',
    'Authority Level': 'Decision Maker',
    'Monthly Enquiries': body.monthlyEnquiries || '10-30',
    'Current Source': body.currentSource || 'WhatsApp / Inbound',
    'Current Process': body.currentProcess || 'Manual replies -> Lost leads',
    'Buying Trigger': 'Proposal Delivered via AI Agent',
    'Problem Category': 'Lead Conversion & Automation',
    'Pain Point': painPoint,
    'Pain Severity': 'High',
    'Dream Outcome': dreamOutcome,
    'Lost Opportunity': 'Significant monthly revenue from delayed replies',
    'Current Tools': 'WhatsApp / Manual',
    'Transformation Statement': 'Automate inquiry response and convert leads 24/7 for ' + company,
    'Grand Slam Offer': company + ' — Autonomous AI Growth System (Tier 2)',
    'AI Confidence': '98% Proposal Generated',
    Urgency: 'High',
    Timeline: 'Immediate',
    'Budget Status': 'Allocated',
    'Lead Score': 'Hot',
    'Suresh Closing Script': 'Follow up on Tier 2 proposal. Offer 7-Day Sprint starting Monday.',
    'Follow-up Strategy': 'Day 1 check-in, Day 3 case study, Day 7 decision reminder.',
    'Pipeline Stage': '7. PROPOSAL SENT',
    'Conversation Intent': 'Comparing Options',
    'Estimated Deal Value': '₹24,999',
    'Win Probability': '75%',
    'Revenue Forecast': '₹18,749',
    'Next Followup Date': tomorrowStr,
    'Loss Reason': '-',
    'Last Contacted Date': nowStr,
    'Priority Rank': '#1 Priority (VIP Closing Call)',
    'AI Recommended Action': 'Follow-up on Proposal Sent (Check Day 1 Reaction)',
    'Deal Risk': 'Low Risk (Proposal sent)',
    'Closing Probability Reason': 'Prospect reviewed strategy demo and received full 3-tier proposal.',
    'Next Best Message': 'Hi ' + name + ', just checking if you had a chance to review the 7-day sprint proposal for ' + company + '?',

    // Helper fields
    prospectEmail: email,
    prospectProposalMessage,
    sureshAlert,
    emailHtml
  }
}];
'''

match_js = r'''
const bookingPhone = $('2. Format & Generate Proposal Dossier').item.json.Phone;
const rows = $input.item.json.values || [];

let targetRowIndex = -1;
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const rowPhone = (row[2] || '').toString().replace(/[^0-9]/g, '');
  if (rowPhone && bookingPhone.includes(rowPhone)) {
    targetRowIndex = i + 1; // 1-based row index for Google Sheets
    break;
  }
}

if (targetRowIndex > 0) {
  return [{
    json: {
      matched: true,
      rowIndex: targetRowIndex
    }
  }];
}

return [{ json: { matched: false } }];
'''

with open('sheet2_columns_config.json', 'r', encoding='utf-8') as f:
    sheet2_columns_config = json.load(f)
sheet2_columns_config['matchingColumns'] = ['Phone']

workflow = {
    'name': 'AI Automated Proposal & Interactive Wireframe Delivery Engine',
    'nodes': [
        {
            'id': 'webhook-proposal-delivery',
            'name': '1. Webhook (Proposal Delivery)',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [100, 300],
            'webhookId': 'proposal-delivery',
            'parameters': {
                'httpMethod': 'POST',
                'path': 'proposal-delivery',
                'responseMode': 'onReceived',
                'responseData': 'allEntries',
                'options': {}
            }
        },
        {
            'id': 'code-generate-proposal',
            'name': '2. Format & Generate Proposal Dossier',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [340, 300],
            'parameters': {
                'jsCode': code_js
            }
        },
        {
            'id': 'gs-update-sheet2-proposal',
            'name': '3. Update CRM (Sheet2 - 41 Intelligence Fields)',
            'type': 'n8n-nodes-base.googleSheets',
            'typeVersion': 4.5,
            'position': [580, 200],
            'continueOnFail': True,
            'parameters': {
                'operation': 'appendOrUpdate',
                'documentId': {
                    '__rl': True,
                    'value': '1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw',
                    'mode': 'id'
                },
                'sheetName': {
                    '__rl': True,
                    'value': 'Sheet2',
                    'mode': 'name'
                },
                'columns': sheet2_columns_config,
                'options': {}
            },
            'credentials': {
                'googleSheetsOAuth2Api': {
                    'id': 'RMmY56nFkrWF4wQC',
                    'name': 'Google Sheets account'
                }
            }
        },
        {
            'id': 'http-send-prospect-proposal-wa',
            'name': '4. Send Proposal to Prospect (WhatsApp)',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [820, 200],
            'continueOnFail': True,
            'parameters': {
                'method': 'POST',
                'url': 'https://whatsapp-assistant-iqpi.onrender.com/api/send-message',
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '={\n  "phone": "{{ $(\'2. Format & Generate Proposal Dossier\').item.json.Phone }}",\n  "message": {{ JSON.stringify($(\'2. Format & Generate Proposal Dossier\').item.json.prospectProposalMessage) }}\n}'
            }
        },
        {
            'id': 'http-send-suresh-proposal-alert',
            'name': '5. Send Proposal Alert to Suresh (WhatsApp)',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [1040, 200],
            'continueOnFail': True,
            'parameters': {
                'method': 'POST',
                'url': 'https://whatsapp-assistant-iqpi.onrender.com/api/send-message',
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '={\n  "phone": "919361599097",\n  "message": {{ JSON.stringify($(\'2. Format & Generate Proposal Dossier\').item.json.sureshAlert) }}\n}'
            }
        },
        {
            'id': 'gmail-send-prospect-proposal',
            'name': '6. Send Executive Proposal Deck (Gmail)',
            'type': 'n8n-nodes-base.gmail',
            'typeVersion': 2.1,
            'position': [1260, 200],
            'continueOnFail': True,
            'parameters': {
                'sendTo': '={{ $(\'2. Format & Generate Proposal Dossier\').item.json.prospectEmail || "sureshkumar20133151@gmail.com" }}',
                'subject': '=📄 [PROPOSAL] {{ $(\'2. Format & Generate Proposal Dossier\').item.json.Company }} - Custom Autonomous AI System & Growth Architecture',
                'emailType': 'html',
                'message': '={{ $(\'2. Format & Generate Proposal Dossier\').item.json.emailHtml }}'
            },
            'credentials': {
                'gmailOAuth2': {
                    'id': 'cwBPj5LyhtzfYo07',
                    'name': 'Gmail account'
                }
            }
        },
        {
            'id': 'http-fetch-outreach-prospects-proposal',
            'name': '7. Fetch Outreach Prospects to Sync Status',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [820, 420],
            'continueOnFail': True,
            'parameters': {
                'method': 'GET',
                'url': 'https://sheets.googleapis.com/v4/spreadsheets/1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw/values/OutreachProspects!A1:N50',
                'authentication': 'predefinedCredentialType',
                'nodeCredentialType': 'googleSheetsOAuth2Api'
            },
            'credentials': {
                'googleSheetsOAuth2Api': {
                    'id': 'RMmY56nFkrWF4wQC',
                    'name': 'Google Sheets account'
                }
            }
        },
        {
            'id': 'code-match-outreach-prospect-proposal',
            'name': '8. Match Outreach Prospect Row',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [1040, 420],
            'continueOnFail': True,
            'parameters': {
                'jsCode': match_js
            }
        },
        {
            'id': 'if-outreach-matched-proposal',
            'name': '9. Is Prospect in Outreach Sheet?',
            'type': 'n8n-nodes-base.if',
            'typeVersion': 2,
            'position': [1260, 420],
            'continueOnFail': True,
            'parameters': {
                'conditions': {
                    'boolean': [
                        {
                            'value1': '={{ $json.matched }}',
                            'value2': True
                        }
                    ]
                }
            }
        },
        {
            'id': 'http-update-outreach-status-proposal',
            'name': '10. Mark Outreach Status as Proposal Sent',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [1480, 400],
            'continueOnFail': True,
            'parameters': {
                'method': 'PUT',
                'url': '=https://sheets.googleapis.com/v4/spreadsheets/1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw/values/OutreachProspects!J{{ $json.rowIndex }}:J{{ $json.rowIndex }}?valueInputOption=USER_ENTERED',
                'authentication': 'predefinedCredentialType',
                'nodeCredentialType': 'googleSheetsOAuth2Api',
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '={{ JSON.stringify({ range: "OutreachProspects!J" + $json.rowIndex + ":J" + $json.rowIndex, majorDimension: "ROWS", values: [["Proposal Sent"]] }) }}'
            },
            'credentials': {
                'googleSheetsOAuth2Api': {
                    'id': 'RMmY56nFkrWF4wQC',
                    'name': 'Google Sheets account'
                }
            }
        }
    ],
    'connections': {
        '1. Webhook (Proposal Delivery)': {
            'main': [
                [
                    {
                        'node': '2. Format & Generate Proposal Dossier',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '2. Format & Generate Proposal Dossier': {
            'main': [
                [
                    {
                        'node': '3. Update CRM (Sheet2 - 41 Intelligence Fields)',
                        'type': 'main',
                        'index': 0
                    },
                    {
                        'node': '7. Fetch Outreach Prospects to Sync Status',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '3. Update CRM (Sheet2 - 41 Intelligence Fields)': {
            'main': [
                [
                    {
                        'node': '4. Send Proposal to Prospect (WhatsApp)',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '4. Send Proposal to Prospect (WhatsApp)': {
            'main': [
                [
                    {
                        'node': '5. Send Proposal Alert to Suresh (WhatsApp)',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '5. Send Proposal Alert to Suresh (WhatsApp)': {
            'main': [
                [
                    {
                        'node': '6. Send Executive Proposal Deck (Gmail)',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '7. Fetch Outreach Prospects to Sync Status': {
            'main': [
                [
                    {
                        'node': '8. Match Outreach Prospect Row',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '8. Match Outreach Prospect Row': {
            'main': [
                [
                    {
                        'node': '9. Is Prospect in Outreach Sheet?',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '9. Is Prospect in Outreach Sheet?': {
            'main': [
                [
                    {
                        'node': '10. Mark Outreach Status as Proposal Sent',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        }
    },
    'settings': {
        'executionOrder': 'v1'
    }
}

with open('proposal_delivery_workflow.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2)

print("Saved proposal_delivery_workflow.json")

# Check if workflow already exists
list_req = urllib.request.Request(
    f'{BASE_URL}/api/v1/workflows',
    headers={'X-N8N-API-KEY': API_KEY}
)

existing_id = None
try:
    with urllib.request.urlopen(list_req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        workflows = res.get('data', [])
        for w in workflows:
            if 'Proposal & Interactive Wireframe' in w.get('name', ''):
                existing_id = w.get('id')
                print(f"Found existing workflow: {w.get('name')} (ID: {existing_id})")
                break
except Exception as e:
    print(f"Error checking existing workflows: {e}")

payload = {
    'name': workflow['name'],
    'nodes': workflow['nodes'],
    'connections': workflow['connections'],
    'settings': workflow['settings']
}

if existing_id:
    url = f'{BASE_URL}/api/v1/workflows/{existing_id}'
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json'},
        method='PUT'
    )
    action = "Updated"
    target_id = existing_id
else:
    url = f'{BASE_URL}/api/v1/workflows'
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json'},
        method='POST'
    )
    action = "Created"

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        target_id = res.get('id')
        print(f"Workflow {action} successfully! ID: {target_id}")

    # Activate workflow
    act_req = urllib.request.Request(
        f'{BASE_URL}/api/v1/workflows/{target_id}/activate',
        headers={'X-N8N-API-KEY': API_KEY},
        method='POST'
    )
    with urllib.request.urlopen(act_req) as act_resp:
        act_res = json.loads(act_resp.read().decode('utf-8'))
        print(f"Workflow {target_id} Active Status: {act_res.get('active')}")

except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
