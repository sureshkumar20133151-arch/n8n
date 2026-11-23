/**
 * Sri Meenakshi Traders (SMT) - Edible Oils Wholesale & Retail Trading Persona
 * Madurai's Leading Wholesale Edible Oils Merchant (Gold Winner, Fortune, Gemini, Idhayam, Palm Oil)
 * Handles WhatsApp pre-orders, Cash Bill vs GST Bill, customer memory, and Tally Prime Invoicing.
 */
const fs = require('fs');
const path = require('path');
const tallyXmlBuilder = require('./tallyXmlBuilder');
const adminRules = require('./adminRulesManager');

// 🏢 Pre-configured Registered Customers Database (Madurai)
const INITIAL_SMT_CUSTOMERS = [
  {
    id: 'CUST-001',
    name: 'கேசவன் ஆயில் ஸ்டோர்',
    aliases: ['kesavan', 'கேசவன்', 'kesavan oil', 'கேசவன் ஆயில்', '7871762490'],
    address: 'பூக்கடை வீதி, மதுரை (Pookadai Street, Madurai)',
    phone: '7871762490',
    defaultBilling: 'Cash', // Prefers Cash Bill
    gstNumber: null,
    status: 'Active Wholesale Buyer'
  },
  {
    id: 'CUST-002',
    name: 'நம்பியப்பா ஆயில் ஸ்டோர்',
    aliases: ['nambiyappa', 'நம்பியப்பா', 'nambiyappa oil', 'நம்பியப்பா ஆயில்'],
    address: 'கீழமாசி வீதி, மதுரை (Keelamasi Street, Madurai)',
    phone: '+919842100102',
    defaultBilling: 'Cash', // Regular Cash Bill wholesale
    gstNumber: null,
    status: 'High Volume Buyer'
  },
  {
    id: 'CUST-003',
    name: 'லட்சுமி ஆயில் ஸ்டோர்',
    aliases: ['lakshmi', 'லட்சுமி', 'lakshmi oil', 'லட்சுமி ஆயில்', 'sri lakshmi'],
    address: 'தயிர் கடை சந்து, மதுரை (Thayir Kadai Sandhu, Madurai)',
    phone: '+919842100103',
    defaultBilling: 'GST', // Registered GST Buyer
    gstNumber: '33AAACL5678G1Z2',
    status: 'GST Registered Merchant'
  }
];

const CUSTOMERS_FILE = path.join(__dirname, 'data', 'smt_customers.json');

function loadCustomers() {
  let list = [...INITIAL_SMT_CUSTOMERS];
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(cust => {
          const cleanPhone = (cust.phone || '').replace(/[^0-9]/g, '');
          const idx = list.findIndex(c =>
            (cleanPhone && c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone) ||
            c.id === cust.id ||
            c.name.toLowerCase() === (cust.name || '').toLowerCase()
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...cust };
          } else {
            list.push(cust);
          }
        });
      }
    }
  } catch (e) {
    console.error('Error loading smt_customers.json:', e);
  }
  return list;
}

function saveCustomer(customerData) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const currentList = loadCustomers();
  const cleanPhone = (customerData.phone || '').replace(/[^0-9]/g, '');
  const existingIndex = currentList.findIndex(c =>
    (cleanPhone && c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone) ||
    c.name.toLowerCase() === (customerData.name || '').toLowerCase()
  );

  const newEntry = {
    id: existingIndex >= 0 ? currentList[existingIndex].id : `CUST-${Date.now().toString().slice(-4)}`,
    name: customerData.name,
    aliases: [customerData.name.toLowerCase(), cleanPhone].filter(Boolean),
    address: customerData.address || 'மதுரை',
    phone: cleanPhone || customerData.phone || '',
    defaultBilling: customerData.defaultBilling || (customerData.gstNumber ? 'GST' : 'Cash'),
    gstNumber: customerData.gstNumber || null,
    status: 'Registered Customer',
    registeredAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    currentList[existingIndex] = { ...currentList[existingIndex], ...newEntry };
  } else {
    currentList.push(newEntry);
  }

  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(currentList, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write smt_customers.json:', err);
  }
  return newEntry;
}

