import sqlite3
import json
import uuid
import datetime

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
wf_id = 'WfLinkedInViralPost03'

# ============================================================
# COMPLETE 7-STEP LINKEDIN CONTENT PARASITE WORKFLOW
# ============================================================

nodes = [
    # ── STEP 1: Form Trigger ──────────────────────────────────
    {
        "id": "node-form-submission",
        "name": "On form submission",
        "type": "n8n-nodes-base.formTrigger",
        "typeVersion": 2.2,
        "position": [250, 300],
        "parameters": {
            "path": "linkedin-content-parasite",
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
                    },
                    {
                        "fieldLabel": "Number of Posts per Profile",
                        "fieldType": "number",
                        "requiredField": True
                    }
                ]
            },
            "respondWith": "formSubmitted",
            "options": {}
        }
    },

    # ── STEP 2: Apify LinkedIn Post Scraper ───────────────────
    {
        "id": "node-apify-scraper",
        "name": "Run an Actor and get dataset",
        "type": "@apify/n8n-nodes-apify.apify",
        "typeVersion": 1,
        "position": [500, 300],
        "credentials": {
            "apifyApi": {
                "id": "0guWZHsulb6dhYGJ",
                "name": "Apify account 2"
            }
        },
        "parameters": {
            "actorId": "curious_coder~linkedin-post-scraper",
            "runInput": "={{ JSON.stringify({ \"profileUrls\": [ $json[\"LinkedIn Account Number 1 (URL)\"], $json[\"LinkedIn Account Number 2 (URL)\"] ], \"maxPosts\": $json[\"Number of Posts per Profile\"] || 10, \"proxy\": { \"useApifyProxy\": true } }) }}",
            "options": {}
        }
    },

    # ── STEP 3: Loop Over Items (batch of 5) ──────────────────
    {
        "id": "node-loop-items",
        "name": "Loop Over Items",
        "type": "n8n-nodes-base.splitInBatches",
        "typeVersion": 3,
        "position": [750, 300],
        "parameters": {
            "batchSize": 5,
            "options": {}
        }
    },

    # ── STEP 4: OpenAI Post Classifier (Relevance Check) ─────
    {
        "id": "node-classify-post",
        "name": "Classify Post Relevance",
        "type": "@n8n/n8n-nodes-langchain.openAi",
        "typeVersion": 1.8,
        "position": [1000, 200],
        "credentials": {
            "openAiApi": {
                "id": "VfozM1981vYIutxx",
                "name": "OpenAI account"
            }
        },
        "parameters": {
            "resource": "chat",
            "operation": "message",
            "modelId": {
                "__rl": True,
                "value": "openai/gpt-oss-20b",
                "mode": "id"
            },
            "messages": {
                "values": [
                    {
                        "content": "You are a helpful and precise LinkedIn post classifier. Your job is to determine if a LinkedIn post is relevant for an AI-focused, tech-savvy, and entrepreneurial audience. A post is RELEVANT if it discusses: AI, automation, machine learning, SaaS, startups, productivity tools, coding, digital marketing strategies, business growth, or tech industry insights. A post is NOT RELEVANT if it is: a personal life update (birthday, vacation, wedding), purely motivational quotes without substance, job announcements, or generic congratulations. You MUST respond ONLY with valid JSON in this exact format: {\"verdict\": \"relevant\"} or {\"verdict\": \"not relevant\"}. No other text.",
                        "role": "system"
                    },
                    {
                        "content": "={{ \"Classify this LinkedIn post as relevant or not relevant for an AI/tech audience. Post text: \" + ($json.text || $json.postText || $json.content || JSON.stringify($json)) }}",
                        "role": "user"
                    }
                ]
            },
            "options": {
                "temperature": 0.1,
                "maxTokens": 50
            }
        }
    },

    # ── STEP 5: Parse AI Response ─────────────────────────────
    {
        "id": "node-parse-verdict",
        "name": "Parse Verdict",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [1250, 200],
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": "v1",
                        "name": "verdict",
                        "value": "={{ JSON.parse($json.message?.content || $json.content || '{\"verdict\":\"not relevant\"}').verdict }}",
                        "type": "string"
                    },
                    {
                        "id": "v2",
                        "name": "originalPost",
                        "value": "={{ $('Loop Over Items').item.json.text || $('Loop Over Items').item.json.postText || $('Loop Over Items').item.json.content || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "v3",
                        "name": "postUrl",
                        "value": "={{ $('Loop Over Items').item.json.url || $('Loop Over Items').item.json.postUrl || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "v4",
                        "name": "creator",
                        "value": "={{ $('Loop Over Items').item.json.authorName || $('Loop Over Items').item.json.author || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "v5",
                        "name": "likes",
                        "value": "={{ $('Loop Over Items').item.json.likesCount || $('Loop Over Items').item.json.likes || 0 }}",
                        "type": "number"
                    },
                    {
                        "id": "v6",
                        "name": "comments",
                        "value": "={{ $('Loop Over Items').item.json.commentsCount || $('Loop Over Items').item.json.comments || 0 }}",
                        "type": "number"
                    },
                    {
                        "id": "v7",
                        "name": "postDate",
                        "value": "={{ $('Loop Over Items').item.json.postedAt || $('Loop Over Items').item.json.date || '' }}",
                        "type": "string"
                    }
                ]
            },
            "options": {}
        }
    },

    # ── STEP 5B: Filter (only keep relevant posts) ────────────
    {
        "id": "node-filter-relevant",
        "name": "Filter Relevant Posts",
        "type": "n8n-nodes-base.filter",
        "typeVersion": 2,
        "position": [1500, 200],
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": False,
                    "leftValue": "",
                    "typeValidation": "loose"
                },
                "conditions": [
                    {
                        "id": "filter1",
                        "leftValue": "={{ $json.verdict }}",
                        "rightValue": "relevant",
                        "operator": {
                            "type": "string",
                            "operation": "equals"
                        }
                    }
                ],
                "combinator": "and"
            },
            "options": {}
        }
    },

    # ── STEP 6: AI Rewrite Post (using NVIDIA/OpenAI) ─────────
    {
        "id": "node-rewrite-post",
        "name": "Rewrite Post (AI Writer)",
        "type": "@n8n/n8n-nodes-langchain.openAi",
        "typeVersion": 1.8,
        "position": [1750, 200],
        "credentials": {
            "openAiApi": {
                "id": "VfozM1981vYIutxx",
                "name": "OpenAI account"
            }
        },
        "parameters": {
            "resource": "chat",
            "operation": "message",
            "modelId": {
                "__rl": True,
                "value": "openai/gpt-oss-20b",
                "mode": "id"
            },
            "messages": {
                "values": [
                    {
                        "content": "You are an expert LinkedIn ghostwriter. Your job is to take an existing LinkedIn post and rewrite it in a fresh, original voice while preserving the core idea and value.\n\nYour writing style rules:\n- Use a no-fluff, direct, and young professional tone\n- Keep it conversational but smart\n- Use short paragraphs (1-2 sentences max per paragraph)\n- Start with a strong hook that stops the scroll\n- Include line breaks between paragraphs for readability\n- Do NOT use rhetorical questions\n- Do NOT use cliche phrases like \"In today's fast-paced world\" or \"Let's dive in\"\n- Do NOT sound robotic or corporate\n- Add relevant emojis sparingly (max 3-4 per post)\n- End with a clear call-to-action or thought-provoking statement\n- Keep the post between 150-250 words\n- Output ONLY the rewritten post text, nothing else",
                        "role": "system"
                    },
                    {
                        "content": "={{ \"Rewrite this LinkedIn post in your unique voice while keeping the core message and value intact:\\n\\n\" + $json.originalPost }}",
                        "role": "user"
                    }
                ]
            },
            "options": {
                "temperature": 0.8,
                "maxTokens": 1000
            }
        }
    },

    # ── STEP 6B: Extract Rewritten Post + Core Idea ───────────
    {
        "id": "node-extract-rewrite",
        "name": "Prepare Google Sheets Data",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [2000, 200],
        "parameters": {
            "assignments": {
                "assignments": [
                    {
                        "id": "g1",
                        "name": "Date",
                        "value": "={{ $json.postDate ? $toDateTime($json.postDate).format('yyyy-MM-dd') : $now.format('yyyy-MM-dd') }}",
                        "type": "string"
                    },
                    {
                        "id": "g2",
                        "name": "Creator",
                        "value": "={{ $json.creator }}",
                        "type": "string"
                    },
                    {
                        "id": "g3",
                        "name": "Post URL",
                        "value": "={{ $json.postUrl }}",
                        "type": "string"
                    },
                    {
                        "id": "g4",
                        "name": "Original Post",
                        "value": "={{ $json.originalPost }}",
                        "type": "string"
                    },
                    {
                        "id": "g5",
                        "name": "Rewritten Post",
                        "value": "={{ $('Rewrite Post (AI Writer)').item.json.message?.content || $('Rewrite Post (AI Writer)').item.json.content || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "g6",
                        "name": "Likes",
                        "value": "={{ $json.likes }}",
                        "type": "number"
                    },
                    {
                        "id": "g7",
                        "name": "Comments",
                        "value": "={{ $json.comments }}",
                        "type": "number"
                    }
                ]
            },
            "options": {}
        }
    },

    # ── STEP 7: Google Sheets - Append Row ────────────────────
    {
        "id": "node-google-sheets",
        "name": "Save to Google Sheets",
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [2250, 200],
        "parameters": {
            "operation": "appendOrUpdate",
            "documentId": {
                "__rl": True,
                "value": "",
                "mode": "list",
                "cachedResultName": ""
            },
            "sheetName": {
                "__rl": True,
                "value": "",
                "mode": "list",
                "cachedResultName": ""
            },
            "columns": {
                "mappingMode": "autoMapInputData",
                "value": {}
            },
            "options": {}
        }
    }
]

