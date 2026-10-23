import urllib.request
import urllib.error
import json

webhook_url = 'https://suresh-n8n-fhr6.onrender.com/webhook/whatsapp-direct-lead'

mock_lead = {
    "name": "Karthik Raj",
    "phone": "910000000000",
    "company": "Apex Interior Studio",
    "industry": "Interior Design & Architecture",
    "location": "Madurai, Tamil Nadu",
    "teamSize": "6 members",
    "revenueRange": "₹25L - ₹1Cr",
    "authorityLevel": "Decision Maker (Founder)",
    "monthlyEnquiries": "8-12 leads/month",
    "currentSource": "Instagram & Word of Mouth",
    "currentProcess": "Instagram DM -> Manual WhatsApp reply -> Slow Quotation PDF via Excel",
    "buyingTrigger": "Lost 3 high-ticket villa interior projects worth ₹35 Lakhs last month due to 4-hour delay in responding",
    "problemCategory": "Lead Conversion & Speed-to-Lead Automation",
    "painPoint": "Delay in qualifying Instagram inquiries; losing high-ticket residential villa clients to competitors who respond in 2 minutes",
    "painSeverity": "Critical",
    "dreamOutcome": "Close 15+ premium villa turnkey contracts every month with 24/7 instant WhatsApp consultation booking",
    "lostOpportunity": "₹25 Lakhs - ₹35 Lakhs per quarter in lost client retainers",
    "currentTools": "WhatsApp Business App, Canva, Excel spreadsheets",
    "transformationStatement": "Transform slow manual Instagram enquiry management into an Autonomous 24/7 WhatsApp AI Sales Strategist that qualifies budget and books site inspections instantly",
    "grandSlamOffer": "Apex Villa Interior Growth Engine: 24/7 Tamil & English WhatsApp AI Consultant + Instant Budget Qualifier + Automated Calendar Site Booking + n8n Multi-stage Followup",
    "aiConfidence": "96% High Fit (High average ticket size ₹5L+ with urgent pain on speed-to-lead)",
    "urgency": "Critical",
    "timeline": "Immediate (Within 7 Days)",
    "budgetStatus": "Allocated & Ready to Invest",
    "leadScore": "Hot",
    "sureshClosingScript": "1. Hook: 'Hey Karthik, I reviewed your studio. Responding in 4 hours on Instagram is costing you ₹10L+ every month in lost villa enquiries.'\n2. Pitch: 'We deploy an Autonomous WhatsApp AI Agent for Apex that qualifies client floorplans and budgets in 60 seconds in Tamil or English.'\n3. Close: 'Let's launch your pilot this week so you don't miss this weekend's inquiry spike.'",
    "followupStrategy": "Send instant voice note or WhatsApp message within 5 minutes referencing his lost ₹35L villa leads.",
    "pipelineStage": "2. QUALIFIED",
    "conversationIntent": "Ready To Buy",
    "estimatedDealValue": "₹29,999",
    "winProbability": "80%",
    "revenueForecast": "₹24,000",
    "nextFollowupDate": "2026-10-20",
    "lossReason": "-",
    "lastContactedDate": "2026-10-19 00:22:00"
}

req = urllib.request.Request(
    webhook_url,
    data=json.dumps(mock_lead).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        print("Webhook Status Code:", resp.status)
        print("Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