// 📦 Standard Packaging & Wholesale Price Master (Edible Oils)
const SMT_OIL_CATALOG = [
  {
    id: 'GW-1L',
    name: '1 Litre Gold Winner Sunflower Oil',
    brand: 'Gold Winner',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 10,
    ratePerBox: 1320,
    ratePerPiece: 132,
    aliases: ['1l gold winner', '1 litre gold winner', '1 லிட்டர் கோல்டு வின்னர்', 'கோல்டு வின்னர் 1 லிட்டர்']
  },
  {
    id: 'GW-500ML',
    name: '1/2 Litre (500ml) Gold Winner Sunflower Oil',
    brand: 'Gold Winner',
    packType: 'Pouch Box',
    packingSize: '500ml',
    piecesPerBox: 20,
    ratePerBox: 1360,
    ratePerPiece: 68,
    aliases: ['1/2l gold winner', '1/2 litre gold winner', '500ml gold winner', '1/2 லிட்டர் கோல்டு வின்னர்', 'அரை லிட்டர் கோல்டு வின்னர்']
  },
  {
    id: 'GW-5L',
    name: '5 Litre Gold Winner Sunflower Oil',
    brand: 'Gold Winner',
    packType: 'Can Box',
    packingSize: '5 Litre / 12L Pack',
    piecesPerBox: 12, // 12 Litres total packing
    ratePerBox: 1620,
    ratePerPiece: 675,
    aliases: ['5l gold winner', '5 litre gold winner', '5 லிட்டர் கோல்டு வின்னர்']
  },
  {
    id: 'GW-200ML',
    name: '200ml Gold Winner Sunflower Oil',
    brand: 'Gold Winner',
    packType: 'Pouch Box',
    packingSize: '200ml',
    piecesPerBox: 60,
    ratePerBox: 1740,
    ratePerPiece: 29,
    aliases: ['200ml gold winner', '200 gold winner', '200 மிலி கோல்டு வின்னர்']
  },
  {
    id: 'FORT-1L',
    name: '1 Litre Fortune Sunflower Oil',
    brand: 'Fortune',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 10,
    ratePerBox: 1280,
    ratePerPiece: 128,
    aliases: ['1l fortune', '1 litre fortune', '1 லிட்டர் பார்ச்சூன்', 'பார்ச்சூன் 1 லிட்டர்']
  },
  {
    id: 'FORT-500ML',
    name: '1/2 Litre Fortune Sunflower Oil',
    brand: 'Fortune',
    packType: 'Pouch Box',
    packingSize: '500ml',
    piecesPerBox: 24,
    ratePerBox: 1560,
    ratePerPiece: 65,
    aliases: ['1/2l fortune', '1/2 litre fortune', '1/2 லிட்டர் பார்ச்சூன்', 'அரை லிட்டர் பார்ச்சூன்']
  },
  {
    id: 'GEM-GND-1L',
    name: '1 Litre Gemini Gold Groundnut Oil (கடலை எண்ணெய்)',
    brand: 'Gemini Gold',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 10,
    ratePerBox: 1950,
    ratePerPiece: 195,
    aliases: ['1l gemini groundnut', 'gemini gold kadalai', '1 லிட்டர் ஜெமினி கோல்டு கடலை எண்ணெய்', 'ஜெமினி கடலை எண்ணெய்']
  },
  {
    id: 'GEM-SUN-1L',
    name: '1 Litre Gemini Gold Sunflower Oil',
    brand: 'Gemini Gold',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 10,
    ratePerBox: 1300,
    ratePerPiece: 130,
    aliases: ['1l gemini sunflower', '1 லிட்டர் ஜெமினி கோல்டு சன்பிளவர்', 'ஜெமினி சன்பிளவர்']
  },
  {
    id: 'IDH-1L',
    name: '1 Litre Idhayam Gingelly Oil (நல்லெண்ணெய்)',
    brand: 'Idhayam',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 12,
    ratePerBox: 3960,
    ratePerPiece: 330,
    aliases: ['1l idhayam', '1 litre idhayam', '1 லிட்டர் இதயம்', 'இதயம் நல்லெண்ணெய் 1 லிட்டர்']
  },
  {
    id: 'PALM-1L',
    name: '1 Litre Palm Oil (பாம் ஆயில்)',
    brand: 'Palm Oil',
    packType: 'Pouch Box',
    packingSize: '1 Litre',
    piecesPerBox: 10,
    ratePerBox: 980,
    ratePerPiece: 98,
    aliases: ['1l palm oil', '1l palmolein', '1l பாம் ஆயில்', '1 லிட்டர் பாம் ஆயில்', 'பாம் ஆயில் 1 லிட்டர்', 'பாமாயில் 1 லிட்டர்', '1 லிட்டர் பாமா ஆயில்', 'பாம் ஆயில்']
  },
  {
    id: 'PALM-500ML',
    name: '1/2 Litre Palm Oil (பாம் ஆயில்)',
    brand: 'Palm Oil',
    packType: 'Pouch Box',
    packingSize: '500ml',
    piecesPerBox: 20,
    ratePerBox: 1020,
    ratePerPiece: 51,
    aliases: ['1/2l palm oil', '500ml palm oil', '1/2l பாம் ஆயில்', '500ml பாம் ஆயில்', '1/2 லிட்டர் பாம் ஆயில்', 'அரை லிட்டர் பாம் ஆயில்', '1/2 லிட்டர் பாமா ஆயில்']
  },
  {
    id: 'PALM-5L',
    name: '5 Litre Palm Oil Can',
    brand: 'Palm Oil',
    packType: 'Can Box',
    packingSize: '5 Litre',
    piecesPerBox: 4,
    ratePerBox: 1920,
    ratePerPiece: 480,
    aliases: ['5l palm oil', '5 litre palm oil', '5l பாம் ஆயில்', '5 லிட்டர் பாம் ஆயில்', '5 லிட்டர் பாமா ஆயில்']
  }
];

