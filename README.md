# 🚀 Autonomous AI & n8n Automation Engine

**Owner & Developer:** Suresh Kumar ([solodeveloper.pro](https://solodeveloper.pro))  
**Location:** Madurai, Tamil Nadu, India  
**System Status:** 🟢 100% Production Active & 24/7 Running (Free Tier Cloud + Local Microservice Architecture)

---

## 🧭 Master Navigation & Architecture

For an exhaustive, file-by-file inventory of every script, configuration, and asset, see **[`DIRECTORY_STRUCTURE.md`](./DIRECTORY_STRUCTURE.md)**.

```
5. N8n/
│
├── 📂 project/                                         # 🌟 All 11 Modular Production Workflows
│   ├── 01_whatsapp_ai_sales_engine/                    # Live WhatsApp AI Sales Chatbot + CRM + Booking + Proposal
│   ├── 02_linkedin_viral_post_generator/               # Apify Scraper + Gemini Ghostwriter + Flux Image Prompts
│   ├── 03_scheduled_linkedin_publisher/                # Bi-Daily Automated LinkedIn Publisher (Google Sheets Queue)
│   ├── 04_website_lead_capture/                        # Website Webhook -> WhatsApp Welcome + Google Sheets CRM
│   ├── 05_wholesale_whatsapp_agent/                    # Wholesale B2B Ordering (Annamaliyar Oil Store)
│   ├── 06_restaurant_whatsapp_agent/                   # Restaurant Ordering & Table Reservations (Hotel Taj)
│   ├── 07_multi_business_zero_token_router/            # Zero-Token Intent Router for Multi-Persona Numbers
│   ├── 08_reddit_freelance_webdev_monitor/             # Autonomous Reddit Freelance Lead Radar & DM Pitcher
│   ├── 09_solodev_meta_whatsapp_agent/                 # Official Meta WhatsApp Cloud API Agent
│   ├── 10_construction_builder_whatsapp_agent/         # Civil Engineering BOQ Estimator (Danam Holdings)
│   ├── 11_lead_generation_and_cold_outreach/           # Apify Scraper + Lead Auto-Sorter + Anti-Ban Outreach
│   └── README.md                                       # Master Project Matrix & Import Instructions
│
├── 🤖 whatsapp-gemini-assistant/                       # 🟢 Live Baileys WebSocket Engine (~40MB RAM)
├── 🛠️ scripts/                                         # Cloud management, Reddit forwarder & DB patchers
├── 🗄️ archive_workflows/                               # Historical & superseded workflow archives
├── 💾 backups/                                         # Safe rollback snapshots & database backups
├── ☁️ huggingface-n8n/                                 # HuggingFace Spaces container configuration
│
├── 📖 SYSTEM_ARCHITECTURE_AND_SETUP.md                 # 🌐 Complete System Architecture Guide
├── 🗺️ DIRECTORY_STRUCTURE.md                           # 🗂️ Detailed File & Folder Taxonomy
├── 🧠 KNOWLEDGE.md                                     # 💡 Technical Knowledge Base & Production Learnings
├── 📱 WHATSAPP_AI_AGENT_OVERVIEW.md                    # 📑 WhatsApp AI Sales Operating System Dossier
├── ⚙️ N8N_CLOUD_RENDER_NEON_COMPLETE_SETUP.md          # ☁️ Infrastructure & Cloud Deployment Guide
│
├── ⚡ start-n8n.bat                                    # 🚀 Local n8n Launcher (Port 5678)
└── 📡 run-reddit-forwarder.bat                         # ⚡ Local Reddit Lead Ingestion Proxy
```

---

## 📂 Production Workflows Matrix (01 – 11)

All production workflows are strictly isolated in **[`project/`](./project/)**:

| Project Folder | Primary Workflow JSON | Description & Scope | Documentation |
| :--- | :--- | :--- | :--- |
| [**`01_whatsapp_ai_sales_engine`**](./project/01_whatsapp_ai_sales_engine/) | [`UNIFIED_WHATSAPP_AI_SALES_ENGINE.json`](./project/01_whatsapp_ai_sales_engine/UNIFIED_WHATSAPP_AI_SALES_ENGINE.json) | **Unified Single Workflow (42 nodes):** Inbound WhatsApp AI chat (Track 0) + Sheet2 CRM Logger (Track 1) + Google Meet Booking (Track 2) + 3-Tier Proposal Delivery (Track 3). | [Read Docs](./project/01_whatsapp_ai_sales_engine/README.md) |
| [**`02_linkedin_viral_post_generator`**](./project/02_linkedin_viral_post_generator/) | [`3_viral_linkedin_post_generator_workflow.json`](./project/02_linkedin_viral_post_generator/3_viral_linkedin_post_generator_workflow.json) | Scrapes viral industry posts with Apify, analyzes hooks with Gemini, ghostwrites original post, creates Flux image prompt, and stages in Google Sheets. | [Read Docs](./project/02_linkedin_viral_post_generator/README.md) |
| [**`03_scheduled_linkedin_publisher`**](./project/03_scheduled_linkedin_publisher/) | [`4_scheduled_linkedin_post_workflow.json`](./project/03_scheduled_linkedin_publisher/4_scheduled_linkedin_post_workflow.json) | Autonomous cron scheduler (8:30 AM & 5:30 PM IST) that reads approved posts from Google Sheets, formats text, and publishes directly to LinkedIn. | [Read Docs](./project/03_scheduled_linkedin_publisher/README.md) |
| [**`04_website_lead_capture`**](./project/04_website_lead_capture/) | [`4_website_lead_capture_workflow.json`](./project/04_website_lead_capture/4_website_lead_capture_workflow.json) | Webhook receiver for `solodeveloper.pro` contact form. Dispatches instant WhatsApp welcome greeting and logs inquiry to Google Sheets. | [Read Docs](./project/04_website_lead_capture/README.md) |
| [**`05_wholesale_whatsapp_agent`**](./project/05_wholesale_whatsapp_agent/) | [`wholesale_order_dispatch_workflow.json`](./project/05_wholesale_whatsapp_agent/wholesale_order_dispatch_workflow.json) | WhatsApp wholesale ordering bot for **Annamaliyar Oil Store**: real-time CSV inventory lookups, wholesale bulk tier calculations, and dispatch alerts. | [Read Docs](./project/05_wholesale_whatsapp_agent/PRD_AND_PROMPTS.md) |
| [**`06_restaurant_whatsapp_agent`**](./project/06_restaurant_whatsapp_agent/) | [`taj_hotel_kitchen_order_workflow.json`](./project/06_restaurant_whatsapp_agent/taj_hotel_kitchen_order_workflow.json) | Table reservation and food delivery agent for **Hotel Taj**: parses digital CSV menu, builds dynamic customer carts, and dispatches KOT kitchen tickets. | [Read Docs](./project/06_restaurant_whatsapp_agent/PRD_AND_PROMPTS.md) |
| [**`07_multi_business_zero_token_router`**](./project/07_multi_business_zero_token_router/) | [`MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json`](./project/07_multi_business_zero_token_router/MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json) | Fast regex router that filters greetings, menu requests, and order lookups without invoking costly LLM tokens, directing messages to target business queues. | [Read Docs](./project/07_multi_business_zero_token_router/README.md) |
| [**`08_reddit_freelance_webdev_monitor`**](./project/08_reddit_freelance_webdev_monitor/) | [`REDDIT_FREELANCE_LEAD_MONITOR.json`](./project/08_reddit_freelance_webdev_monitor/REDDIT_FREELANCE_LEAD_MONITOR.json) | Autonomous lead radar listening on `r/forhire`, `r/hiring`, `r/jobbit`. Uses Gemini to classify budget, filter spam, and draft personalized DM pitches. | [Read Docs](./project/08_reddit_freelance_webdev_monitor/README.md) |
| [**`09_solodev_meta_whatsapp_agent`**](./project/09_solodev_meta_whatsapp_agent/) | [`SOLODEV_META_WHATSAPP_AI_AGENT.json`](./project/09_solodev_meta_whatsapp_agent/SOLODEV_META_WHATSAPP_AI_AGENT.json) | **Official Meta WhatsApp Cloud API Agent:** Dedicated autonomous conversational agent for SoloDeveloper powered by official Meta Cloud API (`v21.0`) and Gemini. | [Read Docs](./project/09_solodev_meta_whatsapp_agent/README.md) |
| [**`10_construction_builder_whatsapp_agent`**](./project/10_construction_builder_whatsapp_agent/) | [`construction_builder_whatsapp_agent_workflow.json`](./project/10_construction_builder_whatsapp_agent/construction_builder_whatsapp_agent_workflow.json) | House Construction & Turnkey EPC agent for **Danam Holdings** (Er. Dhilip Kumar). Calculates instant civil engineering BOQ ratios and qualifies leads. | [Read Docs](./project/10_construction_builder_whatsapp_agent/README.md) |
| [**`11_lead_generation_and_cold_outreach`**](./project/11_lead_generation_and_cold_outreach/) | [`daily_builder_sheets_anti_ban_outreach.json`](./project/11_lead_generation_and_cold_outreach/daily_builder_sheets_anti_ban_outreach.json) | Complete outbound pipeline: Apify Maps scraper, Google Sheets lead auto-sorter (with vs without website), anti-ban paced WhatsApp outreach, and Resend cold email engine. | [Read Docs](./project/11_lead_generation_and_cold_outreach/README.md) |

---

## ⚡ Local Quick Start Commands

### 1. Launch Local n8n Server
Double-click [`start-n8n.bat`](./start-n8n.bat) or run from terminal:
```cmd
start-n8n.bat
```
*Access in browser at:* `http://localhost:5678`

### 2. Launch Reddit Lead Forwarder
Double-click [`run-reddit-forwarder.bat`](./run-reddit-forwarder.bat) or run from terminal:
```cmd
run-reddit-forwarder.bat
```

### 3. Launch WhatsApp Baileys Assistant
```cmd
cd whatsapp-gemini-assistant
npm start
```
*Pairing QR viewer available at:* [`whatsapp-gemini-assistant/scan-qr.html`](./whatsapp-gemini-assistant/scan-qr.html)
