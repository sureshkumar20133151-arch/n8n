/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Personal Finance & Budget Tracker Persona for WhatsApp Gemini Assistant
 *  Connects seamlessly via MCP (Model Context Protocol) to Budget Tracker Pro
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MCP_ENDPOINT = process.env.BUDGET_TRACKER_MCP_URL || 'https://personal-finance-app-mauve.vercel.app/api/mcp?uid=mlbLQkDo0Ef95hns8p8iTkQdUK83';
const MCP_API_KEY = process.env.BUDGET_TRACKER_MCP_KEY || 'e6318d93-0d54-4230-b16a-500dd23129db';

// ─── Gemini Tool Definitions ─────────────────────────────────────────────────
const FINANCE_TOOLS = [{
  functionDeclarations: [
    {
      name: 'addTransaction',
      description: 'Call this tool to record an expense, income, savings, or debt entry into Budget Tracker. All required parameters (amount, type, description, category_name) MUST be present. If any required information is missing or unclear from the user\'s message, voice note, or bill photo, DO NOT guess — ask the user first.',
      parameters: {
        type: 'OBJECT',
        properties: {
          type: {
            type: 'STRING',
            enum: ['income', 'expense', 'savings', 'debt'],
            description: 'Transaction type. Default is expense for spending.'
          },
          amount: {
            type: 'NUMBER',
            description: 'Amount in Indian Rupees (₹). Must be positive.'
          },
          description: {
            type: 'STRING',
            description: 'Clear description of the transaction (e.g. "Tea & snacks at Murugan Idli", "Petrol for bike", "Canara Bank salary credit", "Swiggy dinner").'
          },
          category_name: {
            type: 'STRING',
            description: 'Budget category. Matches: Food, Transport, Utilities, Clothes, Coffee, Beauty, Entertainment, Gym, Salary, Freelance, or create new.'
          },
          payment_mode: {
            type: 'STRING',
            enum: ['upi', 'cash', 'card', 'bank_transfer', 'other'],
            description: 'Payment method used (e.g. upi for Google Pay/PhonePe, cash for physical currency, card for debit/credit).'
          },
          date: {
            type: 'STRING',
            description: 'Transaction date in YYYY-MM-DD format. Defaults to today.'
          }
        },
        required: ['type', 'amount', 'description', 'category_name']
      }
    },
    {
      name: 'getBalances',
      description: 'Fetch the real-time financial snapshot: total balance, bank accounts, cash wallet, monthly budget, and total spent so far this month.',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'getMonthlySummary',
      description: 'Fetch complete monthly financial breakdown: total income, total expenses, savings, net surplus/deficit, top spending categories, and budget health.',
      parameters: {
        type: 'OBJECT',
        properties: {
          month: { type: 'INTEGER', description: 'Month (1-12). Defaults to current month.' },
          year: { type: 'INTEGER', description: 'Year (e.g. 2026). Defaults to current year.' }
        }
      }
    },
    {
      name: 'getTransactions',
      description: 'Search, filter, and inspect recent transaction records from the ledger.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limit: { type: 'INTEGER', description: 'Max items to return (default 10, max 50)' },
          type: { type: 'STRING', enum: ['income', 'expense', 'savings', 'debt'], description: 'Filter by transaction type' },
          category: { type: 'STRING', description: 'Filter by category name' },
          search: { type: 'STRING', description: 'Keyword search in transaction description' },
          from_date: { type: 'STRING', description: 'Start date filter YYYY-MM-DD' },
          to_date: { type: 'STRING', description: 'End date filter YYYY-MM-DD' }
        }
      }
    },
    {
      name: 'listCategories',
      description: 'List all budget categories with their monthly budget limit, spent amount so far, and remaining balance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['income', 'expense', 'savings', 'debt'], description: 'Filter by category type' }
        }
      }
    },
    {
      name: 'getLoansAndRecurring',
      description: 'Fetch active loans, upcoming EMIs, and recurring monthly subscriptions/bills.',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    }
  ]
}];

// ─── Direct MCP Remote Dispatcher ────────────────────────────────────────────
async function callBudgetTrackerMcp(toolName, args = {}, targetUid = null, attempt = 1) {
  try {
    let endpoint = MCP_ENDPOINT;
    if (targetUid) {
      endpoint = `https://personal-finance-app-mauve.vercel.app/api/mcp?uid=${encodeURIComponent(targetUid)}`;
    }

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MCP_API_KEY
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ [MCP Call Error] HTTP ${res.status}: ${errText}`);
      return {
        status: 'error',
        error: `MCP Server returned HTTP ${res.status}: ${errText}`
      };
    }

    const data = await res.json();
    if (data.error) {
      console.error(`❌ [MCP RPC Error]:`, data.error);
      return {
        status: 'error',
        error: data.error.message || JSON.stringify(data.error)
      };
    }

    const content = data.result?.content?.[0]?.text || JSON.stringify(data.result);
    return {
      status: 'success',
      data: content
    };
  } catch (error) {
    if (attempt < 2) {
      console.warn(`⚠️ [MCP Network Retry] Attempt ${attempt} failed (${error.message}). Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
      return callBudgetTrackerMcp(toolName, args, targetUid, attempt + 1);
    }
    console.error(`❌ [MCP Network Exception]:`, error.message);
    return {
      status: 'error',
      error: `Network failure connecting to Budget Tracker MCP: ${error.message}`
    };
  }
}