// In-memory counter for bill token numbers (Format: SMT-YYYYMMDD-XXXX)
let billSequence = 520;

function generateBillNumber() {
  billSequence += 1;
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `SMT-${dateStr}-${String(billSequence).padStart(3, '0')}`;
}

const SMT_TOOLS = [{
  functionDeclarations: [
    {
      name: 'createSmtOilOrder',
      description: 'Create an Edible Oil Wholesale Order and generate a Tally Sales Bill with an instant Bill/Token number for quick pickup.',
      parameters: {
        type: 'OBJECT',
        properties: {
          customerName: {
            type: 'STRING',
            description: 'Customer or shop name (e.g. கேசவன் ஆயில் ஸ்டோர், நம்பியப்பா ஆயில் ஸ்டோர், லட்சுமி ஆயில் ஸ்டோர், or new party)'
          },
          billingType: {
            type: 'STRING',
            enum: ['Cash', 'GST'],
            description: 'Billing type: "Cash" (Cash Sales / Unregistered) or "GST" (Official GST invoice)'
          },
          gstNumber: {
            type: 'STRING',
            description: 'GSTIN of customer if provided or on record'
          },
          items: {
            type: 'ARRAY',
            description: 'List of oil items ordered',
            items: {
              type: 'OBJECT',
              properties: {
                itemDescription: { type: 'STRING', description: 'Item name (e.g. 1L Gold Winner, 1L Palm Oil, 1/2L Fortune)' },
                boxes: { type: 'NUMBER', description: 'Number of boxes/பெட்டி' },
                pieces: { type: 'NUMBER', description: 'Loose pouches/pieces if any' },
                customRatePerBox: { type: 'NUMBER', description: 'Custom agreed rate per box if specified' }
              },
              required: ['itemDescription', 'boxes']
            }
          },
          narration: {
            type: 'STRING',
            description: 'Delivery or order notes'
          }
        },
        required: ['customerName', 'items']
      }
    },
    {
      name: 'registerSmtCustomer',
      description: 'Save a new customer or shop details (Shop name, address/area in Madurai, phone number, GST status/number) into the permanent SMT database.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Customer shop name or merchant name (e.g. சக்தி மளிகை, ராஜா ஆயில் ஸ்டோர்)' },
          address: { type: 'STRING', description: 'Shop address, street, or area in Madurai (e.g. சிம்மக்கல், எல்லீஸ் நகர்)' },
          phone: { type: 'STRING', description: 'Customer 10-digit mobile number' },
          defaultBilling: { type: 'STRING', enum: ['Cash', 'GST'], description: 'Whether they prefer Cash bill or GST bill' },
          gstNumber: { type: 'STRING', description: 'GSTIN if they have one' }
        },
        required: ['name', 'address']
      }
    },
    {
      name: 'lookupSmtCustomer',
      description: 'Look up customer details, past billing preference (Cash vs GST), address, and phone number in SMT database.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Customer name or phone number' }
        },
        required: ['query']
      }
    },
    {
      name: 'getSmtOilCatalog',
      description: 'Get live wholesale box rates, pieces per box, and available brands in Sri Meenakshi Traders Edible Oil catalog.',
      parameters: {
        type: 'OBJECT',
        properties: {
          brand: { type: 'STRING', description: 'Optional brand filter (Gold Winner, Fortune, Gemini, Idhayam, Palm Oil)' }
        }
      }
    },
    {
      name: 'manageLiveBehaviorRule',
      description: 'Manage live behavior rules for Sri Meenakshi Traders in real time.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'list', 'delete', 'clear'] },
          ruleText: { type: 'STRING' },
          ruleIndex: { type: 'NUMBER' }
        },
        required: ['action']
      }
    }
  ]
}];

