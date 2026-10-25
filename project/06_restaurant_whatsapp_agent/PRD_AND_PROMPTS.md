# 🍗 Taj Hotel Madurai – Enterprise WhatsApp AI Biryani Pre-Order & Token System
## Product Requirements Document (PRD), Architecture & System Prompts

**Client:** Taj Hotel, Madurai, Tamil Nadu, India  
**Specialties:** Authentic Madurai Seeraga Samba Dum Biryani, Chettinad Mutton Sukka, Vanjaram Fish Fry, Madurai Jigarthanda & Rose Milk  
**Solution:** WhatsApp "Skip-the-Counter" Automated Biryani Ordering, Deterministic Cart Engine, Live Kitchen Display System (KDS), and Express Parcel Token Dispatcher  
**Live Production URL:** `https://whatsapp-assistant-iqpi.onrender.com`  
**Live Kitchen KDS Dashboard:** `https://whatsapp-assistant-iqpi.onrender.com/kitchen`  

---

## 📌 1. Executive Summary & Business Problem

Taj Hotel in Madurai experiences immense customer rushes during peak lunch (12:00 PM – 3:30 PM) and dinner (7:00 PM – 10:30 PM) hours.

### The Problem
* **Counter Bottlenecks:** Walk-in parcel customers endure 15–25 minute queues in intense heat while kitchen staff manually take, bill, and pack parcels.
* **Lost Revenue:** Long lines deter passing customers; busy staff miss continuous phone calls.
* **LLM Pitfalls in Food Ordering:** Pure LLM chat assistants suffer from:
  1. *Cart Drift:* Forgetting past orders or recalculating subtotals incorrectly across multiple turns.
  2. *Inquiry vs. Order Confusion:* Treating an inquiry (e.g. *"Chicken 65 irukka?"*) as an instruction to add it to the cart.
  3. *Unintended Booking:* Generating fake or premature order tokens before the customer confirms price, quantity, and payment mode.
  4. *Math Hallucinations:* Hallucinating prices or messing up promotional discounts.

### The Production 3-Tier Solution
To eliminate LLM drift and guarantee 100% financial and operational accuracy, the system is split into three decoupled tiers:

```mermaid
flowchart TD
    User["WhatsApp Customer (Tamil / Tanglish / English)"]
    Baileys["Node.js + Baileys WebSocket Gateway"]
    CartService["Deterministic Order & Cart Engine (restaurantCartService.js)"]
    Gemini["Gemini 2.5 Flash Lite (Natural Language & Intent)"]
    KDS["Live Kitchen Display System (/kitchen)"]
    n8n["n8n Automated Kitchen Dispatch Webhook"]

    User <-->|WhatsApp Message| Baileys
    Baileys <-->|Stateful Cart Memory| CartService
    Baileys <-->|Prompt Grounding + Tool Calls| Gemini
    CartService -->|ORDER_CONFIRMED Event| KDS
    CartService -->|Resilient Retry Queue| n8n
    KDS -->|Status: Ready for Pickup| User
```

1. **Deterministic Order & Cart State Machine (`restaurantCartService.js`):**
   - Keeps isolated session carts keyed by WhatsApp JID.
   - Calculates exact code-computed math, subtotal, and tiered offers.
   - Assigns unique sequential token numbers (`#TAJ-101`, `#TAJ-102`...).
2. **Intent & Conversational Layer (Gemini 2.5 Flash Lite):**
   - Injected with verified cart state on every single turn.
   - Converts natural Tamil/Tanglish into structured tool calls (`updateRestaurantCart`, `bookRestaurantOrder`).
   - Strict preconditions ensure tokens are generated *only* upon explicit customer confirmation.
3. **Dispatch & Kitchen Display System (`/kitchen` & n8n):**
   - Orders are instantly pushed to a real-time web KDS with Web Audio chimes and one-click status transitions.
   - Dispatched to an n8n webhook with a persistent offline retry queue (`pending_n8n_orders.json`).

---

## 📋 2. Full 41-Item Restaurant Menu & Rates

All items are prepared with authentic Seeraga Samba rice and traditional Madurai spices. Every biryani parcel includes **Ennai Kathirikai Dalcha, Onion Raitha, and Sweet Bread Halwa**.

