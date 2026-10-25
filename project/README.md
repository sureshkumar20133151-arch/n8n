# 📁 Project Workflows Directory

All production n8n workflows for **SoloDeveloper.pro** are organized here: **one workflow system per folder**.

---

## 📂 Workflow Projects Matrix

| Project Folder | Primary Workflow JSON | Description | Documentation |
| :--- | :--- | :--- | :--- |
| [**`01_whatsapp_ai_sales_engine/`**](./01_whatsapp_ai_sales_engine/) | [`UNIFIED_WHATSAPP_AI_SALES_ENGINE.json`](./01_whatsapp_ai_sales_engine/UNIFIED_WHATSAPP_AI_SALES_ENGINE.json) | **Unified Single Workflow (42 nodes):** Combines WhatsApp live AI chat (Track 0), Google Sheet Lead Logger (Track 1), Google Meet Calendar Booking (Track 2), and 3-Tier Proposal Delivery (Track 3) into one single workflow. | [Read README](./01_whatsapp_ai_sales_engine/README.md) |
| [**`02_linkedin_viral_post_generator/`**](./02_linkedin_viral_post_generator/) | [`3_viral_linkedin_post_generator_workflow.json`](./02_linkedin_viral_post_generator/3_viral_linkedin_post_generator_workflow.json) | Scrapes top LinkedIn posts via Apify, classifies relevance with Gemini, ghostwrites in Suresh's voice, generates Flux image prompts, and stages them in Google Sheets. | [Read README](./02_linkedin_viral_post_generator/README.md) |
| [**`03_scheduled_linkedin_publisher/`**](./03_scheduled_linkedin_publisher/) | [`4_scheduled_linkedin_post_workflow.json`](./03_scheduled_linkedin_publisher/4_scheduled_linkedin_post_workflow.json) | Autonomous 21-node scheduler that pulls approved posts from Google Sheets on schedule (8:30 AM & 5:30 PM IST) and publishes to LinkedIn. | [Read README](./03_linkedin_publisher/README.md) |
| [**`04_website_lead_capture/`**](./04_website_lead_capture/) | [`4_website_lead_capture_workflow.json`](./04_website_lead_capture/4_website_lead_capture_workflow.json) | Captures contact form inquiries from `solodeveloper.pro`, greets leads immediately via WhatsApp, and logs to Google Sheets. | [Read README](./04_website_lead_capture/README.md) |
| [**`08_reddit_freelance_webdev_monitor/`**](./08_reddit_freelance_webdev_monitor/) | [`REDDIT_FREELANCE_LEAD_MONITOR.json`](./08_reddit_freelance_webdev_monitor/REDDIT_FREELANCE_LEAD_MONITOR.json) | Autonomous Reddit freelance lead radar: listens on `r/forhire`, `r/hiring`, `r/jobbit`, filters hiring clients, extracts budget with Gemini, and drafts tailored DM proposals. | [Read README](./08_reddit_freelance_webdev_monitor/README.md) |

---

## 🚀 How to Import Any Workflow into n8n
1. Open n8n in your browser (`http://localhost:5678` or Render URL).
2. Click **Workflows** > **Add Workflow**.
3. In the top-right menu (`...`), click **Import from File**.
4. Select the `.json` file from the respective project folder.