function buildSmtSystemPrompt(chatId = '') {
  const cleanPhone = (chatId || '').replace(/\D/g, '');
  const allCustomers = loadCustomers();

  // Match caller phone number with known customers
  let callerInfo = '';
  const matchedCustomer = allCustomers.find(c => {
    const custDigits = (c.phone || '').replace(/\D/g, '');
    return (
      (cleanPhone && custDigits && (cleanPhone.endsWith(custDigits) || custDigits.endsWith(cleanPhone))) ||
      (c.aliases && c.aliases.some(a => a === cleanPhone))
    );
  });

  if (matchedCustomer) {
    callerInfo = `
==================================================
🚨 CRITICAL: CURRENT CALLER SENDER IDENTIFIED!
- Phone Number: ${cleanPhone}
- Customer Name: ${matchedCustomer.name}
- Address: ${matchedCustomer.address}
- Billing Mode: ${matchedCustomer.defaultBilling} Bill
- GREETING MANDATE: You MUST immediately greet this customer warmly by their shop name and street in Madurai business Tamil:
  "வணக்கம் ${matchedCustomer.name} (${matchedCustomer.address.split(',')[0]}) அண்ணே! 🙏 சொல்லுங்க, இன்னைக்கு என்னென்ன ஆயில் பெட்டி போடணும்? Gold Winner, Fortune, பாம் ஆயில் எல்லாம் ரெடியா இருக்கு!"
- DO NOT ask for their GST number! They prefer Cash/Default billing. Directly take their order and issue the Fast-Lane Token!
==================================================
`;
  } else if (cleanPhone) {
    callerInfo = `
==================================================
📞 CURRENT CALLER: Phone Number ${cleanPhone} (Unregistered Customer)
- Greet politely in Tamil as Sri Meenakshi Traders Edible Oils Wholesale counter:
  "வணக்கம்! ஸ்ரீ மீனாட்சி டிரேடர்ஸ் ஆயில் மண்டி மதுரை. சொல்லுங்க அண்ணே, என்னென்ன ஆயில் பெட்டி வேணும்?"
- When they mention their shop name and area, immediately call \`registerSmtCustomer\` to permanently save their details!
==================================================
`;
  }

  return `${callerInfo}
You are the Official WhatsApp AI Sales Counter & Invoicing Assistant for **Sri Meenakshi Traders (ஸ்ரீ மீனாட்சி டிரேடர்ஸ் - SMT)**.
Location: Madurai, Tamil Nadu.
Specialization: Premier Wholesale & Retail Edible Oils Merchant (சன்பிளவர் ஆயில், பாமாயில், கடலை எண்ணெய், நல்லெண்ணெய், டின், கேன் & பாக்கெட் பெட்டிகள்).

## 🏢 BUSINESS CONTEXT & FAST-LANE PICKUP CONCEPT:
- In Madurai wholesale oil mandis, customers and vehicle drivers usually wait 30-60 minutes in long billing queues.
- With this WhatsApp assistant, customers pre-book their oil boxes in Tamil text or voice notes.
- The AI checks customer memory, determines **Cash Bill vs GST Bill**, automatically creates a **Tally Sales Voucher**, and returns an **Instant Bill / Token Number** (e.g. \`#SMT-260324-521\`).
- The customer arrives at the shop, quotes the Bill Number, pays Cash/UPI, and directly loads the goods into their vehicle **without standing in the billing queue**!

## 👥 REGISTERED CUSTOMERS ON FILE:
1. **கேசவன் ஆயில் ஸ்டோர் (Kesavan Oil Store):** பூக்கடை வீதி, மதுரை. Phone: \`7871762490\`. Billing Preference: **Cash Bill** (வழக்கமாக ஜிஎஸ்டி எடுக்க மாட்டார்கள், நேரடி கேஷ் பில்).
2. **நம்பியப்பா ஆயில் ஸ்டோர் (Nambiyappa Oil Store):** கீழமாசி வீதி, மதுரை. Billing Preference: **Cash Bill** (ஹோல்சேல் கேஷ் பில் வாங்குபவர்).
3. **லட்சுமி ஆயில் ஸ்டோர் (Lakshmi Oil Store):** தயிர் கடை சந்து, மதுரை. Billing Preference: **GST Bill** (GSTIN: \`33AAACL5678G1Z2\`).

## 🆕 NEW CUSTOMER ONBOARDING & AUTO-SAVE RULE:
- When a new customer or unknown phone number contacts us and mentions their shop name and address:
  * E.g.: "நான் சிம்மக்கல்ல இருந்து பாண்டியன் ஸ்டோர்ஸ் பேசுறேன்", or gives a phone number + shop name.
  * **IMMEDIATELY CALL \`registerSmtCustomer\`** with their name, address, phone, and default billing preference.
  * The customer is **PERMANENTLY SAVED** to the database on disk.
  * Next time they message, the AI will automatically recognize them by their shop name or phone number without asking again!


## 📦 STANDARD PACKAGING & WHOLESALE BOX RATES:
- **1L Gold Winner:** 1 பெட்டி = 10 பாக்கெட் | ₹1,320 / பெட்டி (₹132 / பாக்கெட்)
- **1/2L Gold Winner:** 1 பெட்டி = 20 பாக்கெட் | ₹1,360 / பெட்டி (₹68 / பாக்கெட்)
- **5L Gold Winner:** 1 பெட்டி = 12 லிட்டர் பேக் | ₹1,620 / பெட்டி
- **200ml Gold Winner:** 1 பெட்டி = 60 பாக்கெட் | ₹1,740 / பெட்டி (₹29 / பாக்கெட்)
- **1L Fortune Oil:** 1 பெட்டி = 10 பாக்கெட் | ₹1,280 / பெட்டி
- **1/2L Fortune Oil:** 1 பெட்டி = 24 பாக்கெட் | ₹1,560 / பெட்டி
- **1L Gemini Gold கடலை எண்ணெய்:** 1 பெட்டி = 10 பாக்கெட் | ₹1,950 / பெட்டி
- **1L Gemini Gold சன்பிளவர்:** 1 பெட்டி = 10 பாக்கெட் | ₹1,300 / பெட்டி
- **1L இதயம் நல்லெண்ணெய்:** 1 பெட்டி = 12 பாக்கெட் | ₹3,960 / பெட்டி
- **1L பாம் ஆயில் (Palm Oil):** 1 பெட்டி = 10 பாக்கெட் | ₹980 / பெட்டி
- **1/2L பாம் ஆயில்:** 1 பெட்டி = 20 பாக்கெட் | ₹1,020 / பெட்டி
- **5L பாம் ஆயில் கேன்:** 1 பெட்டி (4 கேன்) | ₹1,920 / பெட்டி (₹480 / கேன்)

## 🎯 INVOICING & CASH VS GST BILLING RULES:
1. **Customer Recognition:**
   - When a known customer asks for an order (e.g. கேசவன், நம்பியப்பா, லட்சுமி):
     * Acknowledge their shop name and street respectfully.
     * Check their billing preference.
     * If they usually take **Cash Bill** (like Kesavan or Nambiyappa), DO NOT harass them asking for GST again. Automatically issue **Cash Bill**.
     * If they usually take **GST Bill** (like Lakshmi Oil Store), apply their GSTIN and issue **GST Bill**.
     * If it is a completely new unknown customer, politely ask: *"வணக்கம்! பில் Cash பில்லாக போடவா அல்லது GST பில்லா சார்?"*
2. **Order Execution:**
   - Call \`createSmtOilOrder\` with the customer name, billing type, and the parsed items list (item, boxes).
3. **Instant Response Structure:**
   - Always return:
     * 📋 **பில் எண் (Bill / Token No):** e.g. \`#SMT-260324-521\`
     * 🏪 **கடை பெயர் & முகவரி:** (e.g. கேசவன் ஆயில் ஸ்டோர், பூக்கடை வீதி)
     * 📦 **சரக்கு விபரம்:** Item, Box count, Pieces per box, Box Rate, Subtotal
     * 💰 **மொத்த தொகை (Total Amount)**
     * ⚡ **ஃபாஸ்ட்-லேன் பிக்-அப் அறிவிப்பு:** *"கவுண்ட்டரில் பில்லிங் வரிசையில் நிற்க வேண்டாம்! இந்த பில் நம்பரை (#SMT-...) காட்டிவிட்டு உடனே சரக்கை வண்டியில் ஏற்றிவிடலாம்."*
4. **Language:** Respectful, crisp, traditional Madurai business Tamil (வணக்கம் அண்ணே / சார், பில் ரெடி ஆயிடுச்சு).`;
}

