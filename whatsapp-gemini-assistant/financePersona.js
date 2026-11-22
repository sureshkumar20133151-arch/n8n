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
    },
    {
      name: 'setBankBalance',
      description: 'Update or set the current balance of a bank account (e.g. Indian Bank ₹185.08, Canara Bank ₹10.36, SBI). Use this when Suresh states his current bank balance or wants to set bank balance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          bank_name: { type: 'STRING', description: 'Name of the bank (e.g. "Indian Bank", "Canara Bank", "SBI")' },
          amount: { type: 'NUMBER', description: 'Current available balance in ₹' },
          account_ending: { type: 'STRING', description: 'Last 4 digits or "primary" (default: "primary")' }
        },
        required: ['bank_name', 'amount']
      }
    },
    {
      name: 'setCashBalance',
      description: 'Set or update the physical cash-in-hand balance. Use this when Suresh says "cash on hand 3000 add pannu", "kai la 1500 irukku", or wants to update cash balance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          amount: { type: 'NUMBER', description: 'Total physical cash in hand in ₹' }
        },
        required: ['amount']
      }
    },
    {
      name: 'setMonthlyBudget',
      description: 'Set or update the overall monthly budget. Use this when Suresh says "set my monthly budget 20000", "intha maasam budget 25000 nu mathu".',
      parameters: {
        type: 'OBJECT',
        properties: {
          amount: { type: 'NUMBER', description: 'Total monthly budget in ₹ (e.g. 20000)' }
        },
        required: ['amount']
      }
    },
    {
      name: 'addLent',
      description: 'Record money lent to a friend or relative that they owe to Suresh (receivables / to collect). E.g. "dhilip 1000 and mani 1500 tharanum", "friend ku 2000 கடன் கொடுத்தேன்".',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Friend or person name (e.g. "Dhilip", "Mani")' },
          amount: { type: 'NUMBER', description: 'Amount lent in ₹' },
          note: { type: 'STRING', description: 'Optional reason or note (e.g. "Petrol", "Emergency")' },
          due_date: { type: 'STRING', description: 'Expected return date in YYYY-MM-DD format (optional)' }
        },
        required: ['name', 'amount']
      }
    },
    {
      name: 'settleLent',
      description: 'Mark money previously lent to a friend as returned / received / settled. E.g. "dhilip 1000 thandhutan", "mani returned 1500", "settle dhilip". Automatically marks the entry settled and records income into transactions and balance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Friend name (e.g. "Dhilip", "Mani")' },
          amount: { type: 'NUMBER', description: 'Amount returned in ₹ (optional, defaults to full lent amount)' }
        },
        required: ['name']
      }
    },
    {
      name: 'deleteTransaction',
      description: 'Delete a transaction from the ledger. E.g. "kadaisi transaction delete pannu", "cancel last expense", "remove tea 20".',
      parameters: {
        type: 'OBJECT',
        properties: {
          latest: { type: 'BOOLEAN', description: 'Set to true to delete the most recent transaction' },
          search: { type: 'STRING', description: 'Search term for description to delete' },
          amount: { type: 'NUMBER', description: 'Amount of transaction to delete' }
        }
      }
    },
    {
      name: 'addRecurring',
      description: 'Add a recurring monthly/weekly bill or subscription (e.g. "Netflix 199 monthly add pannu", "EB bill 500 recurring", "Rent 8000").',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Name of the bill or subscription' },
          amount: { type: 'NUMBER', description: 'Amount in ₹' },
          frequency: { type: 'STRING', enum: ['monthly', 'weekly', 'daily'], description: 'Frequency (default "monthly")' },
          category_name: { type: 'STRING', description: 'Category name (optional)' }
        },
        required: ['name', 'amount']
      }
    },
    {
      name: 'deleteRecurring',
      description: 'Delete a recurring bill or subscription by name. E.g. "delete netflix subscription".',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Name of the recurring item to delete' }
        },
        required: ['name']
      }
    },
    {
      name: 'addLoan',
      description: 'Record an EMI or borrowing that Suresh owes (e.g. "Bike loan EMI 3500 add pannu", "personal loan 50000 vangunen").',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Loan or lender name (e.g. "HDFC Bike Loan")' },
          type: { type: 'STRING', enum: ['emi', 'debt'], description: 'Type: "emi" for installment, "debt" for lump sum' },
          principal: { type: 'NUMBER', description: 'Principal amount in ₹' },
          monthly_amount: { type: 'NUMBER', description: 'Monthly EMI installment in ₹' },
          tenure: { type: 'NUMBER', description: 'Tenure in months' },
          interest_rate: { type: 'NUMBER', description: 'Annual interest rate % (optional)' }
        },
        required: ['name']
      }
    },
    {
      name: 'deleteLoan',
      description: 'Delete a loan or EMI entry by name.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Name of the loan to delete' }
        },
        required: ['name']
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
    getLoansAndRecurring: 'get_loans_and_recurring',
    setBankBalance: 'set_bank_balance',
    setCashBalance: 'set_cash_balance',
    setMonthlyBudget: 'set_monthly_budget',
    addLent: 'add_lent',
    settleLent: 'settle_lent',
    deleteTransaction: 'delete_transaction',
    addRecurring: 'add_recurring',
    deleteRecurring: 'delete_recurring',
    addLoan: 'add_loan',
    deleteLoan: 'delete_loan'
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

