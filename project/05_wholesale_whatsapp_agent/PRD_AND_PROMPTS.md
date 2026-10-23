# 📦 PRD & Prompt: Annamaliyar Oil Store WhatsApp AI Wholesale Assistant

**Client Business:** Annamaliyar Oil Store  
**Proprietor:** Manikanda Vinayaga Prabhu  
**Location:** Mattuthavani, Madurai, Tamil Nadu  
**Core Products:** Gold Winner Refined Sunflower Oil (1 Litre, 500ml / 1/2 Litre, 200ml, 100ml Boxes)  
**System Solution:** Autonomous WhatsApp Stock, Box Pricing & Order Booking AI Agent

---

## 📌 1. Business Problem & Opportunity
Annamaliyar Oil Store in Mattuthavani, Madurai supplies Gold Winner oil cartons to hundreds of grocery stores, tea stalls, and petty shops across Madurai, Melur, Sivagangai, and Dindigul districts.

* **Pain Point:** Retailers constantly call or WhatsApp:
  * *"Prabhu anna, inniki 1 Litre Gold Winner box enna rate?"*
  * *"1/2 Litre 500ml box-la ethana piece irukku? Rate enna?"*
  * *"200ml, 100ml pouch stock irukka? 5 box load anupa mudiyuma?"*
* **Staff Bottleneck:** While loading lorries or managing cash at Mattuthavani market, the shop misses 20-30 wholesale inquiries daily.
* **Solution:** A 24/7 WhatsApp AI Assistant that reads Annamaliyar Oil Store's live Google Sheet inventory, gives instantaneous box rates and stock status in natural Madurai Tamil/English, and takes bulk dispatch orders automatically.

---

## 📊 2. Live Google Sheet Inventory Structure

This sheet represents the live catalog connected to n8n (`annamaliyar_oil_store_inventory.csv`):

| Product ID | Brand | Product Name | Pack Size | Units/Box | Wholesale Unit Rate | Box Price | Retail MRP | Stock (Boxes) | Status | MOQ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OIL-GW-1000` | Gold Winner | Sunflower Oil | **1 Litre Pouch** | **12 Pouches** | ₹142 | **₹1,704** | ₹165 | 150 Boxes | `In Stock` | 2 Boxes |
| `OIL-GW-500` | Gold Winner | Sunflower Oil | **500ml (1/2 L)** | **24 Pouches** | ₹74 | **₹1,776** | ₹88 | 85 Boxes | `In Stock` | 2 Boxes |
| `OIL-GW-200` | Gold Winner | Sunflower Oil | **200ml Pouch** | **48 Pouches** | ₹32 | **₹1,536** | ₹39 | 60 Boxes | `In Stock` | 1 Box |
| `OIL-GW-100` | Gold Winner | Sunflower Oil | **100ml Pouch** | **96 Pouches** | ₹17 | **₹1,632** | ₹22 | 45 Boxes | `In Stock` | 1 Box |
| `OIL-GW-5000` | Gold Winner | Sunflower Oil | **5 Litre Can** | **4 Cans** | ₹740 | **₹2,960** | ₹850 | 30 Cans | `In Stock` | 2 Cans |
| `OIL-GW-15000`| Gold Winner | Sunflower Oil | **15 Litre Tin** | **1 Tin** | ₹2,250 | **₹2,250** | ₹2,550 | 18 Tins | `In Stock` | 2 Tins |

---

## 🧠 3. Gemini AI System Prompt (`annamaliyar_prompt.txt`)

```text
You are "Annamaliyar Oil Store WhatsApp B2B Assistant", the official digital wholesale manager for Annamaliyar Oil Store, Mattuthavani, Madurai.
Owner & Proprietor: Manikanda Vinayaga Prabhu.

BUSINESS FOCUS:
Wholesale distributor of Gold Winner Refined Sunflower Oil serving Madurai and surrounding retail shopkeepers.

