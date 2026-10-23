# 🎛️ PRD: Multi-Persona AI Switcher Architecture (One WhatsApp Number ➔ Multiple Businesses)

**Owner:** Suresh Kumar ([solodeveloper.pro](https://solodeveloper.pro))  
**WhatsApp Number:** `+91 93615 99097`  
**Purpose:** Switch your single WhatsApp phone number between different business AI personas in 0.1 seconds for live client demos.

---

## 🏗️ How the Switcher Works

```
                                [Inbound WhatsApp Message]
                                             │
                                             ▼
                               [Baileys Node.js / n8n Router]
                                             │
                                             ▼
                             [Read active_persona.json state]
                                             │
                 ┌───────────────────────────┼───────────────────────────┐
                 ▼                           ▼                           ▼
       mode === "developer"        mode === "wholesale"        mode === "restaurant"
                 │                           │                           │
        [SoloDeveloper Prompt]      [Wholesale Oil & Stock]     [Shawarma & Token Order]
        [41-Col Sheet2 CRM]         [Live Google Sheet Inv.]    [Kitchen Sheet & Token]
        [Hormozi Offers & Demos]    [Box MOQ & Rates]           [UPI & Counter Pickup]
```

---

## ⚡ Switching Methods

### 1. Instant WhatsApp Secret Command (0.1 Seconds)
From your verified WhatsApp number (`+91 93615 99097`), send:

| Command | Action | Bot Instant Reply |
| :--- | :--- | :--- |
| `!mode wholesale` or `/mode wholesale` | Switches bot to Wholesale Merchant Assistant | *"✅ Mode switched to: 📦 Murugan Traders Wholesale Oil & Provision Assistant. Live inventory active."* |
| `!mode restaurant` or `/mode restaurant` | Switches bot to Shawarma Restaurant Assistant | *"✅ Mode switched to: 🌯 Al-Taza Shawarma & Grill Express. Menu & Token Generator active."* |
| `!mode dev` or `/mode dev` | Switches bot back to your SoloDeveloper Sales Bot | *"✅ Mode switched to: 💻 Suresh Kumar SoloDeveloper.pro Sales Operating System."* |
| `!mode` or `/mode` | Shows current active mode | *"Current Active Mode: 📦 Wholesale Shop"* |

### 2. 1-Click Mobile Web Dashboard
Accessible on your phone at `https://whatsapp-assistant-iqpi.onrender.com/admin/switcher` (or your private admin panel):
- Big toggle buttons:
  - 🟢 **[Suresh SoloDeveloper.pro]**
  - 📦 **[Wholesale Shop Mode]**
  - 🌯 **[Restaurant Shawarma Mode]**
  - 🏥 **[Clinic Appointment Mode]**
- Tapping any button immediately updates `active_persona.json` on the server without restarting!

---

## 📁 File Structure in Codebase

```
project/
├── 01_whatsapp_ai_sales_engine/        # SoloDeveloper.pro Web & Automation Sales
├── 05_wholesale_whatsapp_agent/        # Wholesale Oil, Rice & FMCG Assistant
│   └── PRD_AND_PROMPTS.md
├── 06_restaurant_whatsapp_agent/       # Shawarma & Fast Food Token Pre-Order
│   └── PRD_AND_PROMPTS.md
└── MULTI_PERSONA_SWITCHER_PRD.md       # Master Switcher Specification
```