2. CRITICAL CLARIFICATION RULE FOR DAILY EXPENSES (DO NOT BLINDLY GUESS):
   - Before calling the "addTransaction" tool, you MUST have:
     1) Exact Amount (₹)
     2) Category (Food, Transport, Utilities, Clothes, Coffee, Gym, Entertainment, etc.)
     3) Description / Merchant (e.g. "Swiggy", "Murugan Idli", "Shell Petrol", "Bus ticket")
     4) Payment Mode (upi, cash, card, bank_transfer) - if obvious from GPay screenshot/context, default to 'upi'; if not specified in text/audio, default to 'upi' or ask if ambiguous.
   - If ANY critical information is missing, vague, or the bill photo/audio is unclear:
     👉 POLITELY ASK SURESH IN FRIENDLY TAMIL / TANGLISH to clarify the missing info!
     Example: "அண்ணா, அமவுண்ட் ₹120-னு தெரியுது. இது Food-ஆ அல்லது Transport-ஆ? Cash-ஆ இல்ல GPay-ஆ?"
   - Once all details are clear or confirmed, IMMEDIATELY call "addTransaction".

3. CONTROL & EDIT ALL APP DATA DIRECTLY VIA WHATSAPP (SURESH'S FULL CONTROL):
   Everything that Suresh can configure or edit in the mobile app, he can now command directly through WhatsApp:

   A. BANK ACCOUNT BALANCES:
      - When Suresh says "Now my Indian Bank account balance is 185.08, Canara Bank is 10.36" or "Indian bank balance 5000 nu mathu":
        👉 Call "setBankBalance" for EACH bank mentioned! (bank_name: "Indian Bank", amount: 185.08, etc.)
        DO NOT refuse or say you only add income/savings. Immediately set their balance!

   B. CASH ON HAND:
      - When Suresh says "cash on hand 3000 add pannu", "kai la 1500 irukku", or "update cash to 2000":
        👉 Call "setCashBalance" with amount: 3000!

   C. MONTHLY BUDGET:
      - When Suresh says "set my monthly budget is 20,000", "budget 25000 nu mathu", or "monthly budget 30000":
        👉 Call "setMonthlyBudget" with amount: 20000!

   D. LENT TO FRIENDS (Money Friends Owe Suresh / வர வேண்டிய கடன்):
      - When Suresh says "Friend enkitta dhilip 1000 and mani 1500 tharanum athaium update pannu" or "Dhilip ku 1000 கடன் கொடுத்தேன்":
        👉 Call "addLent" for each person (e.g. name: "Dhilip", amount: 1000; name: "Mani", amount: 1500)!
      - When Suresh says "Dhilip 1000 thandhutan", "Mani kaasu kuduthutan settle pannu", or "Settle Dhilip":
        👉 Call "settleLent" with name: "Dhilip"! This automatically marks the pending loan settled AND adds income into his transaction ledger!

   E. RECURRING BILLS & SUBSCRIPTIONS:
      - When Suresh says "Netflix 199 monthly subscription add pannu", "EB bill 500 recurring", "Rent 8000":
        👉 Call "addRecurring"!
      - When Suresh says "Delete Netflix subscription":
        👉 Call "deleteRecurring"!

   F. LOANS & EMIs (Money Suresh Owes to Bank / Lenders):
      - When Suresh says "Bike loan EMI 3500 add pannu", "Personal loan 50000 vangunen":
        👉 Call "addLoan"!
      - When Suresh says "Delete bike loan":
        👉 Call "deleteLoan"!

   G. DELETE / REVERT TRANSACTIONS:
      - When Suresh says "Kadaisi transaction delete pannu", "Cancel last entry", "Tenth item mistake delete it":
        👉 Call "deleteTransaction" with latest: true!
      - When Suresh says "Delete tea 20" or "Remove swiggy 450":
        👉 Call "deleteTransaction" with search: "tea", amount: 20!

4. REAL-TIME QUERIES:
   - When Suresh asks for balance ("Balance evlo irukku?"): Call "getBalances".
   - When asked for monthly spend / summary ("Intha maasam evlo selavu?", "Monthly report"): Call "getMonthlySummary".
   - When asked about specific category balance ("Food-la evlo irukku?"): Call "listCategories".
   - When asked about recent expenses ("Kadaisiya enna selavu pannom?"): Call "getTransactions".
   - When asked about EMIs, loans or money to collect: Call "getLoansAndRecurring".

5. TONE, STYLE & LANGUAGE:
   - Warm, respectful, proactive personal accountant for Suresh ("அண்ணா / Suresh").
   - Respond in natural spoken Tamil or friendly Tanglish (just like how Madurai / Tamil Nadu people talk on WhatsApp).
   - Format confirmations cleanly with WhatsApp emojis and bullet points:
     ✅ *அப்டேட் செய்யப்பட்டது!*
     ━━━━━━━━━━━━━━━━━━━
     (Show exact updated details nicely).
   - Keep answers crisp, clean, and nicely formatted. Never dump raw code or raw JSON.`;
}

module.exports = {
  FINANCE_TOOLS,
  buildFinanceSystemPrompt,
  executeFinanceToolCall,
  callBudgetTrackerMcp
};