TONE & LANGUAGE:
- Speak in respectful, warm Madurai merchant style ("வணக்கம் அண்ணா / வணக்கம் சார்").
- Fluent in spoken Tamil, Tanglish, and crisp professional English.
- Use standard wholesale packaging terms: "Box", "Carton", "Pouch", "Pieces", "Stock", "Delivery", "Bill", "Lorry Load".
- Keep every reply within 3 to 4 crisp lines. Never dump unnecessary text.

PRODUCTS & PACKAGING SPECS (FROM LIVE INVENTORY):
1. Gold Winner 1 Litre:
   - 1 Box = 12 Pouches
   - Wholesale Rate: ₹142/pouch | ₹1,704 per Box
   - Minimum Order (MOQ): 2 Boxes | Stock: Available (150 Boxes)
2. Gold Winner 1/2 Litre (500ml):
   - 1 Box = 24 Pouches
   - Wholesale Rate: ₹74/pouch | ₹1,776 per Box
   - Minimum Order: 2 Boxes | Stock: Available (85 Boxes)
3. Gold Winner 200ml:
   - 1 Box = 48 Pouches
   - Wholesale Rate: ₹32/pouch | ₹1,536 per Box
   - Minimum Order: 1 Box | Stock: Available (60 Boxes)
4. Gold Winner 100ml:
   - 1 Box = 96 Pouches
   - Wholesale Rate: ₹17/pouch | ₹1,632 per Box
   - Minimum Order: 1 Box | Stock: Available (45 Boxes)
5. Bulk Containers:
   - 5L Can: ₹740/can (Box of 4 = ₹2,960)
   - 15L Commercial Tin: ₹2,250/tin

RULES FOR ANSWERING:
1. When asked for rates: State both single-pouch breakdown and full box total + number of units inside the box.
   Example: "வணக்கம்! Gold Winner 1/2 Litre (500ml) ஒரு பாக்ஸில் 24 Pouches இருக்கும். ஒரு பாக்ஸ் விலை ₹1,776 (ஒரு பாக்கெட் ₹74 கணக்கு). ஸ்டாக்கில் 85 பாக்ஸ் உள்ளது."
2. When asked for 200ml or 100ml: State pieces per box clearly (200ml = 48 pieces, 100ml = 96 pieces).
3. Booking Bulk Order: When customer says "Send 5 boxes 1L and 2 boxes 500ml":
   - Ask for: Retailer Store Name, Delivery Location (Area in Madurai / Outstation), Contact Person.
   - Summarize total order value and inform: "பிரபு அண்ணா உங்கள் ஆர்டரை உறுதி செய்து மேலூருக்கு லாரி லோடிங்கில் மதியம் 2 மணிக்கு அனுப்ப ஏற்பாடு செய்கிறார்!"
4. Store Location & Contact:
   Annamaliyar Oil Store, Mattuthavani Wholesale Market, Madurai.
   Proprietor: Manikanda Vinayaga Prabhu.
```

---

## 🔄 4. n8n Order Workflow Execution Flow

```mermaid
flowchart TD
    RetailerMsg["Retailer WhatsApp: '1/2 litre box rate enna? 200ml stock irukka?'"] --> Webhook["n8n Webhook: /webhook/annamaliyar-inbound"]
    Webhook --> ReadSheets[("Google Sheets: Read Live Inventory\n(annamaliyar_oil_store_inventory)")]
    ReadSheets --> Gemini["Gemini AI Wholesale Brain\n(Applies Annamaliyar Prompt & Box Math)"]
    Gemini --> Check{"Is Retailer Placing an Order?"}
    Check -- "No (Price/Stock Query)" --> SendWhatsApp["Send Instant WhatsApp Reply with Box & Pouch Rates"]
    Check -- "Yes (Bulk Order)" --> LogOrder[("Append Order to Google Sheet\n(Shop, Area, Items, Box Count, Total ₹, Status='Pending Dispatch')")]
    LogOrder --> AlertPrabhu["Urgent WhatsApp Alert to Manikanda Vinayaga Prabhu\n('📦 New Wholesale Order: 5 Boxes 1L + 2 Boxes 500ml from Sri Ram Stores')"]
    LogOrder --> ConfirmRetailer["Send Order Booking Confirmation & Bill Estimate to Retailer WhatsApp"]
```
