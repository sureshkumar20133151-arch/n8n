# 📁 Project Workflows Directory

All production n8n workflows for **SoloDeveloper.pro** and affiliated businesses are organized here: **one workflow system per folder**.

---

## 📂 Master Workflow Projects Matrix (01 – 11)

| Project Folder | Primary Workflow JSON | Description | Documentation |
| :--- | :--- | :--- | :--- |
| [**`01_whatsapp_ai_sales_engine/`**](./01_whatsapp_ai_sales_engine/) | [`UNIFIED_WHATSAPP_AI_SALES_ENGINE.json`](./01_whatsapp_ai_sales_engine/UNIFIED_WHATSAPP_AI_SALES_ENGINE.json) | **Unified Single Workflow (42 nodes):** Combines WhatsApp live AI chat (Track 0), Google Sheet Lead Logger (Track 1), Google Meet Calendar Booking (Track 2), and 3-Tier Proposal Delivery (Track 3) into one single workflow. | [Read Docs](./01_whatsapp_ai_sales_engine/README.md) |
| [**`02_linkedin_viral_post_generator/`**](./02_linkedin_viral_post_generator/) | [`3_viral_linkedin_post_generator_workflow.json`](./02_linkedin_viral_post_generator/3_viral_linkedin_post_generator_workflow.json) | Scrapes top LinkedIn posts via Apify, classifies relevance with Gemini, ghostwrites in Suresh's voice, generates Flux image prompts, and stages them in Google Sheets. | [Read Docs](./02_linkedin_viral_post_generator/README.md) |
| [**`03_scheduled_linkedin_publisher/`**](./03_scheduled_linkedin_publisher/) | [`4_scheduled_linkedin_post_workflow.json`](./03_scheduled_linkedin_publisher/4_scheduled_linkedin_post_workflow.json) | Autonomous 21-node scheduler that pulls approved posts from Google Sheets on schedule (8:30 AM & 5:30 PM IST) and publishes to LinkedIn. | [Read Docs](./03_scheduled_linkedin_publisher/README.md) |
| [**`04_website_lead_capture/`**](./04_website_lead_capture/) | [`4_website_lead_capture_workflow.json`](./04_website_lead_capture/4_website_lead_capture_workflow.json) | Captures contact form inquiries from `solodeveloper.pro`, greets leads immediately via WhatsApp, and logs to Google Sheets. | [Read Docs](./04_website_lead_capture/README.md) |
| [**`05_wholesale_whatsapp_agent/`**](./05_wholesale_whatsapp_agent/) | [`wholesale_order_dispatch_workflow.json`](./05_wholesale_whatsapp_agent/wholesale_order_dispatch_workflow.json) | Autonomous wholesale ordering engine for **Annamaliyar Oil Store**: handles bulk orders, tier discounts, CSV inventory checks, and dispatch alerts. | [Read Docs](./05_wholesale_whatsapp_agent/PRD_AND_PROMPTS.md) |
| [**`06_restaurant_whatsapp_agent/`**](./06_restaurant_whatsapp_agent/) | [`taj_hotel_kitchen_order_workflow.json`](./06_restaurant_whatsapp_agent/taj_hotel_kitchen_order_workflow.json) | Autonomous table reservation & food delivery bot for **Hotel Taj**: handles live cart building, menu queries from CSV, and kitchen KOT dispatches. | [Read Docs](./06_restaurant_whatsapp_agent/PRD_AND_PROMPTS.md) |
| [**`07_multi_business_zero_token_router/`**](./07_multi_business_zero_token_router/) | [`MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json`](./07_multi_business_zero_token_router/MULTI_BUSINESS_ZERO_TOKEN_ROUTER.json) | Ultra-fast regex & intent router that dispatches incoming WhatsApp webhooks across multiple businesses without consuming AI tokens on simple queries. | [Read Docs](./07_multi_business_zero_token_router/README.md) |
| [**`08_reddit_freelance_webdev_monitor/`**](./08_reddit_freelance_webdev_monitor/) | [`REDDIT_FREELANCE_LEAD_MONITOR.json`](./08_reddit_freelance_webdev_monitor/REDDIT_FREELANCE_LEAD_MONITOR.json) | Autonomous Reddit freelance lead radar: listens on `r/forhire`, `r/hiring`, `r/jobbit`, filters hiring clients, extracts budget with Gemini, and drafts tailored DM proposals. | [Read Docs](./08_reddit_freelance_webdev_monitor/README.md) |
| [**`09_solodev_meta_whatsapp_agent/`**](./09_solodev_meta_whatsapp_agent/) | [`SOLODEV_META_WHATSAPP_AI_AGENT.json`](./09_solodev_meta_whatsapp_agent/SOLODEV_META_WHATSAPP_AI_AGENT.json) | **Official Meta WhatsApp Cloud API Agent:** Dedicated autonomous conversational agent for SoloDeveloper powered by Meta Cloud API and Gemini. Completely isolated from other personas. | [Read Docs](./09_solodev_meta_whatsapp_agent/README.md) |
| [**`10_construction_builder_whatsapp_agent/`**](./10_construction_builder_whatsapp_agent/) | [`construction_builder_whatsapp_agent_workflow.json`](./10_construction_builder_whatsapp_agent/construction_builder_whatsapp_agent_workflow.json) | Residential construction BOQ estimator & lead qualification engine for **Danam Holdings Civil Engineering & Turnkey EPC** (Er. Dhilip Kumar). | [Read Docs](./10_construction_builder_whatsapp_agent/README.md) |
| [**`11_lead_generation_and_cold_outreach/`**](./11_lead_generation_and_cold_outreach/) | [`daily_builder_sheets_anti_ban_outreach.json`](./11_lead_generation_and_cold_outreach/daily_builder_sheets_anti_ban_outreach.json) | Full outbound engine: Apify Google Maps scraping, auto-sorting (with vs without website), anti-ban paced WhatsApp outreach, and Resend cold email campaigns. | [Read Docs](./11_lead_generation_and_cold_outreach/README.md) |

---

## 🎛️ Shared Persona Switching System

In the root of this `project/` directory:
- **`active_persona.json`**: Current global active business persona configuration.
- **`switcher_web_page.html`**: Web-based visual dashboard to toggle active WhatsApp persona in real-time.
- **`MULTI_PERSONA_SWITCHER_PRD.md`**: Architectural PRD and operational specifications for multi-persona switching.

---

## 🚀 How to Import Any Workflow into n8n

1. Open your n8n workspace in browser (`http://localhost:5678` or your Render deployment).
2. Click **Workflows** > **Add Workflow** (or **+**).
3. In the canvas menu (`...`), click **Import from File**.
4. Select the `.json` file from the respective project folder.