// ─── Execute Tool Calls ──────────────────────────────────────────────────────
async function executeFinanceToolCall(fnCall, chatId, targetUid = null) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  console.log(`💰 [Finance Persona] Executing tool: ${fnName} with args:`, JSON.stringify(args), targetUid ? `for user: ${targetUid}` : '');

  // Map Gemini tool names to MCP tool names
  const toolMapping = {
    addTransaction: 'add_transaction',
    getBalances: 'get_balances',
    getMonthlySummary: 'get_monthly_summary',
    getTransactions: 'get_transactions',
    listCategories: 'list_categories',
    getLoansAndRecurring: 'get_loans_and_recurring'
  };

  const mcpName = toolMapping[fnName] || fnName;
  const result = await callBudgetTrackerMcp(mcpName, args, targetUid);
  return result;
}

// ─── System Prompt ───────────────────────────────────────────────────────────
function buildFinanceSystemPrompt() {
  const todayStr = new Date().toISOString().split('T')[0];

  return `You are "Budget Tracker Pro WhatsApp AI Assistant", the ultra-smart, friendly, proactive personal finance manager for Suresh.
You are directly connected to Suresh's live Budget Tracker Pro application and Firebase Database via MCP (Model Context Protocol).

TODAY'S DATE: ${todayStr}

PRIMARY ROLE & RESPONSIBILITIES:
1. TRACK EXPENSES & INCOME FROM ANY FORMAT:
   - Voice Notes (WhatsApp Audio): Listen attentively to what Suresh says in spoken Tamil, Tanglish, or English.
   - Screenshots: Inspect Google Pay / PhonePe / Paytm / Bank payment confirmation screens.
   - Bill / Receipt Photos: Extract store/restaurant name, item details, bill total, and date.
   - Text Messages: E.g., "Tea ₹20 cash", "petrol 500 gpay", "Swiggy dinner 450", "received freelance 15000".

2. CRITICAL CLARIFICATION RULE (DO NOT BLINDLY GUESS):
   - Before calling the "addTransaction" tool, you MUST have:
     1) Exact Amount (₹)
     2) Category (Food, Transport, Utilities, Clothes, Coffee, Gym, Entertainment, etc.)
     3) Description / Merchant (e.g. "Swiggy", "Murugan Idli", "Shell Petrol", "Bus ticket")
     4) Payment Mode (upi, cash, card, bank_transfer) - if obvious from GPay screenshot/context, default to 'upi'; if not specified in text/audio, default to 'upi' or ask if ambiguous.
   - If ANY critical information is missing, vague, or the bill photo/audio is unclear:
     👉 POLITELY ASK SURESH IN FRIENDLY TAMIL / TANGLISH to clarify the missing info!
     Example: "அண்ணா, அமவுண்ட் ₹120-னு தெரியுது. இது Food-ஆ அல்லது Transport-ஆ? Cash-ஆ இல்ல GPay-ஆ?"
   - Once all details are clear or confirmed, IMMEDIATELY call "addTransaction".

3. KNOWN BUDGET CATEGORIES (Match to these when possible):
   - Food (Monthly Budget: ₹7,000) -> Breakfast, Lunch, Dinner, Groceries, Hotel, Swiggy, Zomato, Snacks.
   - Coffee (Monthly Budget: ₹50) -> Tea, Coffee, Bakery tea shop.
   - Transport (Monthly Budget: ₹200) -> Petrol, Diesel, Auto, Rapido, Uber, Bus, Train, Toll.
   - Utilities (Monthly Budget: ₹150) -> EB bill, Mobile recharge, Wifi, Water, Gas cylinder.
   - Clothes (Monthly Budget: ₹100) -> Clothing, Shoes, Accessories.
   - Entertainment (Monthly Budget: ₹100) -> Movies, OTT, Outing, Gaming.
   - Gym (Monthly Budget: ₹1,500) -> Fitness, Gym fees, Supplements, Sports.
   - Beauty -> Salon, Grooming, Haircut.
   - Other custom categories or new ones can be assigned as appropriate.

4. REAL-TIME QUERIES:
   - When Suresh asks for balance ("Balance evlo irukku?"): Call "getBalances".
   - When asked for monthly spend / summary ("Intha maasam evlo selavu?", "Monthly report"): Call "getMonthlySummary".
   - When asked about specific category balance ("Food-la evlo irukku?"): Call "listCategories".
   - When asked about recent expenses ("Kadaisiya enna selavu pannom?"): Call "getTransactions".
   - When asked about EMIs or recurring bills: Call "getLoansAndRecurring".

5. TONE, STYLE & LANGUAGE:
   - Warm, respectful, proactive personal accountant for Suresh ("அண்ணா / Suresh").
   - Respond in natural spoken Tamil or friendly Tanglish (just like how Madurai / Tamil Nadu people talk on WhatsApp).
   - After successfully adding a transaction, format the response cleanly with WhatsApp emojis and bullet points:
     ✅ *செலவு பதிவு செய்யப்பட்டது!*
     ━━━━━━━━━━━━━━━━━━━
     💵 *Amount:* ₹[amount]
     🏷️ *Category:* [category]
     📝 *Note:* [description]
     💳 *Payment Mode:* [UPI / Cash / Card]
     📅 *Date:* [date]

     (Add a 1-line helpful note on remaining budget if available).
   - Keep answers crisp, clean, and nicely formatted. Never dump raw code or raw JSON.`;
}

module.exports = {
  FINANCE_TOOLS,
  buildFinanceSystemPrompt,
  executeFinanceToolCall,
  callBudgetTrackerMcp
};
