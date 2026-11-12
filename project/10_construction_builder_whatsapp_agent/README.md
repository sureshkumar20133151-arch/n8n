# 🏗️ Project 10: House Construction Builder — WhatsApp AI Lead & BOQ Engine

**Client Persona:** Danam Holdings Civil Engineering & Turnkey EPC (Er. Dhilip Kumar)  
**Location:** Madurai, Tamil Nadu, India  
**System Status:** 🟢 Production Ready (Standalone & Baileys Multi-Persona Integrated)

---

## 📌 Overview

This project provides an automated AI lead qualification, real-time Bill of Quantities (BOQ) estimation, and CRM logging system for residential home construction contractors. When prospective clients submit an inquiry via WhatsApp, website widget, or lead form, this workflow instantly computes civil engineering material ratios, quotes dynamic package tiers, qualifies lead urgency, and notifies both the chief engineer and client.

---

## 🚀 Key Features

1. **Instant Civil Engineering BOQ Estimator:**
   - Automatically computes South India standard rule-of-thumb ratios per sq.ft of built-up area:
     - **Cement:** ~0.42 bags / sq.ft
     - **TMT Steel (Fe550D):** ~3.8 kg / sq.ft
     - **Country Bricks / Solid Blocks:** ~18 units / sq.ft
2. **Three-Tier Pricing Models:**
   - **Standard Package:** ₹1,950 / sq.ft (Essential finish, ISI certified brands)
   - **Premium Luxury Package:** ₹2,350 / sq.ft (Teak doors, vitrified tiles, Kohler/Jaquar fittings)
   - **Elite Royal Villa Package:** ₹2,850 / sq.ft (Italian marble, home automation, solar-ready)
3. **Automated Lead Scoring & Prioritization:**
   - **HOT 🔥 (P1):** Owns plot + immediate/1-month timeline → VIP urgent alert (Call within 15 min).
   - **WARM (P2):** Owns plot + 3-6 month timeline → Standard priority follow-up.
   - **COLD (P3):** Still searching for plot → Floor plan nurturing cadence.
4. **Instant Multi-Channel Dispatch:**
   - Sends formatted WhatsApp notification to Chief Engineer with quick `wa.me` callback link.
   - Dispatches polite Tamil/English greeting to the client with full project summary.
   - Logs complete enquiry data into Google Sheets (`Construction_Leads`).

---

## 📂 Included Workflow Files

| File | Type | Description |
| :--- | :--- | :--- |
| **[`construction_builder_whatsapp_agent_workflow.json`](./construction_builder_whatsapp_agent_workflow.json)** | Primary n8n Workflow | Complete webhook, BOQ calculation engine, Google Sheets CRM logger, and dual WhatsApp notification flow. |

---

## 🔗 Related Components

- **Baileys Engine Persona:** [`whatsapp-gemini-assistant/builderPersona.js`](../../whatsapp-gemini-assistant/builderPersona.js)
- **Customer Memory Store:** [`whatsapp-gemini-assistant/builderCustomerMemory.js`](../../whatsapp-gemini-assistant/builderCustomerMemory.js)
- **Chat Simulation Test:** [`whatsapp-gemini-assistant/simulate_builder_chat.js`](../../whatsapp-gemini-assistant/simulate_builder_chat.js)