async function executeSmtToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};
  console.log(`🏪🛢️ [SMT Edible Oil Tool Invoked] ${fnName}:`, JSON.stringify(args));

  if (fnName === 'registerSmtCustomer') {
    const saved = saveCustomer({
      name: args.name,
      address: args.address,
      phone: args.phone || (chatId ? chatId.split('@')[0] : ''),
      defaultBilling: args.defaultBilling || (args.gstNumber ? 'GST' : 'Cash'),
      gstNumber: args.gstNumber || null
    });
    return {
      success: true,
      customer: saved,
      message: `✅ வாடிக்கையாளர் "${saved.name}" (${saved.address}) விவரங்கள் நிரந்தரமாகப் பதிவு செய்யப்பட்டன.`
    };
  }

  if (fnName === 'lookupSmtCustomer') {
    const q = (args.query || '').toLowerCase().trim();
    const allCustomers = loadCustomers();
    const cleanQ = q.replace(/[^0-9]/g, '');

    const found = allCustomers.find(c => {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
      return (
        (cleanQ && cleanPhone && (cleanPhone.includes(cleanQ) || cleanQ.includes(cleanPhone))) ||
        c.name.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.aliases && c.aliases.some(a => q.includes(a) || a.includes(q)))
      );
    });

    if (found) {
      return { found: true, customer: found };
    }
    return { found: false, message: `புதிய வாடிக்கையாளர் (New Customer: ${args.query})` };
  }

  if (fnName === 'getSmtOilCatalog') {
    const brand = (args.brand || '').toLowerCase().trim();
    const filtered = brand
      ? SMT_OIL_CATALOG.filter(i => i.brand.toLowerCase().includes(brand) || i.name.toLowerCase().includes(brand))
      : SMT_OIL_CATALOG;
    return { success: true, count: filtered.length, items: filtered };
  }

  if (fnName === 'createSmtOilOrder') {
    const customerName = args.customerName || 'Cash Counter Customer';
    const billingType = args.billingType || 'Cash';
    const gstNo = args.gstNumber || null;
    const items = args.items || [];
    const billNumber = generateBillNumber();

    // Auto-persist customer if known or new
    if (customerName && customerName !== 'Cash Counter Customer') {
      const callerPhone = chatId ? chatId.split('@')[0] : '';
      saveCustomer({
        name: customerName,
        phone: callerPhone,
        defaultBilling: billingType,
        gstNumber: gstNo
      });
    }

    let totalAmount = 0;
    const itemSummaries = [];

    items.forEach(orderItem => {
      const desc = (orderItem.itemDescription || '').toLowerCase();
      // Match specific aliases first, then exact name, then partial
      let matched = SMT_OIL_CATALOG.find(cat =>
        cat.aliases.some(a => desc.includes(a) || a.includes(desc))
      );

      if (!matched) {
        matched = SMT_OIL_CATALOG.find(cat =>
          cat.name.toLowerCase().includes(desc) || desc.includes(cat.name.toLowerCase())
        );
      }

      if (!matched) {
        matched = SMT_OIL_CATALOG.find(cat =>
          desc.includes(cat.brand.toLowerCase())
        );
      }

      const boxes = Number(orderItem.boxes) || 1;
      const loosePieces = Number(orderItem.pieces) || 0;

      let ratePerBox = 0;
      let piecesPerBox = 10;
      let displayName = orderItem.itemDescription;

      if (matched) {
        ratePerBox = orderItem.customRatePerBox || matched.ratePerBox;
        piecesPerBox = matched.piecesPerBox;
        displayName = matched.name;
      } else {
        ratePerBox = orderItem.customRatePerBox || 1300;
      }

      const boxTotal = boxes * ratePerBox;
      const pieceTotal = loosePieces * (ratePerBox / piecesPerBox);
      const lineTotal = Math.round(boxTotal + pieceTotal);

      totalAmount += lineTotal;
      itemSummaries.push({
        item: displayName,
        boxes: boxes,
        piecesPerBox: piecesPerBox,
        totalPouches: (boxes * piecesPerBox) + loosePieces,
        ratePerBox: ratePerBox,
        lineTotal: lineTotal
      });
    });

    // Post to Tally Prime XML Engine
    const narrationText = `SMT Bill ${billNumber} [${billingType} Bill] - ${items.map(i => `${i.itemDescription}: ${i.boxes} Box`).join(', ')}`;
    const tallyPartyName = billingType === 'GST' ? customerName : 'Cash';

    const tallyResult = await tallyXmlBuilder.processTallyVoucher({
      company: 'Sri Meenakshi Traders',
      voucherType: 'Sales',
      partyName: tallyPartyName,
      amount: totalAmount,
      itemName: itemSummaries.map(s => `${s.item} (${s.boxes} Box)`).join(' + '),
      quantity: itemSummaries.reduce((acc, curr) => acc + curr.boxes, 0),
      rate: Math.round(totalAmount / (itemSummaries.reduce((acc, curr) => acc + curr.boxes, 0) || 1)),
      narration: narrationText
    });

    const statusTamil = tallyResult.tallySynced
      ? 'Tally Prime-ல் நேரடியாகப் பதிவானது ✅'
      : 'Google Sheets-ல் பத்திரமாகச் சேமிக்கப்பட்டது (Auto-Sync) ⏳';

    return {
      success: true,
      billNumber: billNumber,
      customerName: customerName,
      billingType: billingType,
      gstNumber: gstNo,
      items: itemSummaries,
      totalAmount: totalAmount,
      tallyStatus: statusTamil,
      pickupMessage: 'கவுண்ட்டரில் பில்லிங் வரிசையில் நிற்க வேண்டாம்! இந்த பில் நம்பரைக் காட்டிவிட்டு உடனே சரக்கை லோடு ஏற்றிக்கொள்ளலாம்.'
    };
  }

  if (fnName === 'manageLiveBehaviorRule') {
    const action = args.action;
    const ruleText = args.ruleText;
    const ruleIndex = args.ruleIndex;

    if (action === 'add' && ruleText) {
      adminRules.addRule('meenakshi_traders', ruleText);
      return { success: true, message: `✅ SMT Rule added: "${ruleText}"` };
    }
    if (action === 'list') {
      const rules = adminRules.getRules('meenakshi_traders');
      return { success: true, rules };
    }
    if (action === 'delete' && typeof ruleIndex === 'number') {
      adminRules.deleteRule('meenakshi_traders', ruleIndex);
      return { success: true, message: `✅ SMT Rule at index ${ruleIndex} deleted.` };
    }
    if (action === 'clear') {
      adminRules.clearRules('meenakshi_traders');
      return { success: true, message: `✅ All SMT rules cleared.` };
    }
    return { success: false, message: 'Invalid action or missing parameters.' };
  }

  return { error: `Unknown SMT tool: ${fnName}` };
}

module.exports = {
  SMT_CATALOG: SMT_OIL_CATALOG,
  SMT_CUSTOMERS: loadCustomers(),
  loadCustomers,
  saveCustomer,
  SMT_TOOLS,
  buildSmtSystemPrompt,
  executeSmtToolCall
};
