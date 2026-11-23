# 🛢️🏪 Project 15: Sri Meenakshi Traders (SMT) – Edible Oils Wholesale & Fast-Lane Invoicing Agent

## 📌 Overview
Dedicated AI Agent, WhatsApp Pre-Ordering, and Tally Prime Invoicing Workflow for **Sri Meenakshi Traders (SMT)**, Madurai's leading Wholesale & Retail Edible Oils Merchant.
Specialized in bulk wholesale supply of Sunflower Oil, Palm Oil, Groundnut Oil, and Gingelly Oil across boxes, tins, cans, and pouches.

---

## 🎯 The Core Business Problem & Solution
* **The Problem:** In Madurai wholesale oil mandis, buyers (grocery shops, hotels, caterers, roadside shops) wait 30–60 minutes in crowded billing queues during morning peak hours.
* **The Solution (Fast-Lane Pickup):**
  1. Buyers send orders via WhatsApp text or Tamil voice notes (e.g. *"1L கோல்டு வின்னர் 1 பெட்டி, 1L பாமா ஆயில் 1 பெட்டி"*).
  2. The AI checks customer identity and billing preference (**Cash Bill** vs **GST Bill**).
  3. Automatically posts the Sales Voucher into Tally Prime (`Company: Sri Meenakshi Traders`) on Port 9000.
  4. Generates an instant **Bill / Token Number** (e.g. `#SMT-260324-521`) and sends a clean summary on WhatsApp.
  5. The buyer arrives at the shop, quotes the Bill Number, pays via Cash/UPI, and directly loads their vehicle—**zero waiting in billing lines!**

---

## 📦 Master Product Catalog & Packaging Rules

| Item / Brand | Packing Size | Pieces Per Box / Unit | Approx. Wholesale Box Rate | Single Unit Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Gold Winner Sunflower Oil** | 1 Litre Pouch | **10 Pouches / Box** | ₹1,320 | ₹132 / pouch |
| **Gold Winner Sunflower Oil** | 1/2 Litre (500ml) Pouch | **20 Pouches / Box** | ₹1,360 | ₹68 / pouch |
| **Gold Winner Sunflower Oil** | 5 Litre Can / 12L Pack | **12 Litres / Pack** | ₹1,620 | ₹675 / 5L can |
| **Gold Winner Sunflower Oil** | 200ml Pouch | **60 Pouches / Box** | ₹1,740 | ₹29 / pouch |
| **Fortune Sunflower Oil** | 1 Litre Pouch | **10 Pouches / Box** | ₹1,280 | ₹128 / pouch |
| **Fortune Sunflower Oil** | 1/2 Litre Pouch | **24 Pouches / Box** | ₹1,560 | ₹65 / pouch |
| **Gemini Gold Groundnut Oil (கடலை எண்ணெய்)** | 1 Litre Pouch | **10 Pouches / Box** | ₹1,950 | ₹195 / pouch |
| **Gemini Gold Sunflower Oil** | 1 Litre Pouch | **10 Pouches / Box** | ₹1,300 | ₹130 / pouch |
| **Idhayam Gingelly Oil (நல்லெண்ணெய்)** | 1 Litre Pouch | **12 Pouches / Box** | ₹3,960 | ₹330 / pouch |
| **Palm Oil (பாம் ஆயில்)** | 1 Litre Pouch | **10 Pouches / Box** | ₹980 | ₹98 / pouch |
| **Palm Oil (பாம் ஆயில்)** | 1/2 Litre Pouch | **20 Pouches / Box** | ₹1,020 | ₹51 / pouch |
| **Palm Oil Can** | 5 Litre Can | **4 Cans / Box** | ₹1,920 | ₹480 / can |

---

## 👥 Pre-Configured Customer Database (Madurai Traders)

1. **கேசவன் ஆயில் ஸ்டோர் (Kesavan Oil Store):**
   - **மொபைல் எண்:** `7871762490`
   - **முகவரி:** பூக்கடை வீதி, மதுரை (Pookadai Street, Madurai)
   - **பில்லிங் வகை:** **Cash Bill** (வழக்கமாக ஜிஎஸ்டி கேட்க மாட்டார்கள், நேரடி கேஷ் பில்)
2. **நம்பியப்பா ஆயில் ஸ்டோர் (Nambiyappa Oil Store):**
   - **முகவரி:** கீழமாசி வீதி, மதுரை (Keelamasi Street, Madurai)
   - **பில்லிங் வகை:** **Cash Bill** (ஹோல்சேல் பாக்ஸ் வாங்குபவர்)
3. **லட்சுமி ஆயில் ஸ்டோர் (Lakshmi Oil Store):**
   - **முகவரி:** தயிர் கடை சந்து, மதுரை (Thayir Kadai Sandhu, Madurai)
   - **பில்லிங் வகை:** **GST Bill** (GSTIN: `33AAACL5678G1Z2`)

---

## ⚡ Direct Tally Prime Integration
* **Target Company in Tally:** `<SVCURRENTCOMPANY>Sri Meenakshi Traders</SVCURRENTCOMPANY>` (Data directory: `100001`)
* **XML Server Port:** `http://localhost:9000`
* **Voucher Creation:**
  - Cash Buyer ➔ `Party A/c: Cash`, `Sales A/c`, Narration with Bill Number & items.
  - GST Registered Buyer ➔ `Party A/c: [Shop Name]`, `Sales A/c`, `Output CGST + SGST`.
* **Offline Backup:** If local Tally PC is off, queues voucher safely to Google Sheets (`SMT_Tally_Vouchers`).

---

## 🔗 Related Components
* **Persona Logic:** [`whatsapp-gemini-assistant/meenakshiTradersPersona.js`](../../whatsapp-gemini-assistant/meenakshiTradersPersona.js)
* **Tally XML Engine:** [`whatsapp-gemini-assistant/tallyXmlBuilder.js`](../../whatsapp-gemini-assistant/tallyXmlBuilder.js)
* **Local Auto-Sync Daemon:** [`scripts/tally_local_sync.js`](../../scripts/tally_local_sync.js)
