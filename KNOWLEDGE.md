# 🧠 MASTER SYSTEM KNOWLEDGE BASE & INFRASTRUCTURE HANDOVER

> **Owner & Architect:** Suresh Kumar — SoloDeveloper ([solodeveloper.pro](https://solodeveloper.pro))  
> **Contact / WhatsApp:** +91 93615 99097 | `sureshkumar20133151@gmail.com`  
> **Location:** Madurai, Tamil Nadu, India  
> **Purpose:** Centralized architectural handover document. Load this file into any new chat/agent session to immediately resume work with 100% full context.
> **Operating Principle:** 100% Permanent Free-Tier Infrastructure ($0/month) — Zero Paid Upgrades Required.

---

## 🗺️ 1. Infrastructure Topology: Where Everything Lives

| Component | Platform / Host | Endpoint / URL | Region | Why & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **n8n Automation Engine** | Render (Web Service) | `https://suresh-n8n-fhr6.onrender.com` | Singapore (`ap-southeast-1`) | Core workflow orchestrator. Free plan (512MB RAM). Runs triggers, AI chains, CRMs, and alert pipelines. |
| **Database Engine** | Neon Serverless PostgreSQL | `ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech` | Singapore (AWS) | Eliminates SQLite data-loss on Render container restarts. 100% permanent workflow, execution, and credential state. Free 100 CU-hours/mo. |
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
- **Auto-Suspend & Quota Guards:**
  - Compute size: `0.25 CU` (minimum free-tier size).
  - Auto-suspend delay: `5 minutes` (sleeps automatically when idle, confirmed `ENDPOINT INACTIVE`).
  - Monthly compute resets to 0% on the 1st of every calendar month.
  - Secondary/unused project `clothing-thread` was deleted to dedicate 100% account storage/resources to `n8n`.

---

## 🛠️ 3. Connected Tools & Integrations (What & Why)

### 1. Google Gemini AI (`@google/genai` & LangChain nodes)
- **Production Model:** `gemini-3.5-flash-lite` (Free Tier, ultra-fast, high rate limits).
- **Important Note on Models:** Older models (`gemini-1.5-flash`) are retired on v1beta in 2026, and `gemini-2.5-flash` is strictly rate-limited to 20 requests/day on the free tier. `gemini-3.5-flash-lite` is the official Google-recommended free model for continuous automations.
- **Credential ID:** `CjKY06ijITLYe9k4` (`googlePalmApi`).

### 2. Google Sheets CRM (`googleSheetsOAuth2Api`)
- **Active Credential ID:** `XtknJPUddSwDeQRl` (`Google Sheets account 2`).
- **Target Spreadsheet:** `solo dev lead gen` (`1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw`).
- **Target Tab:** `Reddit`.
- **Pre-configured Headers (12 Columns):**
  `Date`, `Subreddit`, `Post Title`, `Client`, `Budget`, `Project Type`, `Tech Stack`, `Urgency`, `Client Problem`, `Custom Pitch`, `Reddit URL`, `Status`.

### 3. Gmail API (`gmailOAuth2`)
- **Credential ID:** `cwBPj5LyhtzfYo07`
- **Primary Email:** `sureshkumar20133151@gmail.com`
- **Error Tolerance:** Node configured with `continueOnFail: true` so expired OAuth refresh tokens never block writing leads to Google Sheets.

### 4. WhatsApp AI Engine (Baileys WebSocket + Render API)
- **API URL:** `https://whatsapp-assistant-iqpi.onrender.com/api/send-message`
- **Status Portal:** `https://whatsapp-assistant-iqpi.onrender.com/` (QR Code Portal)

### 5. Telegram & Discord Alert Nodes
- Configured with `disabled: true` in Workflow 08 to prevent missing-credential errors until Suresh adds bot tokens.

---

## 📂 4. Complete Workflow Matrix (Projects Inventory)

All workflows live under the `project/` directory:

| Folder | Primary Workflow File | Cloud ID | Functionality & Triggers | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`01_whatsapp_ai_sales_engine`** | `UNIFIED_WHATSAPP_AI_SALES_ENGINE.json` | `MQi8GulHubhexp0f` | **42 Nodes Unified Master:** Live WhatsApp AI chat (Track 0), Google Sheet lead logging (Track 1), Calendar demo booking (Track 2), 3-Tier proposal delivery (Track 3). | Active |
| **`02_linkedin_viral_post_generator`** | `03_linkedin_content_parasite_GEMINI.json` | `yQGMbeEnm8enxwTL` | Scrapes creator posts via Apify, classifies with Gemini, ghostwrites in Suresh's voice, stages in Google Sheets. | Active |
| **`03_scheduled_linkedin_publisher`** | `4_scheduled_linkedin_post_workflow.json` | `Lq5OZwTJCzaMJCQr` | 21-node scheduler pulling approved posts from Google Sheets twice daily (8:30 AM & 5:30 PM IST) and publishing to LinkedIn. | Active |
| **`04_website_lead_capture`** | `contact_form_greeting_and_sheets_workflow.json` | `Ur5QLrchAAdcD4eG` | Webhook receiver from `solodeveloper.pro`, greets leads immediately via WhatsApp, sends Gmail notice, logs to Sheet1. | Active |
| **`05_wholesale_whatsapp_agent`** | `wholesale_order_dispatch_workflow.json` | Standalone | B2B Wholesale dispatch dispatcher for oil/commodity merchants (Order ID, lorry dispatch notices). | Standalone |
| **`06_restaurant_whatsapp_agent`** | `TAJ_HOTEL_KITCHEN_DISPATCH_WORKFLOW.json` | Standalone | Live Food Ordering Engine: Generates VIP pre-order token, prints Kitchen Ticket, and texts customer confirmation. | Standalone |
| **`07_multi_business_zero_token_router`** | `MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json` | Standalone | Regex/Keyword intent router directing WhatsApp messages to SoloDeveloper, Taj Hotel, or Wholesale without wasting LLM tokens. | Standalone |
| **`08_reddit_freelance_webdev_monitor`** | `REDDIT_FREELANCE_LEAD_MONITOR.json` | `KwSOFWeaCHM9B99C` | **Dual-Engine Freelance Lead Radar:** Captures real client leads, scores intent with Gemini 3.5 Flash Lite, drafts custom 3-sentence DM proposals, and logs directly into Google Sheet `solo dev lead gen`. | **Active & Verified** |

---

## ⚡ 5. Deep Dive: Project 08 (Reddit Freelance Lead Radar)

Reddit has restricted datacenter IPs (HTTP 429) and sunsetted self-service Data API app creation. Project 08 solves this using a **Dual-Engine Ingestion Pipeline**:

```
[Engine 1: Cloud 24/7 Remote Feeds] ───┐
                                       ├──> [Filter & Slicer] ──> [Gemini 3.5 Flash Lite] ──> [Google Sheet: solo dev lead gen]
[Engine 2: Local Residential Forwarder] ─┘
```

### Engine 1 (Autonomous Cloud Remote Gigs — 24/7 on Render)
- Fetches real-time web development opportunities from RemoteOK API (`https://remoteok.com/api?tag=dev`).
- Bypasses Reddit datacenter IP blocks completely.
- Scheduled via cron (`Check Reddit Every 15 Mins`) and manual webhook (`/webhook/run-reddit-monitor-now`).
- Optimized to slice top 15 jobs immediately in `Parse Cloud Remote Gigs` to keep RAM < 3MB.

### Engine 2 (Local Reddit Forwarder — Unblocked Residential IP)
- **Runner Script:** [`run-reddit-forwarder.bat`](file:///c:/Users/Suresh/Documents/Antigravity/5.%20N8n/run-reddit-forwarder.bat)
- **Python Script:** [`scripts/reddit_local_forwarder/reddit_forwarder.py`](file:///c:/Users/Suresh/Documents/Antigravity/5.%20N8n/scripts/reddit_local_forwarder/reddit_forwarder.py)
- Scrapes live Atom/RSS feeds across `r/forhire`, `r/hiring`, `r/jobbit`, `r/hireaprogrammer`, `r/freelance_forhire`.
- Discards `[FOR HIRE]` posts; filters for active `[HIRING]` developer gigs.
- POSTs directly to the cloud webhook: `https://suresh-n8n-fhr6.onrender.com/webhook/reddit-lead-ingest`.
- Double-clicking `run-reddit-forwarder.bat` on Suresh's laptop continuously forwards Reddit gigs every 15 minutes.

---

## 🛡️ 6. 100% Free-Tier Stability & Performance Guards ($0 Forever)

To keep the entire automation suite running **100% free with zero crashes, zero memory restarts, and zero compute overages**:

### 1. Render Memory Guards (Prevents 512MB RAM Crash Restarts)
Set in Render Dashboard ➔ `suresh-n8n` ➔ **Environment**:
```ini
NODE_OPTIONS=--max-old-space-size=384
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=48
```
- **Why:** Forces Node.js to trigger aggressive garbage collection at 384 MB, well below Render's 512 MB hard ceiling.
- **Workflow Optimization:** `Parse Cloud Remote Gigs` slices top 15 gigs early, keeping RAM consumption under 250 MB and execution time at ~10 seconds.

### 2. Neon Compute Guards (Prevents 100 CU-Hour Overages)
Set in Neon Console ➔ `n8n` project ➔ **Compute**:
```ini
Compute Size = 0.25 CU (minimum)
Auto-suspend delay = 5 minutes
```
- **Why:** Allows Neon to scale-to-zero (`ENDPOINT INACTIVE`) whenever workflows are idle, consuming 0 CU-hours during downtime.
- **Monthly Reset:** 100 CU-hours resets automatically on the 1st of every month.

---

## 🔑 7. Critical Credentials & IDs Quick Reference

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
CREDENTIAL_GOOGLE_SHEETS_2=XtknJPUddSwDeQRl
CREDENTIAL_GEMINI=CjKY06ijITLYe9k4
CREDENTIAL_APIFY=qF7Y8bKvycPoEFoA

# Active Google Spreadsheets
SPREADSHEET_SOLO_DEV_LEAD_GEN=1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw
SPREADSHEET_REDDIT_TAB=Reddit

# Webhook Ingest Endpoints
WEBHOOK_REDDIT_INGEST=https://suresh-n8n-fhr6.onrender.com/webhook/reddit-lead-ingest
WEBHOOK_MANUAL_TRIGGER=https://suresh-n8n-fhr6.onrender.com/webhook/run-reddit-monitor-now

# Primary Communication & Alert Targets
OWNER_PHONE=+919361599097
OWNER_EMAIL=sureshkumar20133151@gmail.com
```

---

## 🚀 8. How to Resume Work in a New Chat

1. **Load this document:** Tell the new agent: *"Read `KNOWLEDGE.md` to load full architectural context."*
2. **Access Cloud n8n:** All workflows are live and managed at `https://suresh-n8n-fhr6.onrender.com`.
3. **Run Reddit Scraper Locally:** Double-click `run-reddit-forwarder.bat` on your PC anytime you want live Reddit feeds injected into the cloud pipeline.
4. **Git Sync:** Run `git pull` or `git push origin main` in `C:\Users\Suresh\Documents\Antigravity\5. N8n` to synchronize local scripts and cloud workflows.
