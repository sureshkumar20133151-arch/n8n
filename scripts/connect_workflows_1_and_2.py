import json

with open('project/01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

# Track 0 nodes definition
track0_nodes = [
    {
        "parameters": {
            "content": "## 💬 Track 0: Live Inbound WhatsApp Chat & AI Assistant\n- **Direct WhatsApp Bridge:** Ingests live inbound messages.\n- **Gemini AI Sales Strategist:** Consultative dialogue in crisp English/Tamil (Suresh Kumar persona).\n- **Zero-Interrogation Router:** Dynamically routes into Track 1 (Lead Logger), Track 2 (Demo Booking), or Track 3 (Proposal Delivery).",
            "height": 640,
            "width": 1480,
            "color": 6
        },
        "id": "note-track-0",
        "name": "Note - Track 0: Inbound WhatsApp Chat & AI Assistant",
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [-60, -960]
    },
    {
        "parameters": {
            "httpMethod": "POST",
            "path": "whatsapp-inbound",
            "responseMode": "onReceived",
            "options": {}
        },
        "id": "chat-webhook-inbound",
        "name": "0. [Chat] Inbound WhatsApp Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [120, -740],
        "webhookId": "whatsapp-inbound-unified"
    },
    {
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": "p-phone",
                        "name": "senderPhone",
                        "value": "={{ $json.body?.from || $json.body?.phone || $json.body?.sender || '919361599097' }}",
                        "type": "string"
                    },
                    {
                        "id": "p-name",
                        "name": "senderName",
                        "value": "={{ $json.body?.senderName || $json.body?.pushName || $json.body?.name || 'Friend' }}",
                        "type": "string"
                    },
                    {
                        "id": "p-text",
                        "name": "userMessage",
                        "value": "={{ $json.body?.text || $json.body?.body || $json.body?.message || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "p-time",
                        "name": "timestamp",
                        "value": "={{ $now.format('yyyy-MM-dd HH:mm:ss') }}",
                        "type": "string"
                    }
                ]
            },
            "options": {}
        },
        "id": "chat-extract-msg",
        "name": "0. [Chat] Extract Message & Sender",
        "type": "n8n-nodes-base.set",
        "typeVersion": 2,
        "position": [360, -740]
    },
    {
        "parameters": {
            "method": "POST",
            "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{ $env.GEMINI_API_KEY }}",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={\n  \"contents\": [\n    {\n      \"role\": \"user\",\n      \"parts\": [\n        {\n          \"text\": \"Customer Name: {{ $json.senderName }}\\nCustomer Phone: {{ $json.senderPhone }}\\nMessage: {{ $json.userMessage }}\"\n        }\n      ]\n    }\n  ],\n  \"systemInstruction\": {\n    \"parts\": [\n      {\n        \"text\": \"You are the Senior Business Partner & AI Sales Strategist for Suresh Kumar, Solo Developer based in Madurai, Tamil Nadu (solodeveloper.pro, +91 93615 99097). Suresh builds high-performance modern websites (Next.js, 3D, scroll animations, starting ₹8,999-₹9,999) and 24/7 autonomous AI WhatsApp & CRM systems (₹19,999+). 7-day turnaround. 30 days free support.\\n\\nRULES:\\n1. Answer the customer warmly in 3-4 crisp lines. If query is in Tamil/Tanglish, reply in friendly conversational Tamil script or natural Tanglish. If in English, reply in crisp professional English.\\n2. Output ONLY a valid JSON object with format:\\n{\\n  \\\"replyText\\\": \\\"Your WhatsApp answer to customer\\\",\\n  \\\"action\\\": \\\"NONE\\\" | \\\"LEAD_CAPTURED\\\" | \\\"DEMO_BOOKED\\\" | \\\"PROPOSAL_REQUESTED\\\",\\n  \\\"extractedData\\\": {\\n    \\\"name\\\": \\\"Customer name\\\",\\n    \\\"company\\\": \\\"Business name or General\\\",\\n    \\\"industry\\\": \\\"Industry vertical\\\",\\n    \\\"phone\\\": \\\"Phone number\\\",\\n    \\\"email\\\": \\\"Email if mentioned or none\\\",\\n    \\\"painPoint\\\": \\\"Core problem\\\",\\n    \\\"dealValue\\\": \\\"Estimated deal value\\\",\\n    \\\"slot\\\": \\\"Preferred meeting slot if demo\\\",\\n    \\\"tier\\\": \\\"Foundation or Growth\\\"\\n  }\\n}\"\n      }\n    ]\n  }\n}",
            "options": {}
        },
        "id": "chat-gemini-assistant",
        "name": "0. [Chat] Gemini AI Assistant & Action Classifier",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [620, -740]
    },
    {
        "parameters": {
            "jsCode": """const item = $input.item.json;
const rawResponse = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
const senderPhone = $('0. [Chat] Extract Message & Sender').item.json.senderPhone;
const senderName = $('0. [Chat] Extract Message & Sender').item.json.senderName;

let replyText = 'Hello! Thank you for reaching out to Suresh Kumar (solodeveloper.pro). How can I assist you with modern websites or AI automation today?';
let action = 'NONE';
let extracted = {};

try {
  const jsonMatch = rawResponse.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    replyText = parsed.replyText || replyText;
    action = (parsed.action || 'NONE').toUpperCase();
    extracted = parsed.extractedData || {};
  } else if (rawResponse.trim()) {
    replyText = rawResponse.trim();
  }
} catch (e) {
  if (rawResponse.trim()) replyText = rawResponse.trim();
}

const body = {
  name: extracted.name || senderName,
  prospectName: extracted.name || senderName,
  phone: extracted.phone || senderPhone,
  prospectPhone: extracted.phone || senderPhone,
  email: extracted.email || 'pending@client.com',
  prospectEmail: extracted.email || 'pending@client.com',
  company: extracted.company || 'Business',
  industry: extracted.industry || 'Technology & Services',
  painPoint: extracted.painPoint || 'Manual operations and lead followups',
  dealValue: extracted.dealValue || '₹19,999',
  slot: extracted.slot || 'Tomorrow 11:00 AM',
  preferredSlot: extracted.slot || 'Tomorrow 11:00 AM',
  tier: extracted.tier || 'Tier 2 — Autonomous AI Growth System'
};

return {
  json: {
    senderPhone,
    senderName,
    replyText,
    action,
    body
  }
};"""
        },
        "id": "chat-parse-ai",
        "name": "0. [Chat] Parse AI Response & Prepare Action Data",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [880, -740]
    },
    {
        "parameters": {
            "method": "POST",
            "url": "http://localhost:8080/api/send-message",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={\n  \"phone\": \"={{ $json.senderPhone }}\",\n  \"message\": \"={{ $json.replyText }}\"\n}",
            "options": {}
        },
        "id": "chat-send-reply",
        "name": "0. [Chat] Send WhatsApp Reply",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1140, -880]
    },
    {
        "parameters": {
            "dataType": "string",
            "value1": "={{ $json.action }}",
            "rules": {
                "rules": [
                    {
                        "value2": "LEAD_CAPTURED",
                        "output": 0
                    },
                    {
                        "value2": "DEMO_BOOKED",
                        "output": 1
                    },
                    {
                        "value2": "PROPOSAL_REQUESTED",
                        "output": 2
                    }
                ]
            },
            "fallbackOutput": 3
        },
        "id": "chat-route-action",
        "name": "0. [Chat] Route by Action Intent",
        "type": "n8n-nodes-base.switch",
        "typeVersion": 3,
        "position": [1140, -620]
    }
]