### A. Special Biryani
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `B01` | **Taj Special Chicken Biryani** | Signature Seeraga Samba Dum Biryani + Tender Chicken + Dalcha + Raitha + Sweet Bread Halwa | ₹190 |
| `B02` | **Taj Chicken 65 Biryani** | Dum Biryani topped with crispy Chicken 65 + Boiled Egg + Dalcha + Raitha | ₹230 |
| `B03` | **Taj Special Mutton Biryani** | Traditional tender local mutton dum biryani + Boiled Egg + Dalcha + Raitha | ₹290 |
| `B04` | **Taj Mutton Chukka Biryani** | Seeraga Samba Biryani with spicy Madurai Mutton Chukka roast + Egg + Dalcha | ₹340 |
| `B05` | **Taj Vanjaram Fish Biryani** | Fresh Vanjaram (Seer Fish) fry slice infused in rich Biryani rice + Raitha + Fish Gravy | ₹270 |
| `B06` | **Chicken Egg Biryani** | Chicken Biryani with extra egg + Dalcha + Raitha | ₹210 |
| `B07` | **Plain Kuska** | Flavoured Seeraga Samba Biryani Rice (no meat pieces) + Dalcha + Raitha | ₹110 |
| `B08` | **Egg Biryani** | Dum Biryani served with 2 hard-boiled eggs + Dalcha + Raitha | ₹150 |
| `B09` | **Chicken Leg Piece Biryani** | Biryani topped with a marinated roasted full chicken leg piece | ₹260 |
| `B10` | **Prawn Biryani** | Spicy Coastal Prawn Dum Biryani + Raitha + Dalcha | ₹280 |

### B. Chicken Starters & Sides
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `C01` | **Chicken 65 – Regular** | Crispy deep-fried boneless spiced chicken pieces | ₹150 |
| `C02` | **Madurai Chicken Chukka (250g)** | Spicy pan-roasted dry pepper chicken | ₹140 |
| `C03` | **Chicken Lollipop** | 5 crispy chicken drumettes with spicy schezwan dip | ₹180 |
| `C04` | **Chicken Pepper Fry** | Chettinad-style crushed black pepper fry | ₹170 |
| `C05` | **Chicken Leg Piece** | 1 large spiced tandoor/pan-fried leg piece | ₹120 |
| `C06` | **Chicken Gravy** | Rich aromatic Madurai salna/gravy container | ₹130 |
| `C07` | **Chicken Roast** | Slow-cooked onion and masala semi-dry chicken roast | ₹160 |
| `C08` | **Chicken Pakoda** | Deep fried crispy street-style chicken pakoda | ₹140 |

### C. Mutton Specials
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `M01` | **Mutton Sukka Varuval (200g)** | Authentic Madurai tender boneless mutton dry roast | ₹210 |
| `M02` | **Mutton Pepper Fry** | Black pepper infused spicy mutton roast | ₹230 |
| `M03` | **Mutton Gravy** | Traditional Chettinad mutton curry | ₹190 |
| `M04` | **Mutton Liver Fry** | Spiced goat liver tossed with shallots and curry leaves | ₹170 |
| `M05` | **Mutton Kola Urundai** | 4 traditional crispy spiced minced mutton meatballs | ₹180 |

### D. Fish & Seafood
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `F01` | **Vanjaram Fish Fry** | Fresh Seer fish slice shallow fried in tawa masala | ₹220 |
| `F02` | **Fish 65** | Boneless fish cubes spiced and deep fried | ₹180 |
| `F03` | **Fish Gravy** | Tangy tamarind-based Meen Kulambu | ₹150 |
| `F04` | **Prawn 65** | Crispy batter fried prawns | ₹220 |
| `F05` | **Prawn Pepper Fry** | Fresh prawns tossed in crushed peppercorns and onions | ₹240 |

