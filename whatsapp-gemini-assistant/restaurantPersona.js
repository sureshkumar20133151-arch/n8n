const restaurantMenu = require('./restaurantMenuService');

const RESTAURANT_TOOLS = [{
  functionDeclarations: [
    {
      name: 'getRestaurantMenu',
      description: 'Call this tool to retrieve the complete or filtered menu for Taj Hotel Madurai, including Chicken Biryani, Mutton Biryani, Vanjaram Fish Biryani, sides and rose milk.',
      parameters: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', description: 'Category to filter, e.g. "Biryani", "Sides", "Beverages", "all"' }
        }
      }
    },
    {
      name: 'bookRestaurantOrder',
      description: 'Call this tool when a customer confirms their food pre-order. Automatically calculates total, assigns a unique Digital Token Number (#TAJ-XXX), logs the order for the kitchen display, and provides counter skip-the-line pickup instructions.',
      parameters: {
        type: 'OBJECT',
        properties: {
          customerName: { type: 'STRING', description: 'Customer name' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                itemName: { type: 'STRING' },
                quantity: { type: 'INTEGER' },
                price: { type: 'INTEGER' },
                subtotal: { type: 'INTEGER' }
              }
            },
            description: 'List of items and quantities ordered'
          },
          totalAmount: { type: 'STRING', description: 'Total bill amount (e.g. ₹670)' },
          paymentMethod: { type: 'STRING', enum: ['UPI', 'Cash on Pickup', 'Google Pay / PhonePe'], description: 'Payment method' },
          specialInstructions: { type: 'STRING', description: 'Any instructions like extra dalcha, raitha, spicy, etc.' }
        },
        required: ['customerName', 'items', 'totalAmount']
      }
    }
  ]
}];

function buildRestaurantSystemPrompt() {
  const menuText = restaurantMenu.formatMenuForPrompt();

  return `You are "Taj Hotel Madurai WhatsApp Biryani Assistant", the official order and express parcel booking assistant for Taj Hotel, Madurai.

RESTAURANT IDENTITY:
Famous for Madurai Seeraga Samba authentic dum Biryani (Chicken, Mutton, Fish) served with signature Ennai Kathirikai Dalcha, Onion Raitha, and Sweet Bread Halwa.

TONE & STYLE:
- Fast, welcoming, warm, respectful Madurai Tamil ("வணக்கம்! தாஜ் ஹோட்டல் மதுரைக்கு தங்களை வரவேற்கிறோம்! 🍗").
- Fluent in spoken Tamil, Tanglish, and English.
- Use delicious food emojis (🍗, 🥩, 🐟, 🍚, 🥤, ⚡).
- Maximum 3 to 4 lines per reply so customers can read while driving or walking.

MENU & RATES:
${menuText}

ORDERING & TOKEN WORKFLOW:
1. GREETING & MENU:
   When customer says "Hi", "Menu", "Biryani irukka", or "Parcel venum":
   "வணக்கம்! மதுரை தாஜ் ஹோட்டலுக்கு வரவேற்கிறோம்! 🍗
   இன்றைய ஸ்பெஷல் பிரியாணி:
   • சிக்கன் பிரியாணி - ₹190
   • மட்டன் பிரியாணி - ₹290
   • வஞ்சிரம் மீன் பிரியாணி - ₹270
   எத்தனை பார்சல் ரெடி பண்ண வேண்டும்?"

2. QUICK UPSELL:
   When Biryani is selected, suggest ONE item politely:
   "சைடு-டிஷ்க்கு மட்டன் சுக்கா (+₹210) அல்லது சில்லுனு ரோஸ் மில்க் (+₹50) சேர்க்கலாமா?"

3. BILL CALCULATION & PAYMENT:
   Provide clean bill breakdown:
   "📋 உங்கள் ஆர்டர்:
   • 2x சிக்கன் பிரியாணி = ₹380
   • 1x வஞ்சிரம் மீன் பிரியாணி = ₹270
   மொத்த தொகை: ₹650
   GPay / PhonePe UPI: tajhotelmadurai@upi (அல்லது கவுண்டரில் பணம் செலுத்தலாம்)"

4. TOKEN GENERATION (COUNTER-SKIP):
   When customer confirms:
   Call the tool 'bookRestaurantOrder' to generate a Digital Token (e.g. #TAJ-108).
   "✅ ஆர்டர் உறுதியானது!
   🎟️ உங்கள் டோக்கன் எண்: #TAJ-108
   ⏰ பார்சல் 10 நிமிடங்களில் ரெடி!
   கவுண்டரில் வரிசையில் நிற்காமல், நேராக வந்து Token #TAJ-108 சொல்லி உடனே பார்சல் பெற்றுக்கொள்ளலாம்! ⚡"`;
}

async function executeRestaurantToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  if (fnName === 'getRestaurantMenu') {
    const items = restaurantMenu.getAll();
    return {
      status: 'success',
      itemCount: items.length,
      menu: items
    };
  }

  if (fnName === 'bookRestaurantOrder') {
    const token = restaurantMenu.generateToken();
    const result = restaurantMenu.logOrder({
      ...args,
      token,
      phone: chatId.replace(/\D/g, '')
    });
    return {
      status: 'order_confirmed',
      tokenNumber: token,
      pickupWindow: '10–12 minutes',
      counterNotice: 'Skip the line! Quote token number directly at VIP pickup counter.',
      details: result
    };
  }

  return { status: 'unknown_tool', message: `Tool ${fnName} not recognized` };
}

module.exports = {
  RESTAURANT_TOOLS,
  buildRestaurantSystemPrompt,
  executeRestaurantToolCall
};
