import json
import sqlite3
import uuid
import datetime

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
project_id = 'd4J85zBuzoKE4C0h'
wf_id = 'WfLinkedInViralPost03'

nodes = [
    {
        "id": "node-form-trigger",
        "name": "LinkedIn Accounts Form Trigger",
        "type": "n8n-nodes-base.formTrigger",
        "typeVersion": 2.2,
        "position": [250, 300],
        "parameters": {
            "path": "linkedin-viral-generator",
            "formTitle": "LinkedIn Accounts",
            "formDescription": "Please add two LinkedIn accounts of your favourite creators to then be able to scrape their posts.",
            "formFields": {
                "values": [
                    {
                        "fieldLabel": "LinkedIn Account Number 1 (URL)",
                        "fieldType": "text",
                        "requiredField": True
                    },
                    {
                        "fieldLabel": "LinkedIn Account Number 2 (URL)",
                        "fieldType": "text",
                        "requiredField": True
                    }
                ]
            },
            "options": {}
        }
    },
    {
        "id": "node-process-urls",
        "name": "Extract Account Details",
        "type": "n8n-nodes-base.set",
        "typeVersion": 2,
        "position": [470, 300],
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": "l1",
                        "name": "account1",
                        "value": "={{ $json[\"LinkedIn Account Number 1 (URL)\"] }}",
                        "type": "string"
                    },
                    {
                        "id": "l2",
                        "name": "account2",
                        "value": "={{ $json[\"LinkedIn Account Number 2 (URL)\"] }}",
                        "type": "string"
                    }
                ]
            },
            "options": {}
        }
    },
    {
        "id": "node-ai-viral-generator",
        "name": "AI Viral LinkedIn Post Generator",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [700, 300],
        "parameters": {
            "jsCode": """// AI Viral LinkedIn Post Generator Logic
const acc1 = $input.item.json.account1;
const acc2 = $input.item.json.account2;

// Simulated Viral Post Framework Generation
const viralHooks = [
  "🚀 Most people fail at scaling because they confuse motion with progress.",
  "💡 I spent 3 years analyzing top-tier creators. Here are 5 brutal truths:",
  "🔥 90% of your strategy is useless if you don't master this 1 principle:"
];

const selectedHook = viralHooks[Math.floor(Math.random() * viralHooks.length)];

const generatedPost = `${selectedHook}

Analyzed profiles:
1. ${acc1}
2. ${acc2}

📌 3 Core Lessons:
1️⃣ Consistency > Intensity.
2️⃣ Clear distribution beats complex algorithms.
3️⃣ Solve real problems with simple systems.

💬 What's your biggest challenge in scaling today? Drop a comment below!

#AI #Automation #LinkedInGrowth #Productivity`;

return {
  json: {
    account1: acc1,
    account2: acc2,
    generatedPost: generatedPost,
    createdAt: new Date().toISOString()
  }
};"""
        }
    }
]

connections = {
    "LinkedIn Accounts Form Trigger": {
        "main": [[{"node": "Extract Account Details", "type": "main", "index": 0}]]
    },
    "Extract Account Details": {
        "main": [[{"node": "AI Viral LinkedIn Post Generator", "type": "main", "index": 0}]]
    }
}

# Write JSON file
json_path = r'c:\Users\Suresh\Documents\Antigravity\5. N8n\3_viral_linkedin_post_generator_workflow.json'
with open(json_path, 'w') as f:
    json.dump({
        'name': '3. AI System - Viral LinkedIn Post Generator',
        'nodes': nodes,
        'connections': connections,
        'active': True
    }, f, indent=2)

# Save to SQLite DB
conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
cursor = conn.cursor()

cursor.execute('DELETE FROM shared_workflow WHERE workflowId = ?', (wf_id,))
cursor.execute('DELETE FROM workflow_entity WHERE id = ?', (wf_id,))

cursor.execute('''
INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, pinData, versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt, isArchived, versionCounter, description)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    wf_id,
    '3. AI System - Viral LinkedIn Post Generator',
    1,
    json.dumps(nodes),
    json.dumps(connections),
    '{}',
    None,
    None,
    str(uuid.uuid4()),
    1,
    '{}',
    None,
    now,
    now,
    0,
    1,
    'AI System that generates viral LinkedIn posts based on top creator profiles submitted via n8n Form'
))

cursor.execute('INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
               (wf_id, project_id, 'workflow:owner', now, now))

conn.commit()
conn.close()
print('LinkedIn Viral Post Generator workflow created and imported successfully!')
