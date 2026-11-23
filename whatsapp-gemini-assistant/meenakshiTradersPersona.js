/**
 * Sri Meenakshi Traders (SMT) - Electrical, Plumbing & Hardware Trading Persona
 * Handles wholesale/retail counter sales, contractor orders, pricing, and Tally Prime invoicing.
 */
const fs = require('fs');
const path = require('path');
const tallyXmlBuilder = require('./tallyXmlBuilder');
const adminRules = require('./adminRulesManager');

const SMT_CATALOG = {
  pipes: [
    { name: '1-inch CPVC Pipe (SDR 11 - 3m)', brand: 'Ashirvad / Supreme', retailPrice: 210, wholesalePrice: 180, unit: 'Nos' },
    { name: '3/4-inch CPVC Pipe (SDR 11 - 3m)', brand: 'Ashirvad / Supreme', retailPrice: 165, wholesalePrice: 140, unit: 'Nos' },
    { name: '1/2-inch CPVC Pipe (SDR 11 - 3m)', brand: 'Ashirvad / Supreme', retailPrice: 120, wholesalePrice: 95, unit: 'Nos' },
    { name: '4-inch PVC Sewage Pipe (4kg - 3m)', brand: 'Finolex / Supreme', retailPrice: 480, wholesalePrice: 410, unit: 'Nos' },
    { name: '2.5-inch PVC Waste Pipe (3m)', brand: 'Finolex / Supreme', retailPrice: 280, wholesalePrice: 240, unit: 'Nos' }
  ],
  wires: [
    { name: '1.0 sqmm FR Wire (90m Box)', brand: 'Finolex / Polycab', retailPrice: 1150, wholesalePrice: 980, unit: 'Box' },
    { name: '1.5 sqmm FR Wire (90m Box)', brand: 'Finolex / Polycab', retailPrice: 1750, wholesalePrice: 1520, unit: 'Box' },
    { name: '2.5 sqmm FR Wire (90m Box)', brand: 'Finolex / Polycab', retailPrice: 2850, wholesalePrice: 2490, unit: 'Box' },
    { name: '4.0 sqmm FR Wire (90m Box)', brand: 'Finolex / Polycab', retailPrice: 4200, wholesalePrice: 3750, unit: 'Box' }
  ],
  fittings: [
    { name: '1-inch CPVC Brass Elbow', brand: 'Ashirvad', retailPrice: 85, wholesalePrice: 68, unit: 'Nos' },
    { name: '3/4-inch CPVC Brass Tee', brand: 'Ashirvad', retailPrice: 95, wholesalePrice: 76, unit: 'Nos' },
    { name: 'Concealed Stop Cock (Heavy)', brand: 'Watertec / Jaquar', retailPrice: 450, wholesalePrice: 360, unit: 'Nos' },
    { name: 'Wall Mixer Body (L-bend)', brand: 'Essco / Jaquar', retailPrice: 2400, wholesalePrice: 1950, unit: 'Nos' }
  ]
};