# ── CONNECTIONS (Full Pipeline) ───────────────────────────────
connections = {
    "On form submission": {
        "main": [
            [{"node": "Run an Actor and get dataset", "type": "main", "index": 0}]
        ]
    },
    "Run an Actor and get dataset": {
        "main": [
            [{"node": "Loop Over Items", "type": "main", "index": 0}]
        ]
    },
    "Loop Over Items": {
        "main": [
            [],
            [{"node": "Classify Post Relevance", "type": "main", "index": 0}]
        ]
    },
    "Classify Post Relevance": {
        "main": [
            [{"node": "Parse Verdict", "type": "main", "index": 0}]
        ]
    },
    "Parse Verdict": {
        "main": [
            [{"node": "Filter Relevant Posts", "type": "main", "index": 0}]
        ]
    },
    "Filter Relevant Posts": {
        "main": [
            [{"node": "Rewrite Post (AI Writer)", "type": "main", "index": 0}]
        ]
    },
    "Rewrite Post (AI Writer)": {
        "main": [
            [{"node": "Prepare Google Sheets Data", "type": "main", "index": 0}]
        ]
    },
    "Prepare Google Sheets Data": {
        "main": [
            [{"node": "Save to Google Sheets", "type": "main", "index": 0}]
        ]
    },
    "Save to Google Sheets": {
        "main": [
            [{"node": "Loop Over Items", "type": "main", "index": 0}]
        ]
    }
}

