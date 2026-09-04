import sqlite3, json, uuid, datetime

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
wf_id = 'WfLinkedInScheduled04'
SHEET_ID = '1JmPTd-kARaWCe5VXK1bz4YbgUnR59S31DdZFypH4_3I'
SHEET_NAME = 'Sheet1'  # Default sheet - user can change
SHEETS_CRED_ID = 'Vb6GWdLrAg3DKey4'
SHEETS_CRED_NAME = 'Google Sheets account'
GEMINI_CRED_ID = 'WjmAjaXaDUgMB3GY'
GEMINI_CRED_NAME = 'Google Gemini(PaLM) Api account'
LINKEDIN_CRED_ID = 'R0Z8UeN8K3W0CTd2'
LINKEDIN_CRED_NAME = 'LinkedIn account suresh'

nodes = [
    # ── STEP 1: Schedule Trigger (10:00 AM IST = 04:30 UTC, Mon-Fri) ──
    {
        "id": "node-schedule-trigger",
        "name": "Schedule Trigger (10 AM IST)",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [-800, 200],
        "parameters": {
            "rule": {
                "interval": [
                    {
                        "field": "cronExpression",
                        "expression": "30 4 * * 1-5"
                    }
                ]
            }
        }
    },

    # ── STEP 2: Google Sheets - Read Next Pending Idea ──────────────
    {
        "id": "node-sheets-read",
        "name": "Get Pending Post Idea",
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [-560, 200],
        "credentials": {
            "googleSheetsOAuth2Api": {
                "id": SHEETS_CRED_ID,
                "name": SHEETS_CRED_NAME
            }
        },
        "parameters": {
            "operation": "read",
            "documentId": {
                "__rl": True,
                "value": SHEET_ID,
                "mode": "id"
            },
            "sheetName": {
                "__rl": True,
                "value": SHEET_NAME,
                "mode": "name"
            },
            "filtersUI": {
                "values": [
                    {
                        "lookupColumn": "Status",
                        "lookupValue": "Pending"
                    }
                ]
            },
            "options": {
                "returnFirstMatch": True
            }
        }
    },

    # ── STEP 3: IF Check - Is there a pending idea? ─────────────────
    {
        "id": "node-if-check",
        "name": "Has Pending Ideas?",
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [-320, 200],
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": False},
                "conditions": [
                    {
                        "id": "check1",
                        "leftValue": "={{ $json.Topic }}",
                        "rightValue": "",
                        "operator": {
                            "type": "string",
                            "operation": "isNotEmpty"
                        }
                    }
                ],
                "combinator": "and"
            }
        }
    },

    # ── STEP 4: LLM Chain - Generate LinkedIn Post ──────────────────
    {
        "id": "node-llm-chain",
        "name": "Generate LinkedIn Post",
        "type": "@n8n/n8n-nodes-langchain.chainLlm",
        "typeVersion": 1.4,
        "position": [-80, 80],
        "parameters": {
            "prompt": "={{ \"Write a LinkedIn post about the following topic:\\n\\nTopic: \" + $json.Topic + \"\\nTarget Audience: \" + ($json['Target Audience'] || 'Software developers and business owners') + \"\\nTone: \" + ($json.Tone || 'Professional but conversational') }}",
            "messages": {
                "messageValues": [
                    {
                        "message": "You are an expert LinkedIn ghostwriter who creates viral, high-engagement posts for a solo developer from Madurai, India who specializes in:\n- Custom Software Development\n- Web & Mobile App Development\n- AI Agents & Automation\n- SaaS & API Development\n- Business Process Automation\n\nYour writing rules:\n✅ Start with a powerful hook (first line must stop the scroll)\n✅ Use short paragraphs (1-3 sentences max)\n✅ Add line breaks between every paragraph for easy reading\n✅ Use 2-4 relevant emojis strategically\n✅ Be direct, confident, and value-driven\n✅ End with a clear call-to-action or thought-provoking question\n✅ Keep total length between 150-250 words\n✅ Write in first person as the developer\n✅ Include specific numbers, examples, or results when relevant\n\n❌ NO generic phrases like 'In today's fast-paced world...'\n❌ NO corporate jargon\n❌ NO clickbait\n❌ NO hashtags (they will be added separately)\n\nOutput ONLY the post text. Nothing else.",
                        "type": "systemMessage"
                    }
                ]
            }
        }
    },

    # ── STEP 4B: Gemini Model ────────────────────────────────────────
    {
        "id": "node-gemini-model",
        "name": "Google Gemini Chat Model",
        "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        "typeVersion": 1.1,
        "position": [-80, 280],
        "credentials": {
            "googlePalmApi": {
                "id": GEMINI_CRED_ID,
                "name": GEMINI_CRED_NAME
            }
        },
        "parameters": {
            "model": "gemini-1.5-flash",
            "options": {"temperature": 0.85}
        }
    },

    # ── STEP 5: Prepare Final Post ──────────────────────────────────
    {
        "id": "node-prepare-post",
        "name": "Prepare Final Post",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [180, 80],
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": "p1",
                        "name": "finalPost",
                        "value": "={{ ($json.text || $json.output || '').trim() + '\\n\\n#SoftwareDevelopment #AI #Automation #SaaS #WebDevelopment #Tech #Madurai #SoloDeveloper' }}",
                        "type": "string"
                    },
                    {
                        "id": "p2",
                        "name": "topic",
                        "value": "={{ $('Get Pending Post Idea').item.json.Topic }}",
                        "type": "string"
                    },
                    {
                        "id": "p3",
                        "name": "rowKey",
                        "value": "={{ $('Get Pending Post Idea').item.json.Topic }}",
                        "type": "string"
                    }
                ]
            }
        }
    },

    # ── STEP 6: LinkedIn - Create Post ──────────────────────────────
    {
        "id": "node-linkedin-post",
        "name": "Post to LinkedIn",
        "type": "n8n-nodes-base.linkedIn",
        "typeVersion": 1,
        "position": [420, 80],
        "credentials": {
            "linkedInOAuth2Api": {
                "id": LINKEDIN_CRED_ID,
                "name": LINKEDIN_CRED_NAME
            }
        },
        "parameters": {
            "person": "-XUVlhXDqX",
            "text": "={{ $json.finalPost }}",
            "additionalFields": {}
        }
    },

    # ── STEP 7: Google Sheets - Update Status ───────────────────────
    {
        "id": "node-sheets-update",
        "name": "Mark as Posted",
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [660, 80],
        "credentials": {
            "googleSheetsOAuth2Api": {
                "id": SHEETS_CRED_ID,
                "name": SHEETS_CRED_NAME
            }
        },
        "parameters": {
            "operation": "update",
            "documentId": {
                "__rl": True,
                "value": SHEET_ID,
                "mode": "id"
            },
            "sheetName": {
                "__rl": True,
                "value": SHEET_NAME,
                "mode": "name"
            },
            "columns": {
                "mappingMode": "defineBelow",
                "value": {
                    "Status": "Posted",
                    "Posted Date": "={{ $now.format('dd-MM-yyyy') }}",
                    "Generated Post": "={{ $('Prepare Final Post').item.json.finalPost }}"
                },
                "matchingColumns": ["Topic"]
            },
            "options": {}
        }
    },

    # ── STEP 8: No pending ideas stop ───────────────────────────────
    {
        "id": "node-no-ideas",
        "name": "No Pending Ideas",
        "type": "n8n-nodes-base.noOp",
        "typeVersion": 1,
        "position": [-80, 420],
        "parameters": {}
    }
]