# Avoid duplicate track0 nodes if already present
existing_names = {n.get("name") for n in wf.get("nodes", [])}
new_nodes = [n for n in track0_nodes if n["name"] not in existing_names]

wf["nodes"] = new_nodes + wf["nodes"]

# Update connections
conns = wf.get("connections", {})

conns["0. [Chat] Inbound WhatsApp Webhook"] = {
    "main": [[{"node": "0. [Chat] Extract Message & Sender", "type": "main", "index": 0}]]
}
conns["0. [Chat] Extract Message & Sender"] = {
    "main": [[{"node": "0. [Chat] Gemini AI Assistant & Action Classifier", "type": "main", "index": 0}]]
}
conns["0. [Chat] Gemini AI Assistant & Action Classifier"] = {
    "main": [[{"node": "0. [Chat] Parse AI Response & Prepare Action Data", "type": "main", "index": 0}]]
}
conns["0. [Chat] Parse AI Response & Prepare Action Data"] = {
    "main": [
        [
            {"node": "0. [Chat] Send WhatsApp Reply", "type": "main", "index": 0},
            {"node": "0. [Chat] Route by Action Intent", "type": "main", "index": 0}
        ]
    ]
}

# Connect Route by Action Intent into Tracks 1, 2, 3
conns["0. [Chat] Route by Action Intent"] = {
    "main": [
        [{"node": "2. [Lead] Format & Sanitize Lead", "type": "main", "index": 0}],
        [{"node": "2. [Demo] Format & Prepare Booking Intelligence", "type": "main", "index": 0}],
        [{"node": "2. [Proposal] Format & Generate Proposal Dossier", "type": "main", "index": 0}],
        []
    ]
}

wf["connections"] = conns
wf["name"] = "Unified Master WhatsApp AI Sales & CRM Automation Engine"

out_path = "project/01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=2)

print(f"Successfully generated unified master workflow with {len(wf['nodes'])} nodes.")
