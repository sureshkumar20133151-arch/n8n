# 💬 WhatsApp Auto-Reply & Gemini Assistant Workflow

## 📌 Overview
This folder contains the direct WhatsApp messaging responder workflows. 

> [!NOTE]
> **Connected with `01_master_sales_engine`:**  
> The core logic of this workflow (inbound WhatsApp message webhook + Gemini AI consultative responder) has now been **directly unified into [`../01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json`](../01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json)** as **Track 0**. When a user chats with this assistant, it automatically triggers CRM logging, Demo Booking, or Proposal generation in the Master Sales Engine!

---

## 📁 Folder Contents & Related Files
| File | Description |
| :--- | :--- |
| [`1_whatsapp_auto_reply_workflow.json`](./1_whatsapp_auto_reply_workflow.json) | Standalone basic Open-WA API / Baileys auto-reply workflow (3 nodes) |
| [`gemini_whatsapp_assistant_workflow.json`](./gemini_whatsapp_assistant_workflow.json) | Standalone Gemini AI assistant n8n pipeline with message context (5 nodes) |
| [`build_gemini_workflow.py`](./build_gemini_workflow.py) | Python build script used to configure and inject credentials for this workflow |
| [`inspect_whatsapp_gemini.py`](./inspect_whatsapp_gemini.py) | Inspection tool for validating Gemini node properties and response mappings |

---

## 🔗 The Unified Architecture
For the complete end-to-end connected workflow with automatic Google Sheets CRM, Google Meet Demo Booking, and 3-Tier Proposal Delivery, import the master file:
👉 [**`project/01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json`**](../01_master_sales_engine/MASTER_SALES_ENGINE_WORKFLOW.json)
