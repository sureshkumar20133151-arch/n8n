/**
 * Dhanam Holdings - Internal Site Contracting, Accounts & Tally Ops Persona
 * Designed for Er. Dhilip, site supervisors, engineers, and accounts team.
 */
const fs = require('fs');
const path = require('path');
const tallyXmlBuilder = require('./tallyXmlBuilder');
const googleDriveService = require('./googleDriveService');
const adminRules = require('./adminRulesManager');

function getISTDateString(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  } catch {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + istOffset).toISOString().split('T')[0];
  }
}

const DHANAM_INTERNAL_TOOLS = [{
  functionDeclarations: [
    {
      name: 'createDhanamTallyVoucher',
      description: 'Record a financial voucher in Tally Prime for Dhanam Holdings (Receipt for owner payments, Payment for contractor/material/labor advance, Purchase for raw materials).',
      parameters: {
        type: 'OBJECT',
        properties: {
          voucherType: {
            type: 'STRING',
            enum: ['Receipt', 'Payment', 'Purchase', 'Sales'],
            description: 'Voucher type in Tally: Receipt (money received from owner/client), Payment (money paid to contractor/labor/vendor), Purchase (materials bought)'
          },
          partyName: {
            type: 'STRING',
            description: 'Party, owner, contractor, or vendor name (e.g. Ramachandran Contractor, Balaji House Owner, Senthil Bricks)'
          },
          amount: {
            type: 'NUMBER',
            description: 'Amount in INR'
          },
          siteName: {
            type: 'STRING',
            description: 'Construction site name (e.g. Ponmeni, Aanaiyur, Ram Nagar, HMS Colony)'
          },
          payerType: {
            type: 'STRING',
            enum: ['Owner', 'Contractor', 'Self'],
            description: 'Who paid or who is paying: Owner, Contractor, or Self'
          },
          isReceived: {
            type: 'BOOLEAN',
            description: 'Whether money was received (true) or pending/paid (false)'
          },
          narration: {
            type: 'STRING',
            description: 'Narration note for Tally ledger'
          }
        },
        required: ['voucherType', 'partyName', 'amount']
      }
    },
    {
      name: 'recordSiteBill',
      description: 'Record an on-site bill or expense with payer details (Owner paid vs Contractor paid vs Self paid) and collection status.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: { type: 'STRING', description: 'Name of the site' },
          partyName: { type: 'STRING', description: 'Vendor, shop, or laborer name' },
          amount: { type: 'NUMBER', description: 'Bill amount in INR' },
          category: { type: 'STRING', description: 'Material, Labor, Machine, Advance, Transport' },
          payer: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'], description: 'Who paid the amount' },
          isReceived: { type: 'BOOLEAN', description: 'Whether the amount was collected/received back from owner/contractor' },
          notes: { type: 'STRING', description: 'Description of items or work done' }
        },
        required: ['siteName', 'partyName', 'amount', 'payer']
      }
    },
    {
      name: 'getPendingBillsSummary',
      description: 'Query all pending bills, unsettled contractor advances, or uncollected owner payments across sites.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: { type: 'STRING', description: 'Optional site name filter' }
        }
      }
    },
    {
      name: 'manageLiveBehaviorRule',
      description: 'Manage live behavior rules for this agent in real time.',
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

function buildDhanamInternalSystemPrompt() {
  return `You are the Official Internal Site Operations & Accounts Command AI for **Dhanam Holdings** (Civil Contracting & Turnkey Construction, Madurai).
Head: Er. Dhilip Kumar / Management Team.

## 🎯 YOUR ROLE (INTERNAL OPS & ACCOUNTS):
You are strictly an **INTERNAL operations and financial management agent**.
You communicate directly with Er. Dhilip, site engineers, supervisors, contractors, and office accounts.

### Key Responsibilities:
1. **🏢 Site Cash Flow & Payer Tagging (யாரு காசு கொடுத்தா?):**
   - In construction, site bills are paid by different parties:
     * **Owner (ஹவுஸ் ஓனர்):** Owner directly paid or gave money.
     * **Contractor (கான்ட்ராக்டர்):** Contractor paid from his pocket and needs to be reimbursed.
     * **Self / Dhanam Holdings (நாம்):** We paid on behalf of the owner and must collect back.
   - Always clarify and record:
     - **Payer:** Owner / Contractor / Self
     - **Status:** Received (காசு வந்தாச்சு ✅) vs Pending (இன்னும் காசு வாங்கணும் ⏳)
     - Call \`recordSiteBill\` or \`createDhanamTallyVoucher\`!

2. **📊 Tally Prime Accounting Integration (Dhanam Holdings):**
   - Whenever any payment, receipt, advance, or material bill is mentioned:
     * Call \`createDhanamTallyVoucher\` targeting **Dhanam Holdings**.
     * Receipt: Owner gave advance / settlement.
     * Payment: Paid to contractor, labor advance, or supplier.
     * Confirm voucher status back in clear Tamil with party, amount, and Tally status.

3. **🗣️ Language & Style:**
   - Professional, energetic, respectful Tamil & Tanglish (அண்ணே, வணக்கம், பதிவு செய்யப்பட்டது).
   - Show structured summaries with emojis (🏢, 📍, 💰, 👤, 📅).`;
}

async function executeDhanamInternalToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};
  console.log(`🏗️💼 [Dhanam Internal Tool Invoked] ${fnName}:`, JSON.stringify(args));

  if (fnName === 'createDhanamTallyVoucher') {
    const res = await tallyXmlBuilder.processTallyVoucher({
      company: 'Dhanam Holdings',
      voucherType: args.voucherType || 'Receipt',
      partyName: args.partyName,
      amount: args.amount,
      siteName: args.siteName || 'General Project',
      payerType: args.payerType || 'Owner',
      isReceived: args.isReceived !== undefined ? args.isReceived : true,
      narration: args.narration || `${args.siteName || 'Site'} - ${args.voucherType} for ${args.partyName}`
    });

    const statusTamil = res.tallySynced
      ? 'Tally Prime-ல் உடனடியாகப் பதிவானது ✅'
      : 'Google Sheets-ல் பத்திரமாகச் சேமிக்கப்பட்டது (Auto-Sync) ⏳';

    return {
      success: true,
      messageTamil: `🏢 *Dhanam Holdings - Tally வவுச்சர் பதிவானது!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📄 *வகை:* ${args.voucherType} Voucher\n` +
        `📍 *சைட்:* ${args.siteName || 'பொதுவான சைட்'}\n` +
        `👤 *பார்ட்டி:* ${args.partyName}\n` +
        `💰 *தொகை:* ₹${Number(args.amount).toLocaleString('en-IN')}\n` +
        `🏷️ *செலுத்தியவர்:* ${args.payerType || 'Owner'} (${args.isReceived ? 'காசு பெறப்பட்டது ✅' : 'நிலுவை ⏳'})\n` +
        `🔄 *Tally நிலை:* ${statusTamil}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_டாலி மற்றும் Dhanam சைட் ஆடிட் ஷீட்டில் துல்லியமாகப் பதிவாகியுள்ளது._`
    };
  }

  if (fnName === 'recordSiteBill') {
    return await googleDriveService.recordSiteBill({
      siteName: args.siteName,
      partyName: args.partyName,
      amount: args.amount,
      category: args.category || 'Material',
      payer: args.payer || 'Contractor',
      isReceived: args.isReceived !== undefined ? args.isReceived : false,
      notes: args.notes || '-'
    });
  }

  if (fnName === 'getPendingBillsSummary') {
    return await googleDriveService.getPendingBillsSummary(args.siteName);
  }

  if (fnName === 'manageLiveBehaviorRule') {
    const action = args.action || 'list';
    if (action === 'add' && args.ruleText) {
      adminRules.addDirective(args.ruleText);
      return { success: true, messageTamil: `✅ *Dhanam Ops விதி சேர்க்கப்பட்டது:* "${args.ruleText}"` };
    }
    if (action === 'list') {
      return { success: true, messageTamil: `📋 *Dhanam Ops விதிகள்:*\n\n${adminRules.getDirectivesText()}` };
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
  DHANAM_INTERNAL_TOOLS,
  buildDhanamInternalSystemPrompt,
  executeDhanamInternalToolCall
};