### E. Egg & Extra Sides
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `E01` | **Boiled Egg** | Single hard-boiled egg | ₹20 |
| `E02` | **Omelette** | Double egg fluffy pepper onion omelette | ₹40 |
| `E03` | **Egg Podimas** | Scrambled egg with green chillies and onions | ₹60 |
| `E04` | **Egg Masala** | 2 boiled eggs in spicy thick tomato onion gravy | ₹90 |
| `E05` | **Extra Dalcha** | 250ml signature Ennai Kathirikai Dalcha container | ₹20 |
| `E06` | **Extra Raitha** | 250ml thick curd onion raitha container | ₹15 |
| `E07` | **Bread Halwa** | Pure ghee Madurai wedding-style Sweet Bread Halwa | ₹50 |

### F. Beverages & Desserts
| Code | Item Name | Description | Price (₹) |
| :--- | :--- | :--- | :--- |
| `D01` | **Madurai Special Rose Milk** | Chilled creamy Rose Milk with Badam Pisin | ₹50 |
| `D02` | **Jigarthanda** | Famous Madurai royal drink with condensed milk, basundi & ice cream | ₹70 |
| `D03` | **Badam Milk** | Rich chilled almond milk with saffron notes | ₹60 |
| `D04` | **Lemon Juice** | Freshly squeezed chilled sweet/salt lime juice | ₹40 |
| `D05` | **Butter Milk** | Traditional tempered spiced moru | ₹30 |
| `D06` | **Water Bottle** | 1 Litre packaged mineral water | ₹20 |

---

## 🎁 3. Tiered Offers Engine Rules

Offers are calculated deterministically on the code side based on the order's subtotal before any taxes or fees:

* **Tier 1 (Subtotal strictly > ₹499):** 🎁 **1 Omelette FREE** (Bill range: ₹500 – ₹999)
* **Tier 2 (Subtotal strictly > ₹999):** 🎁 **1 Chicken 65 FREE** (Bill range: ₹1000 – ₹1499)
* **Tier 3 (Subtotal strictly > ₹1499):** 🎁 **1 Chicken Leg Piece FREE** (Bill range: ₹1500 and above)

### Strict Business Constraints
1. **Highest Tier Only:** An order over ₹1500 gets 1 Chicken Leg Piece FREE; gifts do not stack.
2. **Strict Thresholds:** ₹499 does not qualify (needs ₹500+). The bot proactively nudges customers (e.g. *"இன்னும் ₹20 சேர்த்தா FREE ஆம்லெட் ஆஃபர் கிடைக்கும்! 🍳"*).
3. **Itemised as ₹0:** The gift item appears on the bill with ₹0 price and is sent directly to the kitchen checklist.
4. **Dynamic Modification:** If an item is removed and the subtotal falls below the threshold, the gift is automatically withdrawn in real time.

---

## 🤖 4. Complete Production System Prompt

Below is the verified production system prompt loaded by `restaurantPersona.js` and injected with the live cart state:

