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
const industry = (body.industry || 'General').toString().trim();
let rawPhone = (body.phone || '').toString().replace(/[^0-9]/g, '');
if (!rawPhone || rawPhone.length < 10) {
  rawPhone = '919361599097'; // Fallback to Suresh for safe delivery
}
const phone = rawPhone;
const slot = (body.demoTimeSlot || 'Tomorrow at 4:30 PM IST').toString().trim();
const meetingType = (body.meetingType || 'Google Meet').toString().trim();
const painPoint = (body.painPoint || 'Inquiry qualification & lead leakage').toString().trim();
const notes = (body.notes || 'None').toString().trim();
const meetingLink = body.meetingLink || 'https://meet.google.com/jdf-qrvw-tkm';

const now = new Date();
const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

// 1. Prospect VIP Confirmation WhatsApp message
const prospectConfirmation = `🎉 *VIP Strategy Demo Confirmed!*

வணக்கம் ${name}! Your 10-minute live demonstration for *${company}* has been confirmed with Suresh Kumar.

📅 *Scheduled Time:* ${slot}
🖥️ *Meeting Format:* ${meetingType}
🔗 *Joining Link / Room:* ${meetingLink}

💡 *What Suresh Will Walk You Through:*
1. Live breakdown of your industry's WhatsApp AI Agent
2. Exact calculation of recovered leads & missed revenue
3. 100% Zero-complexity setup demonstration

If you need to reschedule or have urgent questions before the call, simply reply right here!`;

// 2. Instant Suresh WhatsApp Alert
const sureshAlert = `🔥 *[VIP DEMO BOOKED]* 📅
━━━━━━━━━━━━━━━━━━━━━
👤 *Prospect:* ${name}
🏢 *Company:* ${company} (${industry})
📞 *Phone:* +${phone}
⏰ *Selected Slot:* ${slot}
🖥️ *Channel:* ${meetingType}
🔗 *Link:* ${meetingLink}
🎯 *Core Bottleneck:* ${painPoint}
📝 *Notes:* ${notes}
━━━━━━━━━━━━━━━━━━━━━
💰 *Estimated Deal Value:* ₹29,999 (Win Prob: 85%)
🎯 *Action:* Open Google Meet at scheduled time & run the 10-minute closing walkthrough.`;

// 3. Gmail HTML Dossier for Suresh
const emailHtml = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; color: #fff; padding: 24px; border-radius: 10px 10px 0 0;">
    <h2 style="margin:0; color: #38bdf8;">🔥 VIP Strategy Demo Booked!</h2>
    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Scheduled live consultation via WhatsApp Autonomous Agent</p>
  </div>
  
  <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 0 0 10px 10px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold; width: 35%;">Prospect Name:</td><td style="padding: 10px;">${name}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Company & Industry:</td><td style="padding: 10px;">${company} (${industry})</td></tr>
      <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold;">WhatsApp Number:</td><td style="padding: 10px;"><a href="https://wa.me/${phone}" style="color: #0284c7; text-decoration: none;">+${phone}</a></td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Scheduled Slot:</td><td style="padding: 10px; font-size: 16px; color: #b91c1c; font-weight: bold;">${slot}</td></tr>
      <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold;">Meeting Link:</td><td style="padding: 10px;"><a href="${meetingLink}" style="background: #0284c7; color: white; padding: 6px 14px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Join Google Meet</a></td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Core Bottleneck:</td><td style="padding: 10px;">${painPoint}</td></tr>
      <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold;">Special Notes:</td><td style="padding: 10px;">${notes}</td></tr>
    </table>

    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #166534;">🎯 10-Minute Walkthrough Closing Playbook:</h4>
      <ol style="margin: 0; padding-left: 20px; color: #14532d;">
        <li><strong>Minutes 0-2:</strong> Acknowledge their specific bottleneck (${painPoint}) and financial leakage.</li>
        <li><strong>Minutes 3-6:</strong> Screen-share the Autonomous AI Agent handling a simulated inquiry in real-time.</li>
        <li><strong>Minutes 7-8:</strong> Present Grand Slam Offer with Zero-Risk 7-Day Fast Turnaround Guarantee.</li>
        <li><strong>Minutes 9-10:</strong> Lock deposit / setup onboarding call.</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

