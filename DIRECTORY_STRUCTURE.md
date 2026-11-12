# 🗂️ Complete Directory & System Catalog: 5. N8n

This document provides a comprehensive, structured map of every directory, workflow, script, document, and configuration file inside `5. N8n`.

---

## 🏛️ Top-Level Architecture Map

```
5. N8n/
│
├── 📂 project/                                         # 🌟 All 11 Modular Production Workflows
│   ├── 📁 01_whatsapp_ai_sales_engine/                 # WhatsApp AI Sales Bot + CRM + Meet Booking + Proposals
│   ├── 📁 02_linkedin_viral_post_generator/            # Apify Scraper + Gemini Ghostwriter + Flux Image Prompting
│   ├── 📁 03_scheduled_linkedin_publisher/             # Automated Bi-Daily LinkedIn Publisher (Sheets Queue)
│   ├── 📁 04_website_lead_capture/                     # Website Contact Form -> Instant WhatsApp & CRM Logger
│   ├── 📁 05_wholesale_whatsapp_agent/                 # Wholesale B2B Ordering (Annamaliyar Oil Store)
│   ├── 📁 06_restaurant_whatsapp_agent/                # Restaurant Ordering & Table Reservations (Hotel Taj)
│   ├── 📁 07_multi_business_zero_token_router/         # Zero-Token Intent Router for Multi-Persona Numbers
│   ├── 📁 08_reddit_freelance_webdev_monitor/          # Autonomous Reddit Freelance Lead Radar & DM Pitcher
│   ├── 📁 09_solodev_meta_whatsapp_agent/              # Official Meta WhatsApp Cloud API Agent
│   ├── 📁 10_construction_builder_whatsapp_agent/      # Civil Engineering BOQ Estimator (Danam Holdings)
│   ├── 📁 11_lead_generation_and_cold_outreach/        # Apify Scraper + Lead Auto-Sorter + Anti-Ban Outreach
│   ├── 📄 active_persona.json                          # Real-time active persona state descriptor
│   ├── 📄 MULTI_PERSONA_SWITCHER_PRD.md                # System specification for dynamic multi-business switching
│   ├── 📄 README.md                                    # Master project directory index
│   └── 🌐 switcher_web_page.html                       # Visual web UI to toggle active business persona
│
├── 🤖 whatsapp-gemini-assistant/                       # 🟢 Ultra-lightweight Live Baileys WebSocket Engine (~40MB RAM)
│   ├── 📄 index.js                                     # Main Baileys connection handler & event dispatcher
│   ├── 📄 geminiService.js                             # Google Gemini 1.5/2.0 Flash reasoning service
│   ├── 📄 personaManager.js                            # Dynamic persona state switcher & memory routing
│   ├── 📄 builderPersona.js                            # Danam Holdings Construction persona prompt & logic
│   ├── 📄 builderCustomerMemory.js                     # Plot size, budget & stage memory per homeowner phone
│   ├── 📄 wholesalePersona.js                          # Wholesale oil store persona prompt & discount rules
│   ├── 📄 wholesaleInventoryService.js                 # Real-time stock lookups & bulk discount evaluator
│   ├── 📄 restaurantPersona.js                         # Restaurant persona prompt & menu recommendation engine
│   ├── 📄 restaurantMenuService.js                     # Menu parser & item availability checker
│   ├── 📄 restaurantCartService.js                     # Interactive live cart builder via WhatsApp chat
│   ├── 📄 bookingEngine.js                             # Google Calendar appointment scheduler
│   ├── 📄 proposalEngine.js                            # 3-Tier dynamic proposal generator
│   ├── 📄 knowledgeBase.js                             # Suresh / SoloDeveloper portfolio knowledge store
│   ├── 📄 industryKnowledgeBase.js                     # Multi-vertical market facts & pricing rules
│   ├── 📄 adminRulesManager.js                         # Admin command parser (e.g. #switch, #reset, #status)
│   ├── 📄 sessionPersistence.js                        # File-backed session state preservation
│   ├── 🧪 test_builder_persona.js                      # Unit test suite for construction persona
│   ├── 🧪 test_multi_persona_switcher.js               # Multi-persona toggle integration test
│   ├── 🧪 test_scenarios_validation.js                 # Edge-case validation runner
│   ├── 🧪 simulate_builder_chat.js                     # Interactive CLI chat simulator for builder persona
│   ├── 🌐 scan-qr.html                                 # Visual QR code scanner for WhatsApp pairing
│   ├── 🐳 Dockerfile & docker-compose.yml              # Container deployment assets
│   └── ⚙️ package.json & .env.example                  # Node.js dependencies & environment templates
│
├── 🛠️ scripts/                                         # Deployment, Maintenance & Bridge Utilities
│   ├── 📁 cloud_management/                            # Tools for Neon PostgreSQL & Render n8n deployments
│   │   ├── 📄 push_all_workflows.py                    # Bulk pushes workflows to Cloud n8n via REST API
│   │   ├── 📄 push_lead_wf.py                          # Dedicated deploy script for lead ingestion workflow
│   │   ├── 📄 push_to_neon_n8n.py                      # Direct database sync to Neon Postgres instance
│   │   ├── 📄 list_cloud_workflows.py                  # Queries and lists active workflows on Cloud
│   │   ├── 📄 inspect_lead_wf.py                       # Inspects live workflow configuration on Cloud
│   │   ├── 📄 check_execution.py                       # Pulls recent execution logs & errors from Cloud
│   │   ├── 📄 fetch_qr.js                              # Retrieves live WhatsApp login QR code from server
│   │   ├── 📄 check_live_qr.py                         # Checks pairing status of Baileys connection
│   │   ├── 📄 get_latest_client.js                     # Inspects client socket telemetry
│   │   ├── 📄 test_api.py                              # Verifies API key connectivity to Cloud n8n
│   │   └── 📄 update_switcher_route.py                 # Updates webhook routing rules on Cloud n8n
│   ├── 📁 reddit_local_forwarder/                      # Local proxy to circumvent Cloud IP blocking on Reddit
│   │   └── 📄 reddit_forwarder.py                      # Runs on local IP, polls Reddit RSS, forwards to n8n
│   └── 📁 sqlite_patches_archive/                      # Historical one-off patches applied to local SQLite DB
│       ├── 📄 check_creds.py & fix_credentials.py      # Credential decryptors and repair scripts
│       ├── 📄 fix_switch_node.py & fix_switch_rule_order.py # Switch node expression migrators
│       ├── 📄 fix_google_sheet_matching.py             # Google Sheet column header repair tools
│       ├── 📄 fix_llm_prompt.py                        # LLM prompt schema patchers
│       └── 📄 optimize_layout.py                       # n8n canvas node position optimizer
│
├── 🗄️ archive_workflows/                               # Deprecated & historical workflow revisions
│   ├── 📄 2_whatsapp_outbound_broadcast_workflow.json  # Legacy outbound broadcaster
│   ├── 📄 5_freelance_client_lead_generator.json       # Legacy freelance lead finder
│   ├── 📄 A4dpOmJiZC7jwjaE_current.json                # Snapshot of cloud workflow state
│   ├── 📄 current_direct_lead_logger_wf.json           # Deprecated standalone lead logger
│   ├── 📄 current_master_workflow.json                 # Pre-unification master workflow
│   ├── 📄 current_whatsapp_autoreply_wf.json           # Pre-unification auto-reply flow
│   ├── 📄 current_whatsapp_gemini_wf.json              # Pre-unification Gemini conversation flow
│   └── 📄 workflow3_temp.json                          # Temporary staging copy
│
├── 💾 backups/                                         # Safe rollback copies & historical snapshots
│   ├── 📁 v2_upgrade_backup/                           # Full pre-v2 database snapshot
│   ├── 📄 cloud_MQi8GulHubhexp0f_pre_optimization_backup.json # Cloud workflow snapshot before optimization
│   └── 📄 WfFreelanceLeads05_backup_20260814_001712.json # Timestamped freelance lead backup
│
├── ☁️ huggingface-n8n/                                 # HuggingFace Spaces Deployment Assets
│   ├── 🐳 Dockerfile                                   # Optimized Dockerfile for running n8n on HuggingFace
│   └── 📄 README.md                                    # Setup documentation for HuggingFace Space
│
├── ⚡ Executable Scripts (Root)
│   ├── 🚀 start-n8n.bat                                # Starts local n8n server on port 5678 and opens browser
│   └── 📡 run-reddit-forwarder.bat                     # Launches Reddit Lead Forwarder with terminal HUD
│
├── 📚 System Documentation (Root)
│   ├── 📖 README.md                                    # Master project portal and developer index
│   ├── 🗺️ DIRECTORY_STRUCTURE.md                      # This file — complete directory taxonomy
│   ├── 🧠 KNOWLEDGE.md                                 # Technical knowledge base, lessons learned & gotchas
│   ├── 🌐 SYSTEM_ARCHITECTURE_AND_SETUP.md             # Complete cloud architecture, webhook URLs & schema
│   ├── 📱 WHATSAPP_AI_AGENT_OVERVIEW.md                # Detailed dossier on the 4-track AI Sales Operating System
│   └── ⚙️ N8N_CLOUD_RENDER_NEON_COMPLETE_SETUP.md      # Infrastructure guide for Render (Docker) + Neon (Postgres)
│
└── 🔒 Environment & Configuration Files
    ├── 🔑 .env                                         # Local environment variables (API keys, ports, secrets)
    ├── 🛡️ .gitignore                                   # Standard ignores (credentials, sessions, node_modules)
    ├── 🔐 meta_whatsapp_credentials.json               # Meta WhatsApp Cloud API credentials (ignored by git)
    └── 📦 package.json & package-lock.json             # Root dependencies for local n8n execution
```