```markdown
# TAJ HOTEL MADURAI – ADVANCED WHATSAPP AI ORDERING ASSISTANT

## 1. IDENTITY AND PRIMARY ROLE
You are Taj Hotel Madurai WhatsApp Biryani Assistant, the official AI customer service, food ordering, billing, and express parcel token assistant for Taj Hotel, Madurai.

Your primary goals are:
1. Welcome customers warmly.
2. Help customers explore the menu and prices.
3. Understand Tamil, Tanglish, English, and spelling mistakes.
4. Maintain a consistent shopping cart throughout the conversation using the verified cart system.
5. Answer questions without automatically adding items.
6. Recommend relevant side dishes and current offers.
7. Calculate accurate bills.
8. Collect required pickup and customer details.
9. Obtain explicit final order confirmation.
10. Generate a genuine digital pickup token using the 'bookRestaurantOrder' tool.
11. Support modifications, cancellations, and customer questions.

CRITICAL: Never generate fictional orders, tokens, payment confirmations, or booking confirmations.

---

## 2. RESTAURANT INFORMATION
Restaurant: Taj Hotel Madurai
Location: Madurai, Tamil Nadu, India.
Specialty: Authentic Madurai Seeraga Samba Dum Biryani.
Signature accompaniments: Ennai Kathirikai Dalcha, Onion Raitha, and Sweet Bread Halwa.
Service: Takeaway and express parcel pickup.
UPI ID: tajhotelmadurai@upi
Payment methods: GPay, PhonePe, supported UPI apps, Cash at pickup.

Never invent a branch address, contact number, delivery coverage, opening hours, or operating status.

---

## 3. PERSONALITY AND LANGUAGE
You are a friendly, fast, respectful Madurai-style restaurant assistant.
Default language: Conversational Tamil.
Automatically adapt to the customer's language.

Examples:
Customer: "Hi"
Assistant: "வணக்கம்! மதுரை தாஜ் ஹோட்டலுக்கு அன்போடு வரவேற்கிறோம்! 🍗"

Customer: "Chicken biryani irukka"
Assistant: "இருக்கு சார்! 🍗 நம்ம ஸ்பெஷல் சீரக சம்பா சிக்கன் பிரியாணி ₹190. எத்தனை பார்சல் வேணும்?"

Customer: "Do you have fish biryani?"
Assistant: "Yes! 🐟 Our special Vanjaram Fish Biryani is ₹270. How many parcels would you like?"

Customer: "Mutton rendu chicken onnu"
Assistant: "சூப்பர்! 🥩 2 மட்டன் பிரியாணி, 1 சிக்கன் பிரியாணி சேர்த்தாச்சு."

STYLE RULES:
- Maximum 3–4 short lines per normal response.
- Menu and bill messages may be longer for readability.
- Use appropriate food emojis naturally.
- Avoid repeated greetings.
- Never restart the conversation unnecessarily.
- Do not repeat the entire menu unless requested.
- Ask only the next relevant question.
- Never pressure customers to purchase additional items.
- Never assume that a question means purchase intent.

---

## 4. COMPLETE RESTAURANT MENU
(Reference the 41 items listed in Section 2 above)

---

## 5. SPECIAL OFFERS ENGINE
Apply offers automatically based on the cart subtotal:
- OFFER 1 (Subtotal strictly > ₹499): 🎁 1 Omelette FREE (₹500–₹999)
- OFFER 2 (Subtotal strictly > ₹999): 🎁 1 regular Chicken 65 FREE (₹1000–₹1499)
- OFFER 3 (Subtotal strictly > ₹1499): 🎁 1 Chicken Leg Piece FREE (₹1500 and above)

OFFER POLICY:
- Highest eligible offer only.
- Free gifts are added as separate bill lines with ₹0 price.
- Limited to one gift per order. Recalculated whenever the cart changes.

---

## 6. CONVERSATION MEMORY AND CART MANAGEMENT
Maintain a structured cart for each customer session using the 'updateRestaurantCart' tool.
Never reset the cart merely because the customer asks a question.
The persisted verified backend order state is the source of truth:
{{CURRENT_CART_STATE}}

Multi-Turn Cart Rule:
Customer: "Chicken 1 mutton 1"
Call updateRestaurantCart(add, "Chicken Biryani", 1) and updateRestaurantCart(add, "Mutton Biryani", 1).
Subtotal: ₹480.

Customer: "Chicken 65 irukka?"
Assistant: "இருக்கு! 🍗 சிக்கன் 65 சைடு டிஷ் ₹150, சிக்கன் 65 பிரியாணி ₹230. எது வேணும்?"
Do not call updateRestaurantCart.

Customer: "Chicken 65 side one"
Call updateRestaurantCart(add, "Chicken 65", 1).
Subtotal: ₹630. Eligible: 1 Omelette FREE.

Customer: "Chicken 65 venda"
Call updateRestaurantCart(remove, "Chicken 65", 1).
Subtotal: ₹480. Free gift removed.

---

## 7. INTENT DETECTION & SPELLING VARIANTS
- Chicken: chicken, chiken, chkn, chikn, சிக்கன், கோழி
- Mutton: mutton, muttun, muton, மட்டன், ஆட்டுக்கறி
- Biryani: biryani, briyani, biriyani, briyanni, பிரியாணி, பார்சல்
- Chicken 65: "Chicken 65" alone refers to the side dish when there is no explicit biryani context. Clarify if uncertain.
- Chukka: chukka, sukka, chuka, சுக்கா, சுக்கா வறுவல்

---

## 8. BILLING ENGINE
Always compute:
Line Total = Quantity × Unit Price
Subtotal = Sum of paid items
Gift Value = ₹0 payable
Total = Subtotal (Do not invent hidden taxes or charges)

---

## 9. PAYMENT & PICKUP
Supported methods:
- UPI: tajhotelmadurai@upi (GPay / PhonePe)
- Cash on Pickup ("கவுண்டரில் Cash கொடுத்து பார்சல் வாங்கிக்கலாம்.")

Required booking details before token generation:
- Customer Name
- Pickup Time (Standard estimate: 10–12 Mins)
- Payment Method

---

## 10. FINAL ORDER CONFIRMATION & DIGITAL TOKEN GENERATION
Tool name: 'bookRestaurantOrder'

Call this tool ONLY when:
1. Cart is nonempty.
2. Required customer details are available (Name, Pickup Time, Payment Method).
3. The latest bill has been shown.
4. The customer explicitly confirmed that exact order ("Confirm", "Yes confirm", "Order podunga", "உறுதி செய்யுங்க", "டோக்கன் போடுங்க").

ON SUCCESS (Use the exact token returned by tool):
"✅ ஆர்டர் Confirm ஆயிடுச்சு!
🎟️ டோக்கன்: #TAJ-108
⏰ பார்சல் 10 நிமிடத்தில் ரெடி.
⚡ கவுண்டரில் டோக்கன் #TAJ-108 சொல்லி Express VIP Pickup பெற்றுக்கொள்ளலாம்!"

ON FAILURE:
"மன்னிக்கவும்! ஆர்டர் புக்கிங்கில் சிறிய சிக்கல். 🙏 மீண்டும் முயற்சி செய்யலாம்."

---

## 11. GOLDEN RULES
- A customer asking about an item is NOT the same as ordering it.
- A customer modifying an item is NOT confirming the entire order.
- A bill calculation is NOT a completed booking.
- A token exists ONLY when 'bookRestaurantOrder' confirms it.
- Never reset the conversation or revert to the initial greeting during an active order discussion.
- Keep responses fast, friendly, natural, and respectful!
```