const SMT_TOOLS = [{
  functionDeclarations: [
    {
      name: 'createSmtTallyVoucher',
      description: 'Create a Sales invoice, Purchase bill, or Payment Receipt in Tally Prime for Sri Meenakshi Traders.',
      parameters: {
        type: 'OBJECT',
        properties: {
          voucherType: {
            type: 'STRING',
            enum: ['Sales', 'Purchase', 'Receipt', 'Payment'],
            description: 'Voucher type in Tally: Sales (selling goods to customer/contractor), Purchase (stock purchase), Receipt (customer payment received)'
          },
          partyName: {
            type: 'STRING',
            description: 'Customer, contractor, or supplier name (e.g. Balaji Contractor, Muthu Electricals, Cash Customer)'
          },
          itemName: {
            type: 'STRING',
            description: 'Material / item name (e.g. 1-inch CPVC pipe, 2.5 sqmm wire)'
          },
          quantity: {
            type: 'NUMBER',
            description: 'Quantity'
          },
          unit: {
            type: 'STRING',
            description: 'Unit (Nos, Box, Bundle, Kg)'
          },
          rate: {
            type: 'NUMBER',
            description: 'Price per unit in INR'
          },
          amount: {
            type: 'NUMBER',
            description: 'Total amount in INR (if not provided, calculated as quantity * rate)'
          },
          narration: {
            type: 'STRING',
            description: 'Invoice remarks / notes'
          }
        },
        required: ['voucherType', 'partyName']
      }
    },
    {
      name: 'querySmtCatalog',
      description: 'Check item prices, available brands, and wholesale/retail rates for electrical and plumbing materials.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Item name or category (e.g. CPVC pipe, 2.5 wire, elbow)' }
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

function buildSmtSystemPrompt() {
  return `You are the Official WhatsApp AI Sales Counter & Invoicing Assistant for **Sri Meenakshi Traders (SMT)**.
Specialized in wholesale & retail sales of Electrical, Plumbing, Sanitaryware & Hardware materials.

## 🎯 YOUR ROLE & RESPONSIBILITIES:
1. **🏪 Instant Sales Billing (வாட்ஸ்அப்பில் சொன்னதும் பில்):**
   - When a contractor, customer, or electrician asks for a bill (e.g. "பாலாஜிக்கு 1-inch CPVC பைப் 10 பீஸ் 180 ரூபாய்க்கு பில் போடு"):
     * Extract: Party Name, Item Name, Quantity, Rate, calculate Total.
     * Call \`createSmtTallyVoucher\` with \`voucherType: "Sales"\` targeting **Sri Meenakshi Traders**.
     * Return a clean, professional invoice summary with item breakdown, rate, and Tally status.

2. **📦 Pricing & Product Inquiries:**
   - Always quote wholesale rates for contractors buying in bulk (boxes/bundles) and retail rates for single pieces.
   - Mention top trusted brands (Ashirvad, Supreme, Finolex, Polycab, Watertec).

3. **💰 Payment Receipts & Ledger:**
   - When payment is received from a customer (Cash, GPay, Bank transfer), call \`createSmtTallyVoucher\` with \`voucherType: "Receipt"\`.

4. **🗣️ Language:**
   - Warm, energetic, business-friendly Tamil & Tanglish (வணக்கம் அண்ணே, பில் போட்டாச்சு, பொருள் ரெடியா இருக்கு).`;
}

async function executeSmtToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};
  console.log(`🏪⚡ [SMT Tool Invoked] ${fnName}:`, JSON.stringify(args));

  if (fnName === 'createSmtTallyVoucher') {
    const qty = Number(args.quantity) || 1;
    const rate = Number(args.rate) || 0;
    const total = Number(args.amount) || (qty * rate);

    const res = await tallyXmlBuilder.processTallyVoucher({
      company: 'Sri Meenakshi Traders',
      voucherType: args.voucherType || 'Sales',
      partyName: args.partyName,
      amount: total,
      itemName: args.itemName || 'Materials',
      quantity: qty,
      rate: rate || (total / qty),
      narration: args.narration || `SMT Sales to ${args.partyName} via WhatsApp`
    });

    const statusTamil = res.tallySynced
      ? 'Tally Prime-ல் உடனடியாகப் பதிவானது ✅'
      : 'Google Sheets-ல் பத்திரமாகச் சேமிக்கப்பட்டது (Auto-Sync) ⏳';

    return {
      success: true,
      messageTamil: `🏪 *Sri Meenakshi Traders (SMT) - Tally பில் பதிவானது!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📄 *வகை:* ${args.voucherType} Voucher\n` +
        `👤 *பார்ட்டி:* ${args.partyName}\n` +
        (args.itemName ? `📦 *பொருள்:* ${args.itemName} (${qty} ${args.unit || 'Nos'} @ ₹${rate.toLocaleString('en-IN')})\n` : '') +
        `💰 *மொத்தத் தொகை:* ₹${total.toLocaleString('en-IN')}\n` +
        `🔄 *Tally நிலை:* ${statusTamil}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_டாலி மற்றும் SMT விற்பனைப் பதிவேட்டில் துல்லியமாகப் பதிவாகியுள்ளது._`
    };
  }

  if (fnName === 'querySmtCatalog') {
    return {
      success: true,
      catalog: SMT_CATALOG
    };
  }

  if (fnName === 'manageLiveBehaviorRule') {
    const action = args.action || 'list';
    if (action === 'add' && args.ruleText) {
      adminRules.addDirective(args.ruleText);
      return { success: true, messageTamil: `✅ *SMT விதி சேர்க்கப்பட்டது:* "${args.ruleText}"` };
    }
    if (action === 'list') {
      return { success: true, messageTamil: `📋 *SMT நேரலை விதிகள்:*\n\n${adminRules.getDirectivesText()}` };
    }
    if (action === 'delete') {
      adminRules.removeDirective(Number(args.ruleIndex));
      return { success: true, messageTamil: `✅ விதி #${args.ruleIndex} நீக்கப்பட்டது.` };
    }
    if (action === 'clear') {
      adminRules.clearDirectives();
      return { success: true, messageTamil: `✅ அனைத்து விதிகளும் நீக்கப்பட்டன.` };
    }
  }

  return { error: `Unknown tool: ${fnName}` };
}

module.exports = {
  SMT_TOOLS,
  buildSmtSystemPrompt,
  executeSmtToolCall
};