# ── UPDATE DATABASE ───────────────────────────────────────────
conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
cursor = conn.cursor()

cursor.execute('''
    UPDATE workflow_entity 
    SET nodes = ?, 
        connections = ?, 
        updatedAt = ?,
        versionId = ?,
        name = ?,
        description = ?
    WHERE id = ?
''', (
    json.dumps(nodes),
    json.dumps(connections),
    now,
    str(uuid.uuid4()),
    '3. AI System - Viral LinkedIn Post Generator',
    'Complete 7-step LinkedIn content parasite: Form Input -> Apify Scraper -> Loop -> AI Classifier -> Filter -> AI Rewriter -> Google Sheets',
    wf_id
))

conn.commit()
conn.close()

# Also save backup JSON
with open(r'c:\Users\Suresh\Documents\Antigravity\5. N8n\3_linkedin_content_parasite_FULL.json', 'w') as f:
    json.dump({
        'name': '3. AI System - Viral LinkedIn Post Generator',
        'nodes': nodes,
        'connections': connections,
        'active': True
    }, f, indent=2)

print("=" * 60)
print("COMPLETE WORKFLOW BUILT AND IMPORTED SUCCESSFULLY!")
print("=" * 60)
print()
print("7 Steps Created:")
print("  1. On form submission (Form Trigger)")
print("  2. Run an Actor and get dataset (Apify Scraper)")
print("  3. Loop Over Items (Batch of 5)")
print("  4. Classify Post Relevance (AI Classifier)")
print("  5. Filter Relevant Posts (Filter)")
print("  6. Rewrite Post (AI Writer)")
print("  7. Save to Google Sheets")
print()
print("NOTE: You need to configure Google Sheets credential in n8n UI")
print("NOTE: Refresh browser (F5) to see updated workflow")
