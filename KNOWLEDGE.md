# 🧠 MASTER SYSTEM KNOWLEDGE BASE & INFRASTRUCTURE HANDOVER

> **Owner & Architect:** Suresh Kumar — SoloDeveloper ([solodeveloper.pro](https://solodeveloper.pro))  
> **Contact / WhatsApp:** +91 93615 99097 | `sureshkumar20133151@gmail.com`  
> **Location:** Madurai, Tamil Nadu, India  
> **Purpose:** Centralized architectural handover document. Load this file into any new chat/agent session to immediately resume work with 100% full context.

---

## 🗺️ 1. Infrastructure Topology: Where Everything Lives

| Component | Platform / Host | Endpoint / URL | Region | Why & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **n8n Automation Engine** | Render (Web Service) | `https://suresh-n8n-fhr6.onrender.com` | Singapore (`ap-southeast-1`) | Core workflow automation orchestrator. Connects triggers, AI chains, CRMs, and alert pipelines. |
| **Database Engine** | Neon Serverless PostgreSQL | `ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech` | Singapore (AWS) | Eliminates SQLite data-loss on Render container restarts. 100% permanent workflow, execution, and credential state. |
| **WhatsApp AI Assistant** | Render (Web Service) | `https://whatsapp-assistant-iqpi.onrender.com` | Singapore | Lightweight `@whiskeysockets/baileys` Node.js service (~40MB RAM). Replaces heavy Puppeteer/Chromium. Runs 24/7. |
| **Primary Portfolio Site** | Vercel (Next.js 19) | `https://solodeveloper.pro` | Global Edge | Modern developer portfolio with embedded floating live AI chat proxying directly to the Render assistant. |
| **GitHub Git Remote** | GitHub | `https://github.com/sureshkumar20133151-arch/n8n.git` | Cloud | Master repository tracking all workflow JSONs, persona configs, scripts, and deployment routines. |

---

## 🗄️ 2. Database Specification (Neon PostgreSQL)

- **Database Host:** `ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech`
- **Database Name:** `neondb`
- **Database User:** `neondb_owner`
- **Port:** `5432`
- **SSL Mode:** `require`
- **Why Neon?** 
  - Render free-tier containers have ephemeral file systems: SQLite databases reset to blank on every restart or idle spin-down.
  - By pointing `DB_TYPE=postgresdb` to Neon Serverless PostgreSQL, all workflows, credentials, active state, and logs remain permanently intact across all restarts.

---

## 🛠️ 3. Connected Tools & Integrations (What & Why)

### 1. Google Gemini AI (`@google/genai` & LangChain nodes)
- **Primary Model:** `gemini-1.5-flash` / `gemini-3.1-flash-lite` (with fallback to `gemini-2.5-flash`).
- **Why:** Ultra-fast, highly accurate reasoning, zero-token cost under free tier limits. Powers LinkedIn content ghostwriting, live WhatsApp sales consultation, multi-business routing, and Reddit freelance lead scoring.

### 2. Google Sheets API (`googleSheetsOAuth2Api`)
- **Credential ID:** `RMmY56nFkrWF4wQC`
- **Why:** Serves as the lightweight, zero-maintenance CRM database. Stores incoming website leads, scheduled LinkedIn post staging queues, and Reddit freelance lead dossiers without database licensing overhead.

### 3. Gmail API (`gmailOAuth2`)
- **Credential ID:** `cwBPj5LyhtzfYo07`
- **Primary Email:** `sureshkumar20133151@gmail.com`
- **Why:** Dispatches real-time VIP HTML lead dossiers for high-intent inbound clients, website contact inquiries, and instant actionable Reddit freelance opportunities.

### 4. WhatsApp AI Engine (Baileys WebSocket + Render API)
- **API URL:** `https://whatsapp-assistant-iqpi.onrender.com/api/send-message`
- **Status Portal:** `https://whatsapp-assistant-iqpi.onrender.com/` (QR Code Portal)
- **Why:** Delivers immediate, high-converting customer chat on WhatsApp, dispatches order receipts to restaurant/wholesale customers, and pings Suresh instantly on hot leads.

### 5. Telegram Bot API
- **Why:** Zero-friction mobile push notifications for immediate sales alerts and Reddit freelance opportunities.

### 6. Discord Webhooks
- **Why:** Team/channel logging for lead tracking, automation alerts, and content generation staging.

### 7. Apify LinkedIn Post Scraper
- **Credential ID:** `qF7Y8bKvycPoEFoA` / `0guWZHsulb6dhYGJ`
- **Why:** Programmatically scrapes top industry LinkedIn posts to feed the viral parasite content generator.

### 8. Reddit Public Atom/RSS Ingestion
- **Why:** Zero-credential, zero-OAuth real-time stream of freelance client posts across 8 subreddits without rate limits or bot registration friction.

---

## 📂 4. Complete Workflow Matrix (Projects Inventory)

All workflows live under the `project/` directory:

| Folder | Primary Workflow File | Cloud ID | Functionality & Triggers |
| :--- | :--- | :--- | :--- |
| **`01_whatsapp_ai_sales_engine`** | `UNIFIED_WHATSAPP_AI_SALES_ENGINE.json` | `MQi8GulHubhexp0f` | **42 Nodes Unified Master:** Live WhatsApp AI chat (Track 0), Google Sheet lead logging (Track 1), Calendar demo booking (Track 2), 3-Tier proposal delivery (Track 3). |
| **`02_linkedin_viral_post_generator`** | `03_linkedin_content_parasite_GEMINI.json` | `yQGMbeEnm8enxwTL` | Scrapes creator posts via Apify, classifies with Gemini, ghostwrites in Suresh's voice, stages in Google Sheets. |
| **`03_scheduled_linkedin_publisher`** | `4_scheduled_linkedin_post_workflow.json` | `Lq5OZwTJCzaMJCQr` | 21-node scheduler pulling approved posts from Google Sheets twice daily (8:30 AM & 5:30 PM IST) and publishing to LinkedIn. |
| **`04_website_lead_capture`** | `contact_form_greeting_and_sheets_workflow.json` | `Ur5QLrchAAdcD4eG` | Webhook receiver from `solodeveloper.pro`, greets leads immediately via WhatsApp, sends Gmail notice, logs to Sheet1. |
| **`05_wholesale_whatsapp_agent`** | `wholesale_order_dispatch_workflow.json` | Standalone | B2B Wholesale dispatch dispatcher for oil/commodity merchants (Order ID, lorry dispatch notices). |
| **`06_restaurant_whatsapp_agent`** | `TAJ_HOTEL_KITCHEN_DISPATCH_WORKFLOW.json` | Standalone | Live Food Ordering Engine: Generates VIP pre-order token, prints Kitchen Ticket, and texts customer confirmation. |
| **`07_multi_business_zero_token_router`** | `MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json` | Standalone | Regex/Keyword intent router directing WhatsApp messages to SoloDeveloper, Taj Hotel, or Wholesale without wasting LLM tokens. |
| **`08_reddit_freelance_webdev_monitor`** | `REDDIT_FREELANCE_LEAD_MONITOR.json` | `KwSOFWeaCHM9B99C` | **Reddit Freelance Lead Radar:** Listens on 8 subreddits (`r/forhire`, `r/hiring`, `r/jobbit`, etc.), filters `[HIRING]` + Web Dev + **Budget Mentioned** + **Today Only**, dedups across runs, drafts 3-sentence DM pitch with Gemini, logs to Google Sheets, and alerts via Gmail, Telegram & Discord. Includes 1-Click Google Sheet creator. |

---

## 🔑 5. Critical Credentials & IDs Quick Reference

```ini
# Render Cloud n8n Service
N8N_BASE_URL=https://suresh-n8n-fhr6.onrender.com
N8N_WORKFLOW_REDDIT_ID=KwSOFWeaCHM9B99C
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k

# Neon Database
NEON_HOST=ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech
NEON_DATABASE=neondb

# WhatsApp Engine
WHATSAPP_ASSISTANT_URL=https://whatsapp-assistant-iqpi.onrender.com
WHATSAPP_SEND_API=https://whatsapp-assistant-iqpi.onrender.com/api/send-message

# n8n Pre-authenticated Credential IDs
CREDENTIAL_GMAIL=cwBPj5LyhtzfYo07
CREDENTIAL_GOOGLE_SHEETS=RMmY56nFkrWF4wQC
CREDENTIAL_GOOGLE_SHEETS_2=XtknJPUddSwDeQRl
CREDENTIAL_GEMINI=CjKY06ijITLYe9k4
CREDENTIAL_APIFY=qF7Y8bKvycPoEFoA

# Active Google Spreadsheets
SPREADSHEET_REDDIT_LEADS=17tBLdLnSiRt0XxaTDm0JAeA50iNZQzFwJoq63MiHRNQ
SPREADSHEET_REDDIT_LEADS_URL=https://docs.google.com/spreadsheets/d/17tBLdLnSiRt0XxaTDm0JAeA50iNZQzFwJoq63MiHRNQ/edit

# Primary Communication & Alert Targets
OWNER_PHONE=+919361599097
OWNER_EMAIL=sureshkumar20133151@gmail.com
```

---

## 🚀 6. How to Resume Work in a New Chat

1. **Provide this file:** Upload or reference [`KNOWLEDGE.md`](file:///c:/Users/Suresh/Documents/Antigravity/5.%20N8n/KNOWLEDGE.md).
2. **Access Cloud n8n:** All workflows are live at `https://suresh-n8n-fhr6.onrender.com`.
3. **Sync Changes:** Always run `git pull` / `git push origin main` in `C:\Users\Suresh\Documents\Antigravity\5. N8n` to keep the local workspace and cloud GitHub repository in sync.