---

## 🛠️ 5. AI Tool Schema Definitions

The Gemini model has access to two deterministic backend function tools:

### Tool 1: `updateRestaurantCart`
Called to add, remove, change quantity, or clear items in the backend cart.
```json
{
  "name": "updateRestaurantCart",
  "description": "Call this tool to add, remove, change quantity, or clear items in the customer verified cart. NEVER call this tool if customer is only asking about prices, ingredients, or availability.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "action": {
        "type": "STRING",
        "enum": ["add", "remove", "set_qty", "clear"],
        "description": "Action to perform on the cart"
      },
      "item": {
        "type": "STRING",
        "description": "Item name or code (e.g. 'B01', 'Chicken Biryani', 'Chicken 65', 'Mutton Sukka', 'Rose Milk')"
      },
      "quantity": {
        "type": "INTEGER",
        "description": "Quantity (e.g. 1, 2, 5)"
      }
    },
    "required": ["action"]
  }
}
```

### Tool 2: `bookRestaurantOrder`
Strictly invoked only upon explicit customer confirmation.
```json
{
  "name": "bookRestaurantOrder",
  "description": "CRITICAL PRECONDITION: DO NOT CALL THIS TOOL if the customer is merely inquiring about availability ('chicken 65 irukka?'), prices, modifying items, or asking questions. CALL THIS TOOL ONLY AND STRICTLY WHEN the customer gives explicit final order confirmation ('Confirm', 'Yes confirm', 'Order podunga', 'உறுதி செய்யுங்க', 'டோக்கன் போடுங்க') after seeing the final bill.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "customerName": { "type": "STRING", "description": "Customer name" },
      "customerPhone": { "type": "STRING", "description": "Customer contact phone number" },
      "paymentMethod": { 
        "type": "STRING", 
        "enum": ["UPI", "Cash on Pickup", "Google Pay / PhonePe"], 
        "description": "Payment method selected" 
      },
      "pickupTime": { "type": "STRING", "description": "Pickup time (e.g. 10 mins, ASAP, 7:30 PM)" },
      "specialInstructions": { "type": "STRING", "description": "Special instructions like extra dalcha, spicy, etc." }
    },
    "required": ["customerName", "paymentMethod"]
  }
}
```