---

## 🧭 Directory Responsibilities Matrix

| Directory | Purpose | Access Pattern |
| :--- | :--- | :--- |
| **`project/`** | **The Core Product Line:** Houses all 11 standalone, production-ready n8n workflow systems. | Each folder is self-contained with its workflow JSON, assets (CSVs/prompts), and a `README.md`. |
| **`whatsapp-gemini-assistant/`** | **The WhatsApp Engine:** Dedicated Node.js WebSocket service running Baileys and Google Gemini. | Connects directly to WhatsApp, handles memory, and exposes webhooks for n8n. |
| **`scripts/`** | **DevOps & Bridges:** Cloud push tools, Reddit home-IP bridge, and database repair utilities. | Run locally via terminal or `.bat` launchers as needed. |
| **`archive_workflows/`** | **Cold Storage:** Replaced or merged workflows kept for reference only. | Read-only; do not deploy directly. |
| **`backups/`** | **Safety Nets:** Dated backups of workflows and database exports. | Used for disaster recovery and schema rollbacks. |
| **`huggingface-n8n/`** | **Alternative Hosting:** Configuration for running secondary/backup n8n on free HuggingFace hardware. | Isolated Docker environment. |

---

## 📌 Standard Conventions for Adding New Workflows

When creating a new automation:
1. Create a dedicated folder in `project/` following the `NN_descriptive_name` pattern (e.g. `12_new_automation`).
2. Place the primary `.json` workflow file inside with an uppercase descriptive name (or clean snake_case).
3. Include any required sample CSVs, prompt definitions, or companion scripts in that folder.
4. Add a `README.md` inside the folder documenting:
   - Purpose & Business Persona
   - Architecture diagram (Mermaid)
   - Trigger webhooks / cron schedules
   - Configuration steps
5. Update the matrices in both **`project/README.md`** and the root **`README.md`**.