// 4. Pre-Demo 2-Hour Reminder
const twoHourReminderMessage = `⏰ *Demo Reminder (In 2 Hours)*

Hi ${name}! Just a quick reminder about your live AI strategy walkthrough for *${company}* today at ${slot}.

🖥️ *Joining Link:* ${meetingLink}

Looking forward to showing you how to automate your inquiry qualification!`;

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
    'Current Source': body.currentSource || 'WhatsApp / Instagram',
    'Current Process': body.currentProcess || 'Manual replies -> Lost leads',
    'Buying Trigger': 'Demo Scheduled via AI Agent',
    'Problem Category': 'Lead Conversion & Automation',
    'Pain Point': painPoint,
    'Pain Severity': 'High',
    'Dream Outcome': 'Automated 24/7 lead qualification & booking',
    'Lost Opportunity': 'Significant monthly revenue from delayed replies',
    'Current Tools': 'WhatsApp / Manual',
    'Transformation Statement': 'Automate inquiry response and convert leads 24/7 for ' + company,
    'Grand Slam Offer': company + ' — Autonomous AI Growth & Booking System',
    'AI Confidence': '96% Confirmed Booking',
    Urgency: 'Immediate',
    Timeline: 'This Week',
    'Budget Status': 'Allocated',
    'Lead Score': 'Hot',
    'Suresh Closing Script': 'Walk through live demo on ' + slot + '. Close with 7-Day Fast Turnaround guarantee.',
    'Follow-up Strategy': 'Conduct live demo and send onboarding link.',
    'Pipeline Stage': '6. STRATEGY CALL BOOKED',
    'Conversation Intent': 'Strategy Demo Booked',
    'Estimated Deal Value': '₹29,999',
    'Win Probability': '85%',
    'Revenue Forecast': '₹25,499',
    'Next Followup Date': slot,
    'Loss Reason': '-',
    'Last Contacted Date': nowStr,
    'Priority Rank': '#1 Priority (VIP Closing Call)',
    'AI Recommended Action': 'Conduct Live Strategy Walkthrough (Google Meet: ' + meetingLink + ')',
    'Deal Risk': 'Low Risk (Demo booked)',
    'Closing Probability Reason': 'Prospect booked live 10-minute strategy demo slot.',
    'Next Best Message': 'Hi ' + name + ', looking forward to our strategy walkthrough at ' + slot + '!',

    // Helper fields
    prospectConfirmation,
    sureshAlert,
    emailHtml,
    twoHourReminderMessage,
    meetingLink,
    slot
  }
}];
'''

match_js = r'''
const bookingPhone = $('2. Format & Prepare Booking Intelligence').item.json.Phone;
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
    'name': 'AI Automated Demo Booking & No-Show Recovery Engine',
    'nodes': [
        {
            'id': 'webhook-demo-booking',
            'name': '1. Webhook (Demo Booking)',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [100, 300],
            'webhookId': 'demo-booking',
            'parameters': {
                'httpMethod': 'POST',
                'path': 'demo-booking',
                'responseMode': 'onReceived',
                'responseData': 'allEntries',
                'options': {}
            }
        },
        {
            'id': 'code-prepare-booking-intelligence',
            'name': '2. Format & Prepare Booking Intelligence',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [340, 300],
            'parameters': {
                'jsCode': code_js
            }
        },
        {
            'id': 'gs-update-sheet2',
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
            'id': 'http-send-prospect-whatsapp',
            'name': '4. Send VIP Confirmation to Prospect (WhatsApp)',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [820, 200],
            'continueOnFail': True,
            'parameters': {
                'method': 'POST',
                'url': 'https://whatsapp-assistant-iqpi.onrender.com/api/send-message',
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '={\n  "phone": "{{ $(\'2. Format & Prepare Booking Intelligence\').item.json.Phone }}",\n  "message": {{ JSON.stringify($(\'2. Format & Prepare Booking Intelligence\').item.json.prospectConfirmation) }}\n}'
            }
        },
        {
            'id': 'http-send-suresh-whatsapp',
            'name': '5. Send Instant Demo Alert to Suresh (WhatsApp)',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [1040, 200],
            'continueOnFail': True,
            'parameters': {
                'method': 'POST',
                'url': 'https://whatsapp-assistant-iqpi.onrender.com/api/send-message',
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '={\n  "phone": "919361599097",\n  "message": {{ JSON.stringify($(\'2. Format & Prepare Booking Intelligence\').item.json.sureshAlert) }}\n}'
            }
        },
        {
            'id': 'gmail-send-suresh-briefing',
            'name': '6. Send Strategy Briefing & Calendar Invite (Gmail)',
            'type': 'n8n-nodes-base.gmail',
            'typeVersion': 2.1,
            'position': [1260, 200],
            'continueOnFail': True,
            'parameters': {
                'sendTo': 'sureshkumar20133151@gmail.com',
                'subject': '=🔥 [VIP DEMO BOOKED] {{ $(\'2. Format & Prepare Booking Intelligence\').item.json.Company }} - {{ $(\'2. Format & Prepare Booking Intelligence\').item.json.Name }} ({{ $(\'2. Format & Prepare Booking Intelligence\').item.json.slot }})',
                'emailType': 'html',
                'message': '={{ $(\'2. Format & Prepare Booking Intelligence\').item.json.emailHtml }}'
            },
            'credentials': {
                'gmailOAuth2': {
                    'id': 'cwBPj5LyhtzfYo07',
                    'name': 'Gmail account'
                }
            }
        },
        {
            'id': 'http-fetch-outreach-prospects',
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
            'id': 'code-match-outreach-prospect',
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
            'id': 'if-outreach-matched',
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
            'id': 'http-update-outreach-status',
            'name': '10. Mark Outreach Status as Demo Booked',
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
                'jsonBody': '={{ JSON.stringify({ range: "OutreachProspects!J" + $json.rowIndex + ":J" + $json.rowIndex, majorDimension: "ROWS", values: [["Demo Booked"]] }) }}'
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
        '1. Webhook (Demo Booking)': {
            'main': [
                [
                    {
                        'node': '2. Format & Prepare Booking Intelligence',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '2. Format & Prepare Booking Intelligence': {
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
                        'node': '4. Send VIP Confirmation to Prospect (WhatsApp)',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '4. Send VIP Confirmation to Prospect (WhatsApp)': {
            'main': [
                [
                    {
                        'node': '5. Send Instant Demo Alert to Suresh (WhatsApp)',
                        'type': 'main',
                        'index': 0
                    }
                ]
            ]
        },
        '5. Send Instant Demo Alert to Suresh (WhatsApp)': {
            'main': [
                [
                    {
                        'node': '6. Send Strategy Briefing & Calendar Invite (Gmail)',
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
                        'node': '10. Mark Outreach Status as Demo Booked',
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

with open('demo_booking_workflow.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2)

print("Saved demo_booking_workflow.json")

# Check if workflow already exists in n8n Cloud
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
            if 'Demo Booking' in w.get('name', ''):
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
    # Update existing
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
    # Create new
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
