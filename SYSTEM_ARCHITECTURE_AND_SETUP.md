# 🌐 Full System Architecture & Cloud Setup Documentation
**Author:** Suresh Kumar — Solo Developer (Madurai, Tamil Nadu)  
**Last Updated:** October 2026  
**Status:** 🟢 100% Production Active & 24/7 Running (Free Tier Optimized)

---

## 📌 Executive Summary

This document provides a comprehensive technical overview and operational guide for the complete autonomous cloud architecture built across **Render**, **Neon PostgreSQL**, **Vercel**, **Baileys WebSocket WhatsApp Engine**, and **Google Gemini AI**.

```
                           +--------------------------------------------------+
                           |     Client / Visitor (Web / WhatsApp)           |
                           +------------------------+-------------------------+
                                                    |
                   +--------------------------------+-------------------------------+
                   |                                                                |
                   v                                                                v
        [solodeveloper.pro]                                                [WhatsApp Contact]
         (Vercel / Next.js)                                                (+91 93615 99097)
                   |                                                                |
     +-------------+-------------+                                                  |
     |                           |                                                  |
     v                           v                                                  v
[FloatingChatWidget]     [Direct WA Button]                                [Baileys WebSocket]
(In-Site Live AI Chat)   (https://wa.me/...)                                (~40MB RAM Node.js)
     |                                                                              |
     v                                                                              |
[/api/chat Proxy]                                                                  |
     |                                                                              |
     +----------------------------------->  [Render Cloud AI Service] <-------------+
                                            (whatsapp-assistant-iqpi)
                                                    |
                                    +---------------+---------------+
                                    |                               |
                                    v                               v
                          [knowledgeBase.js]             [Gemini 3.1 Flash Lite]
                          (Solo Developer +              (with 503/429 Fallback)
                           UniqCraft Models)                        |
                                                                    v
                                                     [Intelligent Concise Response]
                                                     (Tamil / Tanglish / English)
```

---

## 🏗️ 1. Cloud Infrastructure & Service Inventory

### Service 1: Cloud n8n Automation Engine
- **Host:** Render Free Web Service
- **Live URL:** `https://suresh-n8n-fhr6.onrender.com`
- **Region:** Singapore (`ap-southeast-1`)
- **Database Engine:** **Neon Serverless PostgreSQL**
  - *Host:* `ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech`
  - *Database:* `neondb`
  - *Persistence:* 100% Permanent (Never resets on Render restarts).
- **Installed Active Workflows:**
  1. `1_whatsapp_auto_reply_workflow`
  2. `2_whatsapp_outbound_broadcast_workflow`
  3. `3_linkedin_content_parasite_FULL`
  4. `4_website_lead_capture_workflow`
  5. `4_scheduled_linkedin_post_workflow`
  6. `5_freelance_client_lead_generator`
  7. `gemini_whatsapp_assistant_workflow`
- **Quota Optimization:** Old idle services (`aarogya-hospital-api` and `clothing-company-`) suspended. Only `suresh-n8n` runs, consuming ~360h of the monthly 750 free hours, ensuring 24/7 perpetual uptime.

---

### Service 2: WhatsApp AI Assistant (Baileys Engine)
- **Host:** Render Free Web Service (Account: `rosygopal123`)
- **Live URL:** `https://whatsapp-assistant-iqpi.onrender.com`
- **GitHub Repository:** `https://github.com/rosygopal123/whatsapp-bot-.git` (Branch: `main`)
- **Engine Architecture:** `@whiskeysockets/baileys` (Pure WebSocket protocol).
  - *RAM Usage:* ~40MB (versus 600MB+ in Puppeteer/Chromium).
  - *Crash Risk:* 0% Out-Of-Memory (OOM) risk on Render Free 512MB tier.
- **AI Brain:** Google Gemini Flash Lite
  - *Primary Model:* `gemini-3.1-flash-lite`
  - *Fallback Chain:* `gemini-flash-lite-latest` ➔ `gemini-2.5-flash` ➔ `gemini-2.5-pro`
  - *Resilience:* Automatically intercepts 429 (rate limits), 503 (high demand spikes), and 404 models without crashing.
- **Endpoints Exposed:**
  - `GET /healthz` — UptimeRobot ping & health monitor.
  - `GET /` — Live status badge & auto-refreshing QR link portal.
  - `POST /api/chat` — CORS-enabled JSON API for website widgets and external integrations.

---