connections = {
    "Schedule Trigger (10 AM IST)": {
        "main": [[{"node": "Get Pending Post Idea", "type": "main", "index": 0}]]
    },
    "Get Pending Post Idea": {
        "main": [[{"node": "Has Pending Ideas?", "type": "main", "index": 0}]]
    },
    "Has Pending Ideas?": {
        "main": [
            [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}],
            [{"node": "No Pending Ideas", "type": "main", "index": 0}]
        ]
    },
    "Google Gemini Chat Model": {
        "ai_languageModel": [
            [{"node": "Generate LinkedIn Post", "type": "ai_languageModel", "index": 0}]
        ]
    },
    "Generate LinkedIn Post": {
        "main": [[{"node": "Prepare Final Post", "type": "main", "index": 0}]]
    },
    "Prepare Final Post": {
        "main": [[{"node": "Post to LinkedIn", "type": "main", "index": 0}]]
    },
    "Post to LinkedIn": {
        "main": [[{"node": "Mark as Posted", "type": "main", "index": 0}]]
    }
}

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

c.execute('SELECT id FROM workflow_entity WHERE id=?', (wf_id,))
exists = c.fetchone()

if exists:
    c.execute('''UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=?, versionId=?, name=?
                 WHERE id=?''', (
        json.dumps(nodes), json.dumps(connections), now,
        str(uuid.uuid4()), '4. AI System - Scheduled LinkedIn Post Generator', wf_id
    ))
else:
    c.execute('''INSERT INTO workflow_entity (id, name, active, nodes, connections, createdAt, updatedAt, settings, staticData, pinData, versionId, triggerCount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
        wf_id, '4. AI System - Scheduled LinkedIn Post Generator',
        0, json.dumps(nodes), json.dumps(connections),
        now, now, json.dumps({"executionOrder": "v1"}),
        '{}', '{}', str(uuid.uuid4()), 0
    ))

conn.commit()
conn.close()

print("=" * 60)
print("SUCCESS! Workflow updated with your Google Sheet!")
print(f"Sheet ID: {SHEET_ID}")
print("Runs: Mon-Fri at 10:00 AM IST (04:30 UTC)")
print("=" * 60)
print("\nNext Step - Add these columns to your Google Sheet:")
print("Topic | Target Audience | Tone | Status | Posted Date | Generated Post")
