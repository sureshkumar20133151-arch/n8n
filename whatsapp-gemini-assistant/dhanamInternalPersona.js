/**
 * Dhanam Holdings - Internal Site Contracting, Accounts & Multi-System Voice CRUD Persona
 * Connects: Arattai, Zoho Books, Tally Prime, Slack, and Onsite Operations.
 * Designed for Er. Dhilip, site supervisors, engineers, and accounts team.
 */
const tallyXmlBuilder = require('./tallyXmlBuilder');
const googleDriveService = require('./googleDriveService');
const adminRules = require('./adminRulesManager');
const zohoBooksService = require('./zohoBooksService');
const slackService = require('./slackService');
const arattaiService = require('./arattaiService');
const onsiteOpsService = require('./onsiteOpsService');
const excelService = require('./excelService');

const DHANAM_INTERNAL_TOOLS = [{
  functionDeclarations: [
    {
      name: 'tallyCrud',
      description: 'Perform Create, Read, Update, or Delete (CRUD) operations on Tally Prime vouchers for Dhanam Holdings.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation to perform' },
          voucherId: { type: 'STRING', description: 'Voucher ID (e.g. TLY-...) for read/update/delete' },
          voucherType: { type: 'STRING', enum: ['Receipt', 'Payment', 'Purchase', 'Sales'], description: 'Voucher type in Tally' },
          partyName: { type: 'STRING', description: 'Party, owner, contractor, or vendor name' },
          amount: { type: 'NUMBER', description: 'Amount in INR' },
          siteName: { type: 'STRING', description: 'Construction site name (e.g. Ponmeni, Aanaiyur, Ram Nagar)' },
          payerType: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'], description: 'Who paid: Owner, Contractor, or Self' },
          isReceived: { type: 'BOOLEAN', description: 'Whether money was received (true) or pending/paid (false)' },
          narration: { type: 'STRING', description: 'Narration note for Tally ledger' }
        },
        required: ['operation']
      }
    },
    {
      name: 'onsiteCrud',
      description: 'Perform Create, Read, Update, or Delete (CRUD) operations on Onsite bills, material/labor expenses, and collection status.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation' },
          recordId: { type: 'STRING', description: 'Site record ID (e.g. SITE-...) for update/delete/read' },
          siteName: { type: 'STRING', description: 'Construction site name' },
          partyName: { type: 'STRING', description: 'Vendor, shop, contractor, or laborer name' },
          amount: { type: 'NUMBER', description: 'Amount in INR' },
          category: { type: 'STRING', description: 'Material, Labor, Machine, Advance, Transport' },
          payer: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'], description: 'Who paid the amount' },
          isReceived: { type: 'BOOLEAN', description: 'Whether the amount was collected/received' },
          status: { type: 'STRING', description: 'Status e.g. Received or Pending Collection' },
          notes: { type: 'STRING', description: 'Description of items or work done' }
        },
        required: ['operation']
      }
    },
    {
      name: 'zohoBooksCrud',
      description: 'Perform Create, Read, Update, or Delete (CRUD) operations in Zoho Books (invoices, bills, expenses, payments, contacts, and team users/invites).',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation' },
          entity: { type: 'STRING', enum: ['invoice', 'bill', 'expense', 'payment', 'contact', 'user'], description: 'Zoho Books entity type (use "user" to invite/manage team users by email)' },
          recordId: { type: 'STRING', description: 'Zoho Books record ID (required for update/delete or single read)' },
          data: {
            type: 'OBJECT',
            description: 'Payload fields for create/update (e.g. amount, vendor_name, customer_name, description, date, name, email, user_role)'
          },
          searchText: { type: 'STRING', description: 'Optional search filter when reading/listing records' }
        },
        required: ['operation', 'entity']
      }
    },
    {
      name: 'slackCrud',
      description: 'Perform Create (post), Read (history), Update (edit), or Delete on Slack channel messages for Dhanam Holdings team.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation on Slack messages' },
          channel: { type: 'STRING', description: 'Optional Slack channel ID (defaults to SLACK_DEFAULT_CHANNEL)' },
          text: { type: 'STRING', description: 'Message text to post or update' },
          messageTs: { type: 'STRING', description: 'Slack message timestamp (ts) required for update/delete' },
          limit: { type: 'NUMBER', description: 'Max messages to fetch on read' }
        },
        required: ['operation']
      }
    },
    {
      name: 'arattaiCrud',
      description: 'Perform Create (send), Read (list), Update (edit), or Delete on Zoho Arattai team channel messages.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation on Arattai messages' },
          channelId: { type: 'STRING', description: 'Optional Arattai channel ID' },
          messageId: { type: 'STRING', description: 'Arattai message ID (e.g. AR-...) required for update/delete' },
          text: { type: 'STRING', description: 'Message text to send or update' },
          limit: { type: 'NUMBER', description: 'Max messages to fetch on read' }
        },
        required: ['operation']
      }
    },
    {
      name: 'excelCrud',
      description: 'Perform Create, Read, Update, or Delete (CRUD) operations on the local Microsoft Excel (.xlsx) workbook for Dhanam Holdings.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD operation on Excel rows' },
          sheetName: { type: 'STRING', description: 'Excel sheet tab name (default: Site_Expenses)' },
          recordId: { type: 'STRING', description: 'Excel row ID (e.g. XLS-...) for read/update/delete' },
          siteName: { type: 'STRING', description: 'Construction site name' },
          partyName: { type: 'STRING', description: 'Vendor, shop, contractor, or party name' },
          amount: { type: 'NUMBER', description: 'Amount in INR' },
          category: { type: 'STRING', description: 'Material, Labor, Machine, Advance, Transport' },
          payer: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'], description: 'Who paid' },
          status: { type: 'STRING', description: 'Received or Pending' },
          isReceived: { type: 'BOOLEAN', description: 'Whether amount is received' },
          notes: { type: 'STRING', description: 'Notes or item details' }
        },
        required: ['operation']
      }
    },
    {
      name: 'createDhanamTallyVoucher',
      description: 'Quick-create a Tally Prime financial voucher for Dhanam Holdings.',
      parameters: {
        type: 'OBJECT',
        properties: {
          voucherType: { type: 'STRING', enum: ['Receipt', 'Payment', 'Purchase', 'Sales'] },
          partyName: { type: 'STRING' },
          amount: { type: 'NUMBER' },
          siteName: { type: 'STRING' },
          payerType: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'] },
          isReceived: { type: 'BOOLEAN' },
          narration: { type: 'STRING' }
        },
        required: ['voucherType', 'partyName', 'amount']
      }
    },
    {
      name: 'recordSiteBill',
      description: 'Quick-record an onsite bill or expense.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: { type: 'STRING' },
          partyName: { type: 'STRING' },
          amount: { type: 'NUMBER' },
          category: { type: 'STRING' },
          payer: { type: 'STRING', enum: ['Owner', 'Contractor', 'Self'] },
          isReceived: { type: 'BOOLEAN' },
          notes: { type: 'STRING' }
        },
        required: ['siteName', 'partyName', 'amount', 'payer']
      }
    },
    {
      name: 'getPendingBillsSummary',
      description: 'Query all pending bills across sites.',
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

## 🎯 YOUR ROLE (VOICE-FIRST MULTI-SYSTEM CRUD AGENT):
You are strictly an **INTERNAL operations and financial command agent** for **Er. Dhilip, internal office staff, and site supervisors** (all execution work is outsourced to contractors).
You receive **voice notes, text, and bill/site photos from internal office staff & supervisors** and perform full **CRUD (Create, Read, Update, Delete)** across **6 live systems**:
1. **Tally Prime** (\`tallyCrud\`) — Receipt, Payment, Purchase, Sales vouchers.
2. **Zoho Books** (\`zohoBooksCrud\`) — Invoices, Bills, Expenses, Payments, Contacts.
3. **Onsite Operations** (\`onsiteCrud\`) — Site bills, material/labor expenses, pending collections.
4. **Slack** (\`slackCrud\`) — Team channel updates, read history, edit/delete posts.
5. **Zoho Arattai** (\`arattaiCrud\`) — Site team messages, read/update/delete channel logs.
6. **Local Excel (.xlsx)** (\`excelCrud\`) — Local Microsoft Excel workbook (\`Dhanam_Holdings_Master.xlsx\`) rows Create/Read/Update/Delete.

### Voice & Command Execution Rules:
- When the user speaks in Tamil, Tanglish, or English (voice note or text), **identify the target system(s) and CRUD operation immediately** and call the matching tool(s) without asking unnecessary confirmation questions.
- If a single command spans multiple systems (e.g. *"Ponmeni site cement bill 15,000 Tally-லயும் Zoho Books-லயும் போட்டு Slack, Arattai-ல அப்டேட் பண்ணு"*), call **all** relevant tools in parallel/sequence!
- **Payer Tagging (யாரு காசு கொடுத்தா?):**
  * **Owner (ஹவுஸ் ஓனர்)** | **Contractor (கான்ட்ராக்டர்)** | **Self / Dhanam Holdings (நாம்)**
  * **Status:** Received (காசு வந்தாச்சு ✅) vs Pending (இன்னும் காசு வாங்கணும் ⏳)
- If a system returns \`needsConfig: true\`, clearly inform the user which \`.env\` keys are needed while still completing the other connected systems.
- **Email Invite Rule:** If someone drops an email ID in the chat/group to add or invite a person (e.g. *"add dhilip@gmail.com"* or *"invite ..."*), immediately call \`zohoBooksCrud\` with \`operation: "create"\`, \`entity: "user"\`, \`data: { name: "<Name or email prefix>", email: "<email>", user_role: "staff" }\` (or \`entity: "contact"\` if they specifically asked for a vendor/customer contact).

### 🗣️ Language & Style:
- Crisp, respectful Tamil & Tanglish (அண்ணே, வணக்கம், பதிவு செய்யப்பட்டது).
- Return structured multi-system confirmation with emojis (🏢, 📊, 📒, 💬, 🟣, 📍, 💰).`;
}

async function executeDhanamInternalToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};
  console.log(`🏗️💼 [Dhanam Internal Tool Invoked] ${fnName}:`, JSON.stringify(args));

  if (fnName === 'tallyCrud') {
    return await tallyXmlBuilder.executeTallyCrud({
      operation: args.operation,
      voucherId: args.voucherId,
      company: 'Dhanam Holdings',
      voucherType: args.voucherType || 'Receipt',
      partyName: args.partyName || '',
      amount: args.amount,
      siteName: args.siteName || '',
      payerType: args.payerType || 'Owner',
      isReceived: args.isReceived,
      narration: args.narration || ''
    });
  }

  if (fnName === 'onsiteCrud') {
    return await onsiteOpsService.executeCrud({
      operation: args.operation,
      recordId: args.recordId,
      siteName: args.siteName,
      partyName: args.partyName,
      amount: args.amount,
      category: args.category,
      payer: args.payer,
      isReceived: args.isReceived,
      status: args.status,
      notes: args.notes
    });
  }

  if (fnName === 'zohoBooksCrud') {
    return await zohoBooksService.executeCrud({
      operation: args.operation,
      entity: args.entity || 'expense',
      recordId: args.recordId,
      data: args.data || {},
      filters: args.searchText ? { search_text: args.searchText } : {}
    });
  }

  if (fnName === 'slackCrud') {
    return await slackService.executeCrud({
      operation: args.operation,
      channel: args.channel,
      text: args.text,
      messageTs: args.messageTs,
      limit: args.limit
    });
  }

  if (fnName === 'arattaiCrud') {
    return await arattaiService.executeCrud({
      operation: args.operation,
      channelId: args.channelId,
      messageId: args.messageId,
      text: args.text,
      limit: args.limit
    });
  }

  if (fnName === 'excelCrud') {
    return await excelService.executeCrud({
      operation: args.operation,
      sheetName: args.sheetName || 'Site_Expenses',
      recordId: args.recordId,
      siteName: args.siteName,
      partyName: args.partyName,
      amount: args.amount,
      category: args.category,
      payer: args.payer,
      status: args.status,
      isReceived: args.isReceived,
      notes: args.notes
    });
  }

  if (fnName === 'createDhanamTallyVoucher') {
    const res = await tallyXmlBuilder.executeTallyCrud({
      operation: 'create',
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
      : 'Local Ledger & Google Sheets-ல் பத்திரமாகச் சேமிக்கப்பட்டது ⏳';

    return {
      success: true,
      record: res.record,
      messageTamil: `🏢 *Dhanam Holdings - Tally வவுச்சர் பதிவானது!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *ID:* ${res.record?.id || '-'}\n` +
        `📄 *வகை:* ${args.voucherType} Voucher\n` +
        `📍 *சைட்:* ${args.siteName || 'பொதுவான சைட்'}\n` +
        `👤 *பார்ட்டி:* ${args.partyName}\n` +
        `💰 *தொகை:* ₹${Number(args.amount).toLocaleString('en-IN')}\n` +
        `🏷️ *செலுத்தியவர்:* ${args.payerType || 'Owner'} (${args.isReceived ? 'காசு பெறப்பட்டது ✅' : 'நிலுவை ⏳'})\n` +
        `🔄 *Tally நிலை:* ${statusTamil}`
    };
  }

  if (fnName === 'recordSiteBill') {
    return await onsiteOpsService.executeCrud({
      operation: 'create',
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
    const local = await onsiteOpsService.executeCrud({
      operation: 'read',
      siteName: args.siteName,
      status: 'Pending'
    });
    let sheetSummary = null;
    try {
      sheetSummary = await googleDriveService.getPendingBillsSummary(args.siteName);
    } catch (e) { /* safe fallback */ }
    return { success: true, onsitePending: local, sheetSummary };
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