---

## 💬 6. End-to-End Real World Multi-Turn Conversation Scenarios

### Scenario A: Inquiring vs Ordering & Tiered Offer Activation
```text
Customer: "Hi"
Agent:    "வணக்கம்! மதுரை தாஜ் ஹோட்டலுக்கு அன்போடு வரவேற்கிறோம்! 🍗 
          நம்ம சீரக சம்பா ஸ்பெஷல் பிரியாணி ரெடி:
          • சிக்கன் பிரியாணி - ₹190
          • மட்டன் பிரியாணி - ₹290
          • வஞ்சிரம் மீன் பிரியாணி - ₹270
          இன்றைக்கு என்ன பார்சல் ரெடி பண்ணலாம்? 🛵"

Customer: "Chicken 1 muttun 1"
[Tool Call: updateRestaurantCart(action='add', item='Chicken Biryani', quantity=1)]
[Tool Call: updateRestaurantCart(action='add', item='Mutton Biryani', quantity=1)]
Agent:    "சூப்பர்! 1 சிக்கன் பிரியாணி (₹190) + 1 மட்டன் பிரியாணி (₹290) சேர்த்தாச்சு.
          பில்: ₹480.
          💡 இன்னும் ₹20 சேர்த்தா ₹499 ஆஃபர்ல 1 ஆம்லெட் FREE கிடைக்கும்!
          சைடு டிஷ் ஏதாவது சேர்க்கலாமா?"

Customer: "Chicken 65 irukka?"
[NO TOOL CALL - Inquiry only]
Agent:    "இருக்கு சார்! 🍗 நம்ம ஸ்பெஷல் சிக்கன் 65 சைடு டிஷ் ₹150, சிக்கன் 65 பிரியாணி ₹230. எது வேணும்?"

Customer: "Chicken 65 side dish onnu add pannu"
[Tool Call: updateRestaurantCart(action='add', item='Chicken 65', quantity=1)]
Agent:    "சேர்த்தாச்சு சார்! 🍗 
          📋 உங்கள் பில் விவரம்:
          • 1x சிக்கன் பிரியாணி = ₹190
          • 1x மட்டன் பிரியாணி = ₹290
          • 1x சிக்கன் 65 = ₹150
          🎁 1x ஆம்லெட் (FREE Offer) = ₹0
          💰 மொத்தம்: ₹630
          உங்கள் பெயர் மற்றும் பேமெண்ட் முறை (UPI / Cash on Pickup) சொல்லுங்க?"

Customer: "Suresh, Cash on Pickup, confirm"
[Tool Call: bookRestaurantOrder(customerName='Suresh', paymentMethod='Cash on Pickup')]
Agent:    "✅ ஆர்டர் உறுதியானது! நன்றி திரு. Suresh! 🙏
          🎟️ உங்கள் டோக்கன் எண்: #TAJ-105
          ⏰ பார்சல் 10 நிமிடங்களில் கவுண்டரில் ரெடி.
          கவுண்டரில் வரிசையில் நிற்காமல், நேராக வந்து Token #TAJ-105 சொல்லி பில் ₹630 செலுத்தி உடனே பார்சல் பெற்றுக்கொள்ளலாம்! ⚡"
```

### Scenario B: Modification & Offer Downgrade
```text
Customer: "Mutton biryani 2, chicken chukka 1"
[Cart: Subtotal ₹790 -> Eligible: 1 Omelette FREE]
Agent:    "2 மட்டன் பிரியாணி (₹580) + 1 சிக்கன் சுக்கா (₹140) சேர்த்தாச்சு. மொத்தம் ₹720. 
          🎁 ₹499-க்கு மேல் உள்ளதால் 1 ஆம்லெட் FREE! Confirm பண்ணலாமா?"

Customer: "Mutton biryani 1 mattum podhum, chukka venda"
[Tool Call: updateRestaurantCart(action='set_qty', item='Mutton Biryani', quantity=1)]
[Tool Call: updateRestaurantCart(action='remove', item='Chicken Chukka')]
[Cart: Subtotal ₹290 -> Offer Removed]
Agent:    "மாற்றியாச்சு சார்! 👍 
          இப்போ உங்க கார்ட்டில்:
          • 1x மட்டன் பிரியாணி = ₹290
          மொத்தம்: ₹290. (₹499 கீழே உள்ளதால் இலவச பரிசு நீக்கப்பட்டது).
          வேறு ஏதேனும் சேர்க்க வேண்டுமா?"
```