### Service 3: Official Developer Portfolio
- **Website:** `https://solodeveloper.pro`
- **Repository:** `https://github.com/sureshkumar20133151-arch/3d-portfolio.git` (Branch: `main`)
- **Framework:** Next.js (App Router), React 19, Tailwind CSS, TypeScript.
- **Hosting:** Vercel (Auto-deploys on `git push origin main`).
- **Interactive Chat Integration:**
  - `src/components/chat/FloatingChatWidget.tsx` — Glassmorphism floating chat window with online pulse indicator.
  - `src/app/api/chat/route.ts` — Server-side Next.js route calling the Render Cloud Bot.

---

## 🧠 2. Persona & Multi-Website Knowledge Engine (`knowledgeBase.js`)

The AI bot acts as the **Senior Business Partner & Lead Consultant** for Suresh Kumar:
- **Location:** Madurai, Tamil Nadu, India.
- **Primary Website:** Solo Developer (`https://solodeveloper.pro`)
- **Secondary Brand:** UniqCraft (`https://uniqcraft.in`)
- **Pricing & Packages:**
  - *Portfolio Website:* Starting at **₹8,999** (3D / Minimalist, fast, mobile-friendly).
  - *Business Website:* Starting at **₹9,999** (WhatsApp CTA, Google Maps, SEO).
  - *E-Commerce Store:* Custom Quote (UPI, Razorpay, Stripe, product catalogs).
  - *AI Chatbots & Automation:* Custom Quote (Tamil NLP, Gemini/Claude, n8n/FastAPI).
- **Core Guarantees:** ⚡ 7-Day Turnaround | 🏷️ Fixed Transparent Price | 🛠️ 30 Days Free Support.
- **Strict Answering Constraints:**
  - **Zero Dumping Rule:** The bot answers *only* the specific question asked in 3 to 4 crisp lines. It never dumps all services or contact details unprompted.
  - **Language Mirroring:** Detects Tamil/Tanglish and replies in warm, natural conversational Tamil. English queries receive crisp, professional English.

---

## 🔒 3. Security & Secrets Management Architecture

### Where Secrets Are Stored (Encrypted Cloud Vaults):
| Secret Name | Where It Lives | Visible on GitHub? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Render Environment Variables (`rosygopal123`) | ❌ **No (Hidden)** |
| `NEON_DATABASE_URL` | Render Environment Variables (`suresh-n8n`) | ❌ **No (Hidden)** |
| `N8N_ENCRYPTION_KEY` | Render Environment Variables (`suresh-n8n`) | ❌ **No (Hidden)** |
| `N8N_API_KEY` | Managed via n8n internal settings | ❌ **No (Hidden)** |
| `WHATSAPP_BOT_API_URL` | Next.js Vercel Environment Settings | ❌ **No (Hidden)** |

### GitHub Protection Policies Enforced:
1. **`.gitignore` Enforcements:**
   - Both root and subfolder `.gitignore` files contain `.env`, `*.env`, `.env*`, and `.baileys_auth/`.
   - Real `.env` files are ignored by Git. Only safe template files (`.env.example`) with dummy placeholders are committed.
2. **Client-Side Sanitation:**
   - The website frontend (`solodeveloper.pro`) contains **zero** hardcoded API keys.
   - All AI requests pass through the server-side proxy `/api/chat`.

---

## 🚀 4. Maintenance & Operations Cheat Sheet

### How to push new features to the Portfolio Website:
```powershell
cd "C:\Users\Suresh\Documents\Antigravity\Portfolio\3d portfolio"
git add .
git commit -m "Your update description"
git push origin main
# Vercel deploys in ~45 seconds
```

### How to push new features to the WhatsApp Bot:
```powershell
cd "c:\Users\Suresh\Documents\Antigravity\5. N8n"
git add whatsapp-gemini-assistant/
git commit -m "Update bot features"
git branch -D bot-root-baileys
git subtree split --prefix=whatsapp-gemini-assistant -b bot-root-baileys
git push --force https://github.com/rosygopal123/whatsapp-bot-.git bot-root-baileys:main
# Render auto-deploys in ~30 seconds
```

### Keeping Free Tier Active 24/7:
- **UptimeRobot:** Monitor `https://whatsapp-assistant-iqpi.onrender.com/healthz` and `https://suresh-n8n-fhr6.onrender.com/healthz` with 5-minute HTTP GET intervals.
- **Render Hours:** Keep unused services suspended so only 1 service per workspace runs 24/7.
