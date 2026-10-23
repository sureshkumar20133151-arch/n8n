# 🚀 Autonomous AI & n8n Automation Engine

**Owner & Developer:** Suresh Kumar ([solodeveloper.pro](https://solodeveloper.pro))  
**Location:** Madurai, Tamil Nadu, India  
**System Status:** 🟢 100% Production Active & 24/7 Running (Free Tier Architecture)

---

## 📁 Project Directory Structure

All production workflows are organized in **[`project/`](./project/)**:

```
5. N8n/
│
├── project/                                         # 📂 All Production Workflows
│   ├── 01_whatsapp_ai_sales_engine/                 # 🌟 Single Unified Workflow (Chat + CRM + Booking + Proposal)
│   ├── 02_linkedin_viral_post_generator/            # 📢 Apify + Gemini LinkedIn Post Curation
│   ├── 03_scheduled_linkedin_publisher/             # ⏰ Automated Scheduled LinkedIn Publishing
│   ├── 04_website_lead_capture/                     # 🌐 Website Lead Capture & WhatsApp Welcome
│   └── README.md                                    # 📖 Master Catalog of All Project Workflows
│
├── whatsapp-gemini-assistant/                       # 🤖 Live Baileys WebSocket Engine (~40MB RAM)
│
├── scripts/                                         # 🛠️ Centralized Deployment & Maintenance Tools
│   ├── cloud_management/                            # Remote Neon PostgreSQL & Render deployment tools
│   └── sqlite_patches_archive/                      # Historical one-off local SQLite patches
│
├── archive_workflows/                               # 🗄️ Deprecated/Historical workflow versions
├── backups/                                         # 💾 Database & workflow backups
│
├── SYSTEM_ARCHITECTURE_AND_SETUP.md                 # 🌐 Complete System Architecture Guide
├── WHATSAPP_AI_AGENT_OVERVIEW.md                    # 📖 WhatsApp AI Sales Operating System Dossier
├── N8N_CLOUD_RENDER_NEON_COMPLETE_SETUP.md          # ⚙️ Infrastructure & Cloud Setup Guide
└── start-n8n.bat                                    # ⚡ Local n8n launcher
```

---

## 🚀 Quick Navigation to Workflow Folders

| Workflow Project | Primary JSON File | Description & Docs |
| :--- | :--- | :--- |
| [**`01_whatsapp_ai_sales_engine`**](./project/01_whatsapp_ai_sales_engine/) | [`UNIFIED_WHATSAPP_AI_SALES_ENGINE.json`](./project/01_whatsapp_ai_sales_engine/UNIFIED_WHATSAPP_AI_SALES_ENGINE.json) | **Single Unified Workflow (42 nodes):** WhatsApp Inbound AI Chat + CRM Logger (Sheet2) + Google Meet Booking + 3-Tier Proposal Delivery. [Read Docs](./project/01_whatsapp_ai_sales_engine/README.md) |
| [**`02_linkedin_viral_post_generator`**](./project/02_linkedin_viral_post_generator/) | [`3_viral_linkedin_post_generator_workflow.json`](./project/02_linkedin_viral_post_generator/3_viral_linkedin_post_generator_workflow.json) | Apify scraper + Gemini classifier & ghostwriter + Flux visual prompt creator. [Read Docs](./project/02_linkedin_viral_post_generator/README.md) |
| [**`03_scheduled_linkedin_publisher`**](./project/03_scheduled_linkedin_publisher/) | [`4_scheduled_linkedin_post_workflow.json`](./project/03_scheduled_linkedin_publisher/4_scheduled_linkedin_post_workflow.json) | Cron scheduler reading approved queue from Google Sheets and publishing to LinkedIn. [Read Docs](./project/03_scheduled_linkedin_publisher/README.md) |
| [**`04_website_lead_capture`**](./project/04_website_lead_capture/) | [`4_website_lead_capture_workflow.json`](./project/04_website_lead_capture/4_website_lead_capture_workflow.json) | Webhook handler for `solodeveloper.pro` with instant WhatsApp welcome message and CRM log. [Read Docs](./project/04_website_lead_capture/README.md) |

---

## ⚡ Local Quick Start
To launch local n8n:
```cmd
start-n8n.bat
```
Open `http://localhost:5678` in your browser.