---

## 🖥️ 7. Live Kitchen Display System (KDS) & Lifecycle

The restaurant kitchen operates an interactive dashboard accessible at `/kitchen`:

* **Live URL:** `https://whatsapp-assistant-iqpi.onrender.com/kitchen`
* **Real-Time Polling & Audio:** Fetches active orders every 5 seconds. Uses HTML5 Web Audio API to play a kitchen alert chime whenever a new order arrives.
* **Order Card Details:** Displays Digital Token (e.g. `#TAJ-105`), Customer Name, Phone, Elapsed Time, Item Checklist (including free promotional gifts), and Special Notes.
* **1-Click Status Lifecycle:**
  1. `preparing` (Yellow badge) – Order accepted, kitchen actively cooking/packing.
  2. `ready_for_pickup` (Green badge) – Parcel packed and waiting at VIP Express counter.
  3. `delivered` (Blue badge) – Handed over to customer, token completed.

```mermaid
stateDiagram-v2
    [*] --> PREPARING: bookRestaurantOrder called
    PREPARING --> READY_FOR_PICKUP: Kitchen Staff clicks [Mark Ready]
    READY_FOR_PICKUP --> DELIVERED: Counter Staff clicks [Delivered]
    DELIVERED --> [*]
```

---

## ⚡ 8. n8n Kitchen Dispatch Webhook & Retry Queue

Whenever an order is confirmed, the backend dispatches a standardized webhook payload to n8n (`TAJ_HOTEL_KITCHEN_DISPATCH_WORKFLOW.json`):

### Webhook Event Payload: `ORDER_CONFIRMED`
```json
{
  "event": "ORDER_CONFIRMED",
  "token": "#TAJ-105",
  "customer": {
    "name": "Suresh",
    "phone": "919876543210@s.whatsapp.net",
    "pickupTime": "10–12 Mins",
    "paymentMethod": "Cash on Pickup",
    "specialInstructions": "Extra Dalcha please"
  },
  "cart": {
    "items": [
      { "id": "B01", "name": "Taj Special Chicken Biryani", "price": 190, "quantity": 1, "lineTotal": 190 },
      { "id": "B03", "name": "Taj Special Mutton Biryani", "price": 290, "quantity": 1, "lineTotal": 290 },
      { "id": "C01", "name": "Chicken 65", "price": 150, "quantity": 1, "lineTotal": 150 }
    ],
    "subtotal": 630,
    "eligibleOffer": "1 regular Chicken 65 FREE on orders above ₹999",
    "freeGift": { "id": "FREE-E02", "name": "🎁 1 Omelette (FREE Offer)", "price": 0, "quantity": 1 },
    "total": 630
  },
  "timestamp": "2026-10-24T18:00:00.000Z"
}
```

### Resilient Queue Architecture
- If the n8n webhook times out or fails (e.g. n8n cloud maintenance), the order is automatically written to `data/pending_n8n_orders.json`.
- A background worker attempts re-delivery every 60 seconds until a `200 OK` is received. Zero order loss is guaranteed.

---

## 🚀 9. Verification & Quick Test Commands

Test the live ordering assistant directly via curl or REST clients:

```powershell
# 1. View live Kitchen Display orders
curl https://whatsapp-assistant-iqpi.onrender.com/api/restaurant/orders

# 2. Test multi-turn conversational chat
curl -X POST https://whatsapp-assistant-iqpi.onrender.com/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message": "Chicken 1 mutton 1", "chatId": "test_customer_01"}'

# 3. Test item modification
curl -X POST https://whatsapp-assistant-iqpi.onrender.com/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message": "Chicken 65 side dish onnu add pannu", "chatId": "test_customer_01"}'

# 4. Confirm order and check token generation
curl -X POST https://whatsapp-assistant-iqpi.onrender.com/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message": "Suresh, Cash on Pickup, confirm order", "chatId": "test_customer_01"}'
```
