/**
 * SoloDeveloper.pro - Personal Assistant Backend & Internal Operations Engine
 * Dedicated PA for Suresh Kumar (+91 93615 99097 / 8072239594 / 7871762490):
 * - Todoist Sync + Local Fallback Tasks & Reminders CRUD
 * - `solo dev lead gen` Google Sheet (Prospects tab) Reader, Updater & Batch Outreach (5 / 10 / N leads)
 * - n8n Cloud Workflow Activate / Pause / Status Controller
 * - Client Projects Tracker (Starter ₹9,999 / Pro ₹24,999 / Enterprise ₹49,999 / Care ₹1,999)
 * - Customer Payment Invoices & Automated WhatsApp Payment Reminders
 * - Voice/Text Notes & Daily Executive Briefing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const adminRules = require('./adminRulesManager');
const googleDriveService = require('./googleDriveService');
const { generateOutreachScript, generateFollowUpMessage } = require('./outreachEngine');

const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'solodev_pa_store.json');

const LEAD_GEN_SPREADSHEET_ID = process.env.SOLODEV_LEAD_GEN_SHEET_ID || '1dQF6zWA3NrOt21gRQnDcCR6eKsGFZCvz3WEx80uLdrw';
const LEAD_GEN_TAB = process.env.SOLODEV_LEAD_GEN_TAB || 'Prospects';
const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://suresh-n8n-fhr6.onrender.com').replace(/\/+$/, '');

const AUTHORIZED_PA_PHONES = new Set(['9361599097', '8072239594', '7871762490']);

// Injected at runtime from index.js so PA can send WhatsApp messages directly
let whatsAppSenderFn = null;
// Active batch cancellation flag
let activeOutreachBatch = { running: false, cancelled: false, sent: 0, total: 0 };

function setWhatsAppSender(fn) {
  whatsAppSenderFn = typeof fn === 'function' ? fn : null;
}

function isAuthorizedPaUser(isOwner = false, chatId = '', options = {}) {
  if (isOwner) return true;
  const candidates = [
    chatId,
    options.remoteJid,
    options.remoteJidAlt,
    options.altDigits,
    options.participant
  ];
  for (const c of candidates) {
    const digits = (c || '').toString().replace(/\D/g, '').slice(-10);
    if (digits && AUTHORIZED_PA_PHONES.has(digits)) return true;
  }
  return false;
}

function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        outreachPaused: Boolean(parsed.outreachPaused)
      };
    }
  } catch (err) {
    console.warn('[SoloDev PA] Store load error:', err.message);
  }
  return { tasks: [], projects: [], invoices: [], notes: [], outreachPaused: false };
}

function saveStore(store) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[SoloDev PA] Store save error:', err.message);
    return false;
  }
}

function nextId(prefix, list) {
  const num = (list?.length || 0) + 1;
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

function normalizePhone(raw) {
  let digits = (raw || '').toString().replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

function httpJsonRequest(urlString, options = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const payload = bodyObj !== null ? JSON.stringify(bodyObj) : null;
    const headers = {
      'User-Agent': 'SoloDeveloper-PA/1.0',
      ...(options.headers || {})
    };
    if (payload !== null) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = client.request(urlString, {
      method: options.method || 'GET',
      headers,
      timeout: options.timeout || 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : {}; } catch { json = { raw: data }; }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json, raw: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    if (payload !== null) req.write(payload);
    req.end();
  });
}

// -----------------------------------------------------------------------------
// 1. TODOIST REST API + LOCAL FALLBACK TASKS CRUD
// -----------------------------------------------------------------------------
async function todoistRequest(method, endpoint, body = null) {
  const token = (process.env.TODOIST_API_TOKEN || process.env.TODOIST_API_KEY || '').trim();
  if (!token) return { configured: false };

  const urls = [
    `https://api.todoist.com/rest/v2${endpoint}`,
    `https://api.todoist.com/api/v1${endpoint}`
  ];

  let lastRes = null;
  for (const u of urls) {
    try {
      const res = await httpJsonRequest(u, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      }, body);
      if (res.ok || (res.status !== 404 && res.status !== 410)) {
        return { configured: true, ...res };
      }
      lastRes = res;
    } catch (e) {
      lastRes = { ok: false, status: 500, data: { error: e.message } };
    }
  }
  return { configured: true, ...(lastRes || { ok: false, status: 500 }) };
}

async function handleTasksCrud(args = {}) {
  const store = loadStore();
  const op = (args.operation || 'read').toLowerCase();
  const hasTodoist = Boolean((process.env.TODOIST_API_TOKEN || process.env.TODOIST_API_KEY || '').trim());

  if (op === 'create') {
    const title = args.title || 'Untitled Task';
    const dueDate = args.dueDate || '';
    const dueTime = args.dueTime || '';
    const priorityMap = { Low: 1, Medium: 2, High: 3, Urgent: 4 };

    let todoistResult = null;
    if (hasTodoist) {
      const tPayload = {
        content: args.clientName && args.clientName !== 'Internal' ? `${title} (${args.clientName})` : title,
        description: args.notes || '',
        priority: priorityMap[args.priority] || 2
      };
      if (dueDate && dueTime) tPayload.due_string = `${dueDate} ${dueTime}`;
      else if (dueDate) tPayload.due_date = dueDate;

      const apiRes = await todoistRequest('POST', '/tasks', tPayload);
      todoistResult = apiRes.ok ? { synced: true, todoistId: apiRes.data?.id } : { synced: false, error: apiRes.data };
    }

    const task = {
      id: nextId('TSK', store.tasks),
      todoistId: todoistResult?.todoistId ? String(todoistResult.todoistId) : null,
      title,
      clientName: args.clientName || 'Internal',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      dueTime,
      priority: args.priority || 'Medium',
      status: args.status || 'Pending',
      notes: args.notes || '',
      createdAt: new Date().toISOString()
    };
    store.tasks.push(task);
    saveStore(store);
    return {
      success: true,
      action: 'created',
      todoist: hasTodoist ? todoistResult : { synced: false, note: 'Add TODOIST_API_TOKEN in env to sync directly with Todoist app' },
      task
    };
  }

  if (op === 'read') {
    let todoistTasks = null;
    if (hasTodoist) {
      const apiRes = await todoistRequest('GET', '/tasks');
      if (apiRes.ok) {
        const rawList = Array.isArray(apiRes.data) ? apiRes.data : (apiRes.data?.results || []);
        todoistTasks = rawList.map(t => ({
          todoistId: String(t.id),
          title: t.content,
          due: t.due?.string || t.due?.date || '',
          priority: t.priority,
          notes: t.description || ''
        }));
      }
    }

    let list = store.tasks;
    if (args.status) {
      list = list.filter(t => t.status.toLowerCase() === args.status.toLowerCase());
    }
    if (args.searchText) {
      const q = args.searchText.toLowerCase();
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.clientName || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      );
      if (todoistTasks) {
        todoistTasks = todoistTasks.filter(t => (t.title || '').toLowerCase().includes(q));
      }
    }
    return {
      success: true,
      todoistSynced: Boolean(todoistTasks),
      todoistCount: todoistTasks ? todoistTasks.length : 0,
      todoistTasks: todoistTasks || [],
      localCount: list.length,
      tasks: list
    };
  }

  if (op === 'update') {
    const idx = store.tasks.findIndex(t =>
      (args.taskId && (t.id.toLowerCase() === args.taskId.toLowerCase() || t.todoistId === String(args.taskId))) ||
      (args.title && t.title.toLowerCase().includes(args.title.toLowerCase()))
    );

    // Support closing/updating a Todoist task directly by todoistId even if not in local store
    let todoistUpdated = false;
    const targetTodoistId = (idx !== -1 ? store.tasks[idx].todoistId : null) || (args.todoistId ? String(args.todoistId) : null);
    if (hasTodoist && targetTodoistId) {
      if (args.status === 'Done') {
        const res = await todoistRequest('POST', `/tasks/${targetTodoistId}/close`);
        todoistUpdated = res.ok;
      } else {
        const patch = {};
        if (args.title) patch.content = args.title;
        if (args.dueDate) patch.due_date = args.dueDate;
        if (args.notes !== undefined) patch.description = args.notes;
        const res = await todoistRequest('POST', `/tasks/${targetTodoistId}`, patch);
        todoistUpdated = res.ok;
      }
    }

    if (idx === -1) {
      if (todoistUpdated) return { success: true, action: 'updated_in_todoist', todoistId: targetTodoistId };
      return { success: false, error: 'Task not found' };
    }

    const existing = store.tasks[idx];
    store.tasks[idx] = {
      ...existing,
      title: args.title && args.taskId ? args.title : existing.title,
      status: args.status || existing.status,
      priority: args.priority || existing.priority,
      dueDate: args.dueDate || existing.dueDate,
      dueTime: args.dueTime || existing.dueTime,
      notes: args.notes !== undefined ? args.notes : existing.notes,
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
    return { success: true, action: 'updated', todoistUpdated, task: store.tasks[idx] };
  }

  if (op === 'delete') {
    const target = store.tasks.find(t => args.taskId && (t.id.toLowerCase() === args.taskId.toLowerCase() || t.todoistId === String(args.taskId)));
    const todoistId = target?.todoistId || args.todoistId;
    let todoistDeleted = false;
    if (hasTodoist && todoistId) {
      const res = await todoistRequest('DELETE', `/tasks/${todoistId}`);
      todoistDeleted = res.ok;
    }

    const before = store.tasks.length;
    store.tasks = store.tasks.filter(t => !(args.taskId && (t.id.toLowerCase() === args.taskId.toLowerCase() || t.todoistId === String(args.taskId))));
    if (store.tasks.length === before && !todoistDeleted) return { success: false, error: 'Task ID not found' };
    saveStore(store);
    return { success: true, action: 'deleted', deletedId: args.taskId || todoistId, todoistDeleted };
  }

  return { success: false, error: `Unsupported task operation: ${op}` };
}

// -----------------------------------------------------------------------------
// 2. GOOGLE SHEET (`solo dev lead gen` -> `Prospects`) INTEGRATION
// -----------------------------------------------------------------------------
function colIndexToLetter(idx) {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

async function readProspectsSheet() {
  const token = await googleDriveService.getAccessToken();
  const range = encodeURIComponent(`${LEAD_GEN_TAB}!A1:Z1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${LEAD_GEN_SPREADSHEET_ID}/values/${range}`;
  const res = await httpJsonRequest(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const serviceEmail = googleDriveService.keyData?.client_email || 'drive-automation@n8n-whatsapp-491418.iam.gserviceaccount.com';
    return {
      success: false,
      status: res.status,
      error: res.status === 403
        ? `Permission denied on Google Sheet. Please share "solo dev lead gen" (${LEAD_GEN_SPREADSHEET_ID}) with ${serviceEmail} as Editor.`
        : (res.data?.error?.message || `Google Sheets error (${res.status})`)
    };
  }

  const rows = res.data?.values || [];
  if (rows.length === 0) return { success: true, headers: [], leads: [] };

  const headers = rows[0].map(h => (h || '').toString().trim());
  const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell || !cell.toString().trim())) continue;
    const obj = { _rowNumber: i + 1 };
    headers.forEach((h, colIdx) => {
      if (h) obj[h] = (row[colIdx] || '').toString().trim();
    });
    leads.push(obj);
  }
  return { success: true, headers, leads };
}

async function updateProspectRowByNumber(rowNumber, headers, updates = {}) {
  const token = await googleDriveService.getAccessToken();
  const dataUpdates = [];

  for (const [colName, val] of Object.entries(updates)) {
    const colIdx = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase());
    if (colIdx !== -1 && val !== undefined) {
      const colLetter = colIndexToLetter(colIdx);
      dataUpdates.push({
        range: `${LEAD_GEN_TAB}!${colLetter}${rowNumber}`,
        values: [[String(val)]]
      });
    }
  }

  if (dataUpdates.length === 0) return { success: false, error: 'No matching columns found to update' };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${LEAD_GEN_SPREADSHEET_ID}/values:batchUpdate`;
  const res = await httpJsonRequest(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, {
    valueInputOption: 'USER_ENTERED',
    data: dataUpdates
  });

  return { success: res.ok, updatedFields: dataUpdates.length, error: res.ok ? null : res.data?.error?.message };
}

async function appendProspectRow(headers, leadObj = {}) {
  const token = await googleDriveService.getAccessToken();
  const rowValues = headers.map(h => {
    const key = Object.keys(leadObj).find(k => k.toLowerCase() === h.toLowerCase());
    return key ? String(leadObj[key]) : '';
  });
  const range = encodeURIComponent(`${LEAD_GEN_TAB}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${LEAD_GEN_SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;
  const res = await httpJsonRequest(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, { values: [rowValues] });
  return { success: res.ok, error: res.ok ? null : res.data?.error?.message };
}

async function handleLeadGenSheet(args = {}) {
  const op = (args.operation || 'read_summary').toLowerCase();
  const sheetRes = await readProspectsSheet();
  if (!sheetRes.success) return sheetRes;

  const { headers, leads } = sheetRes;

  if (op === 'read_summary') {
    const stageCounts = {};
    const pendingLeads = [];
    for (const l of leads) {
      const st = (l['Stage'] || 'Pending').trim() || 'Pending';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
      if ((st.toLowerCase() === 'pending' || st === '') && pendingLeads.length < 10) {
        pendingLeads.push({
          row: l._rowNumber,
          business: l['Business'] || l['Business Name'] || '',
          phone: l['Phone'] || '',
          website: l['Website'] || '',
          city: l['City'] || l['Address'] || ''
        });
      }
    }
    return {
      success: true,
      spreadsheetId: LEAD_GEN_SPREADSHEET_ID,
      tab: LEAD_GEN_TAB,
      totalLeads: leads.length,
      stageCounts,
      nextPendingLeads: pendingLeads
    };
  }

  if (op === 'search_lead') {
    const q = (args.searchText || args.businessName || args.phone || '').toLowerCase().trim();
    const matches = leads.filter(l =>
      (l['Business'] || '').toLowerCase().includes(q) ||
      (l['Phone'] || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '___')
    ).slice(0, 10);
    return { success: true, count: matches.length, matches };
  }

  if (op === 'update_stage') {
    const q = (args.businessName || args.searchText || '').toLowerCase().trim();
    const qDigits = (args.phone || '').replace(/\D/g, '').slice(-10);
    const match = leads.find(l =>
      (q && (l['Business'] || '').toLowerCase().includes(q)) ||
      (qDigits && (l['Phone'] || '').replace(/\D/g, '').endsWith(qDigits))
    );
    if (!match) return { success: false, error: 'Lead not found in Prospects sheet' };

    const updates = {};
    if (args.stage) updates['Stage'] = args.stage;
    if (args.contactedDate) updates['Contacted Date'] = args.contactedDate;
    if (args.nextFollowUp !== undefined) updates['Next follow-up'] = args.nextFollowUp;
    if (args.painPoint) updates['pain point'] = args.painPoint;
    if (args.ticketSize) updates['Ticket size'] = args.ticketSize;
    if (args.dealValue) updates['Deal value'] = args.dealValue;
    if (args.need) updates['Need'] = args.need;
    if (args.objectionReason) updates['Objection Reason'] = args.objectionReason;

    const upRes = await updateProspectRowByNumber(match._rowNumber, headers, updates);
    return { success: upRes.success, business: match['Business'], row: match._rowNumber, updates, error: upRes.error };
  }

  if (op === 'add_lead') {
    const newRow = {
      Business: args.businessName || '',
      Phone: args.phone || '',
      Website: args.website || '',
      Address: args.address || args.city || '',
      Rating: args.rating || '',
      Reviews: args.reviews || '',
      Channel: args.channel || 'Manual / WhatsApp',
      Stage: args.stage || 'Pending',
      Need: args.need || ''
    };
    const appRes = await appendProspectRow(headers, newRow);
    return { success: appRes.success, added: newRow, error: appRes.error };
  }

  return { success: false, error: `Unsupported sheet operation: ${op}` };
}

// -----------------------------------------------------------------------------
// 3. N8N OUTREACH WORKFLOW ACTIVATE / PAUSE + ON-DEMAND 5/10 LEAD OUTREACH
// -----------------------------------------------------------------------------
async function controlN8nOutreachWorkflow(args = {}) {
  const action = (args.action || 'status').toLowerCase();
  const store = loadStore();
  const apiKey = (process.env.N8N_API_KEY || '').trim();

  if (action === 'pause' && activeOutreachBatch.running) {
    activeOutreachBatch.cancelled = true;
  }

  if (action === 'pause') {
    store.outreachPaused = true;
    saveStore(store);
  } else if (action === 'activate') {
    store.outreachPaused = false;
    saveStore(store);
  }

  if (!apiKey) {
    return {
      success: true,
      localOutreachPaused: store.outreachPaused,
      runningBatch: activeOutreachBatch,
      n8nSynced: false,
      note: 'N8N_API_KEY not set in Render env. Add N8N_API_KEY (and optional N8N_OUTREACH_WORKFLOW_ID) in Render to toggle the Cloud n8n workflow directly.'
    };
  }

  // Query n8n Cloud API
  const wfListRes = await httpJsonRequest(`${N8N_BASE_URL}/api/v1/workflows`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!wfListRes.ok) {
    return {
      success: false,
      localOutreachPaused: store.outreachPaused,
      error: `n8n Cloud API returned HTTP ${wfListRes.status}`,
      details: wfListRes.data
    };
  }

  const workflows = wfListRes.data?.data || [];
  const targetId = (args.workflowId || process.env.N8N_OUTREACH_WORKFLOW_ID || '').trim();
  const targetWf = targetId
    ? workflows.find(w => w.id === targetId)
    : workflows.find(w => /outreach|5 leads|builder.*sheets/i.test(w.name || ''));

  if (action === 'list') {
    return {
      success: true,
      workflows: workflows.map(w => ({ id: w.id, name: w.name, active: w.active }))
    };
  }

  if (!targetWf) {
    return {
      success: false,
      localOutreachPaused: store.outreachPaused,
      error: 'Outreach workflow not found on Cloud n8n. Import daily_5_leads_8pm_outreach_and_followup.json to n8n Cloud first.',
      availableWorkflows: workflows.map(w => ({ id: w.id, name: w.name, active: w.active }))
    };
  }

  if (action === 'status') {
    return {
      success: true,
      workflow: { id: targetWf.id, name: targetWf.name, active: targetWf.active },
      localOutreachPaused: store.outreachPaused,
      runningBatch: activeOutreachBatch
    };
  }

  if (action === 'activate' || action === 'pause') {
    const ep = action === 'activate' ? 'activate' : 'deactivate';
    const toggleRes = await httpJsonRequest(`${N8N_BASE_URL}/api/v1/workflows/${targetWf.id}/${ep}`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    return {
      success: toggleRes.ok,
      action,
      workflow: { id: targetWf.id, name: targetWf.name, active: action === 'activate' },
      localOutreachPaused: store.outreachPaused,
      error: toggleRes.ok ? null : toggleRes.data
    };
  }

  return { success: false, error: `Unsupported workflow action: ${action}` };
}

function buildConstructionOutreachText(lead) {
  const biz = lead.businessName;
  const location = lead.city || 'Madurai';
  const website = (lead.website || '').trim();
  const isSocial = /(facebook\.com|instagram\.com|indiamart\.com|justdial\.com|linkedin\.com)/i.test(website);
  const hasWebsite = Boolean(website && website.length > 7 && !isSocial);

  const revNum = parseInt(lead.reviews, 10);
  const revText = !isNaN(revNum) && revNum > 0 ? ` and *${revNum} ${revNum === 1 ? 'review' : 'reviews'}*` : '';
  const ratingStr = lead.rating ? ` (great to see your *${lead.rating}★* rating${revText}!)` : '';

  if (hasWebsite) {
    return `Hi *${biz}*,\n\nI'm Suresh Kumar, an AI & Software Automation Engineer from Madurai (SoloDeveloper.pro). I came across *${biz}* on Google Maps${ratingStr} and checked out your website (${website}) while researching builders in *${location}*.\n\nSince you already have a website, we help builders automate their *entire site & office workflow* inside WhatsApp — all done by AI:\n\n✔ *Construction Bills & Attendance* — manage site bills, Tally/Sheets sync & daily labor attendance via WhatsApp voice or text\n✔ *Site Pictures & Site Stocks* — upload/retrieve site stage photos in seconds and track cement, steel & material stock automatically\n✔ *Machines Handling & 24/7 AI* — track machinery usage/maintenance and qualify client enquiries automatically\n\n*(We also build custom software and mobile apps tailored for construction teams).*\n\nCan I send you a quick 2-minute concept preview designed for *${biz}*?`;
  }

  return `Hi *${biz}*,\n\nI'm Suresh Kumar, an AI & Software Automation Engineer from Madurai (SoloDeveloper.pro). I came across *${biz}* on Google Maps while researching builders in *${location}*${ratingStr}, and noticed you don't currently have a dedicated website yet.\n\nWe help builders launch a modern website and automate their *entire site & office workflow* inside WhatsApp — all done by AI:\n\n✔ *Website & Project Portfolio* — showcases your completed builds & cost estimator so clients trust you before calling\n✔ *Construction Bills, Attendance & Stocks* — manage bills (Tally/Sheets), daily labor attendance, site stocks & machines via WhatsApp\n✔ *Site Pictures Vault & 24/7 AI* — upload/retrieve site photos in seconds and qualify client enquiries automatically\n\n*(We also build custom software and mobile apps tailored for construction teams).*\n\nCan I send you a quick 2-minute concept preview designed for *${biz}*?`;
}

async function runLeadGenOutreachBatch(args = {}, notifyOwnerChatId = null) {
  const store = loadStore();
  if (store.outreachPaused && !args.force) {
    return {
      success: false,
      error: 'Outreach is currently PAUSED. Say "Activate outreach" first, or confirm you want to run anyway.'
    };
  }
  if (activeOutreachBatch.running) {
    return {
      success: false,
      error: `An outreach batch is already running (${activeOutreachBatch.sent}/${activeOutreachBatch.total} sent). Say "Pause outreach" to stop it.`
    };
  }
  if (!whatsAppSenderFn) {
    return { success: false, error: 'WhatsApp sender not connected yet.' };
  }

  const count = Math.min(Math.max(parseInt(args.count, 10) || 5, 1), 15);
  const sheetRes = await readProspectsSheet();
  if (!sheetRes.success) return sheetRes;

  const { headers, leads } = sheetRes;
  const targets = [];

  for (const l of leads) {
    const stageLower = (l['Stage'] || '').toString().trim().toLowerCase();
    if (stageLower !== '' && stageLower !== 'pending') continue;
    const phone = normalizePhone(l['Phone'] || l['WhatsApp'] || l['Mobile'] || '');
    if (!phone || phone.length < 11) continue;

    const address = (l['Address'] || '').toString().trim();
    const city = (l['City'] || l['Location'] || (address ? address.split(',').slice(-2, -1)[0]?.trim() : '') || 'Madurai').toString().trim();

    targets.push({
      rowNumber: l._rowNumber,
      businessName: (l['Business'] || l['Business Name'] || 'Team').toString().trim(),
      phone,
      city,
      rating: l['Rating'] || '',
      reviews: l['Reviews'] || '',
      website: (l['Website'] || '').toString().trim()
    });

    if (targets.length >= count) break;
  }

  if (targets.length === 0) {
    return { success: false, error: 'No Pending leads with valid phone numbers found in Prospects sheet.' };
  }

  if (args.dryRun) {
    return {
      success: true,
      dryRun: true,
      selectedCount: targets.length,
      targets: targets.map(t => ({ row: t.rowNumber, business: t.businessName, phone: t.phone, hasWebsite: Boolean(t.website) }))
    };
  }

  // Launch paced anti-ban sending asynchronously so WhatsApp tool call returns cleanly without timeout
  activeOutreachBatch = { running: true, cancelled: false, sent: 0, total: targets.length };
  const todayStr = new Date().toISOString().split('T')[0];
  const nextFollowUpStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  setImmediate(async () => {
    const sentList = [];
    const failedList = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        if (activeOutreachBatch.cancelled || loadStore().outreachPaused) {
          console.log(`🛑 [LeadGen Batch] Cancelled after ${i}/${targets.length} sends.`);
          break;
        }
        const lead = targets[i];
        const msg = buildConstructionOutreachText(lead);
        try {
          const sendRes = await whatsAppSenderFn(lead.phone, msg);
          if (sendRes?.success) {
            await updateProspectRowByNumber(lead.rowNumber, headers, {
              Stage: 'Cold outreach',
              'Contacted Date': todayStr,
              'Next follow-up': nextFollowUpStr
            }).catch(() => {});
            sentList.push(`${lead.businessName} (+${lead.phone})`);
            activeOutreachBatch.sent++;
          } else {
            failedList.push(`${lead.businessName}: ${sendRes?.error || 'failed'}`);
          }
        } catch (err) {
          failedList.push(`${lead.businessName}: ${err.message}`);
        }

        // Anti-ban randomized delay (25–55s) between messages
        if (i < targets.length - 1 && !activeOutreachBatch.cancelled) {
          const delayMs = (Math.floor(Math.random() * 30) + 25) * 1000;
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      if (notifyOwnerChatId && whatsAppSenderFn) {
        const ownerDigits = notifyOwnerChatId.replace(/\D/g, '') || '919361599097';
        const summaryMsg = `✅ *Lead Gen Outreach Batch Complete!*\n\n• *Sent:* ${sentList.length}/${targets.length}\n${sentList.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}${failedList.length ? `\n\n⚠️ *Failed:*\n${failedList.join('\n')}` : ''}\n\n📊 Updated \`Prospects\` sheet Stage ➔ *Cold outreach* & Next follow-up ➔ *${nextFollowUpStr}*.`;
        await whatsAppSenderFn(ownerDigits, summaryMsg).catch(() => {});
      }
    } finally {
      activeOutreachBatch = { running: false, cancelled: false, sent: sentList.length, total: targets.length };
    }
  });

  return {
    success: true,
    status: 'batch_started',
    count: targets.length,
    targets: targets.map(t => ({ row: t.rowNumber, business: t.businessName, phone: t.phone })),
    note: `Sending paced outreach (25-55s anti-ban delay between sends) to ${targets.length} Pending leads from solo dev lead gen (Prospects). You will receive a WhatsApp completion summary once done.`
  };
}

// -----------------------------------------------------------------------------
// 4. PROJECTS, INVOICES & NOTES CRUD
// -----------------------------------------------------------------------------
function handleProjectsCrud(args = {}) {
  const store = loadStore();
  const op = (args.operation || 'read').toLowerCase();

  if (op === 'create') {
    const pkgPrices = { Starter: 9999, Pro: 24999, Enterprise: 49999 };
    const pkg = args.packageTier || 'Pro';
    const totalAmount = Number(args.totalAmount) || pkgPrices[pkg] || 24999;
    const advancePaid = Number(args.advancePaid) || 0;
    const project = {
      id: nextId('PRJ', store.projects),
      clientName: args.clientName || 'New Client',
      phone: normalizePhone(args.phone || ''),
      packageTier: pkg,
      totalAmount,
      advancePaid,
      balanceDue: Math.max(0, totalAmount - advancePaid),
      sprintDay: args.sprintDay || 'Day 1 - Discovery',
      carePlanActive: Boolean(args.carePlanActive),
      status: args.status || 'Active',
      notes: args.notes || '',
      createdAt: new Date().toISOString()
    };
    store.projects.push(project);
    saveStore(store);
    return { success: true, action: 'created', project };
  }

  if (op === 'read') {
    let list = store.projects;
    if (args.status) list = list.filter(p => p.status.toLowerCase() === args.status.toLowerCase());
    if (args.searchText) {
      const q = args.searchText.toLowerCase();
      list = list.filter(p => (p.clientName || '').toLowerCase().includes(q) || (p.packageTier || '').toLowerCase().includes(q));
    }
    return { success: true, count: list.length, projects: list };
  }

  if (op === 'update') {
    const idx = store.projects.findIndex(p =>
      (args.projectId && p.id.toLowerCase() === args.projectId.toLowerCase()) ||
      (args.clientName && p.clientName.toLowerCase().includes(args.clientName.toLowerCase()))
    );
    if (idx === -1) return { success: false, error: 'Project not found' };
    const existing = store.projects[idx];
    const totalAmount = args.totalAmount !== undefined ? Number(args.totalAmount) : existing.totalAmount;
    const advancePaid = args.advancePaid !== undefined ? Number(args.advancePaid) : existing.advancePaid;
    store.projects[idx] = {
      ...existing,
      packageTier: args.packageTier || existing.packageTier,
      totalAmount,
      advancePaid,
      balanceDue: Math.max(0, totalAmount - advancePaid),
      sprintDay: args.sprintDay || existing.sprintDay,
      carePlanActive: args.carePlanActive !== undefined ? Boolean(args.carePlanActive) : existing.carePlanActive,
      status: args.status || existing.status,
      notes: args.notes !== undefined ? args.notes : existing.notes,
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
    return { success: true, action: 'updated', project: store.projects[idx] };
  }

  if (op === 'delete') {
    const before = store.projects.length;
    store.projects = store.projects.filter(p => !(args.projectId && p.id.toLowerCase() === args.projectId.toLowerCase()));
    if (store.projects.length === before) return { success: false, error: 'Project ID not found' };
    saveStore(store);
    return { success: true, action: 'deleted', deletedId: args.projectId };
  }

  return { success: false, error: `Unsupported project operation: ${op}` };
}

function buildInvoiceWhatsAppText(invoice, isReminder = false) {
  const upiPhone = '+91 93615 99097';
  const amtText = invoice.amount ? `₹${Number(invoice.amount).toLocaleString('en-IN')}` : 'Pending Balance';
  if (isReminder) {
    return `வணக்கம் *${invoice.clientName}*! 🙏\n\n*SoloDeveloper.pro* சார்பாக ஒரு அன்பான Payment Reminder:\n\n• *Invoice ID:* ${invoice.id}\n• *Service:* ${invoice.packageOrItem}\n• *Amount Due:* *${amtText}*\n• *Due Date:* ${invoice.dueDate}\n\nGPay / PhonePe / UPI மூலம் *${upiPhone}* எண்ணிற்கு அனுப்பிவிட்டு screenshot பகிரவும். மிக்க நன்றி!`;
  }
  return `📄 *Payment Invoice — SoloDeveloper.pro*\n\nவணக்கம் *${invoice.clientName}*,\n\n• *Invoice ID:* ${invoice.id}\n• *Service:* ${invoice.packageOrItem}\n• *Amount:* *${amtText}*\n• *Due Date:* ${invoice.dueDate}\n\n*UPI / GPay:* ${upiPhone}\nPayment செய்ததும் இங்கே screenshot பகிரவும். நன்றி!`;
}

async function handleInvoicesAndReminders(args = {}) {
  const store = loadStore();
  const op = (args.operation || 'read').toLowerCase();

  if (op === 'create') {
    const invoice = {
      id: nextId('INV', store.invoices),
      clientName: args.clientName || 'Client',
      phone: normalizePhone(args.phone || ''),
      packageOrItem: args.packageOrItem || 'AI Automation System',
      amount: Number(args.amount) || 0,
      dueDate: args.dueDate || new Date().toISOString().split('T')[0],
      status: 'Pending',
      remindersSent: 0,
      lastReminderAt: null,
      notes: args.notes || '',
      createdAt: new Date().toISOString()
    };
    store.invoices.push(invoice);
    saveStore(store);

    let whatsappStatus = 'not_sent';
    if (args.sendImmediately && invoice.phone && whatsAppSenderFn) {
      const msg = buildInvoiceWhatsAppText(invoice, false);
      const res = await whatsAppSenderFn(invoice.phone, msg);
      whatsappStatus = res?.success ? 'sent' : (res?.error || 'failed');
    }
    return { success: true, action: 'created', invoice, whatsappStatus };
  }

  if (op === 'read') {
    let list = store.invoices;
    if (args.status) list = list.filter(i => i.status.toLowerCase() === args.status.toLowerCase());
    const totalPending = list.filter(i => i.status === 'Pending').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    return { success: true, count: list.length, totalPendingINR: totalPending, invoices: list };
  }

  if (op === 'mark_paid') {
    const idx = store.invoices.findIndex(i =>
      (args.invoiceId && i.id.toLowerCase() === args.invoiceId.toLowerCase()) ||
      (args.clientName && i.clientName.toLowerCase().includes(args.clientName.toLowerCase()))
    );
    if (idx === -1) return { success: false, error: 'Invoice not found' };
    store.invoices[idx].status = 'Paid';
    store.invoices[idx].paidAt = new Date().toISOString();
    saveStore(store);
    return { success: true, action: 'marked_paid', invoice: store.invoices[idx] };
  }

  if (op === 'send_reminder') {
    const idx = store.invoices.findIndex(i =>
      (args.invoiceId && i.id.toLowerCase() === args.invoiceId.toLowerCase()) ||
      (args.clientName && i.clientName.toLowerCase().includes(args.clientName.toLowerCase()))
    );

    let invoice = idx !== -1 ? store.invoices[idx] : null;
    const targetPhone = normalizePhone(args.phone || invoice?.phone || '');
    if (!targetPhone) return { success: false, error: 'Customer phone number is required to send WhatsApp payment reminder' };

    if (!invoice) {
      invoice = {
        id: nextId('INV', store.invoices),
        clientName: args.clientName || 'Valued Client',
        phone: targetPhone,
        packageOrItem: args.packageOrItem || 'SoloDeveloper AI / Web Services',
        amount: Number(args.amount) || 0,
        dueDate: args.dueDate || new Date().toISOString().split('T')[0],
        status: 'Pending',
        remindersSent: 0,
        lastReminderAt: null,
        createdAt: new Date().toISOString()
      };
      store.invoices.push(invoice);
    }

    const msg = buildInvoiceWhatsAppText(invoice, true);
    if (!whatsAppSenderFn) return { success: false, error: 'WhatsApp sender not connected yet', previewMessage: msg };

    const sendRes = await whatsAppSenderFn(targetPhone, msg);
    if (sendRes?.success) {
      invoice.remindersSent = (invoice.remindersSent || 0) + 1;
      invoice.lastReminderAt = new Date().toISOString();
      saveStore(store);
    }
    return { success: Boolean(sendRes?.success), action: 'reminder_sent', invoice, sendRes };
  }

  return { success: false, error: `Unsupported invoice operation: ${op}` };
}

function handleNotesCrud(args = {}) {
  const store = loadStore();
  const op = (args.operation || 'read').toLowerCase();

  if (op === 'create') {
    const note = {
      id: nextId('NOTE', store.notes),
      category: args.category || 'General',
      content: args.content || '',
      createdAt: new Date().toISOString()
    };
    store.notes.push(note);
    saveStore(store);
    return { success: true, action: 'created', note };
  }

  if (op === 'read') {
    let list = store.notes;
    if (args.searchText) {
      const q = args.searchText.toLowerCase();
      list = list.filter(n => (n.content || '').toLowerCase().includes(q) || (n.category || '').toLowerCase().includes(q));
    }
    return { success: true, count: list.length, notes: list };
  }

  if (op === 'delete') {
    const before = store.notes.length;
    store.notes = store.notes.filter(n => !(args.noteId && n.id.toLowerCase() === args.noteId.toLowerCase()));
    if (store.notes.length === before) return { success: false, error: 'Note ID not found' };
    saveStore(store);
    return { success: true, action: 'deleted', deletedId: args.noteId };
  }

  return { success: false, error: `Unsupported note operation: ${op}` };
}

function getDailyBriefingSummary() {
  const store = loadStore();
  const pendingTasks = store.tasks.filter(t => t.status !== 'Done');
  const activeProjects = store.projects.filter(p => p.status !== 'Completed');
  const pendingInvoices = store.invoices.filter(i => i.status === 'Pending');
  const totalReceivable = pendingInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return {
    success: true,
    summaryDate: new Date().toISOString().split('T')[0],
    outreachPaused: store.outreachPaused,
    activeOutreachBatch,
    counts: {
      pendingTasks: pendingTasks.length,
      activeProjects: activeProjects.length,
      pendingInvoices: pendingInvoices.length,
      totalReceivableINR: totalReceivable,
      notes: store.notes.length
    },
    pendingTasks: pendingTasks.slice(0, 10),
    activeProjects: activeProjects.slice(0, 10),
    pendingInvoices: pendingInvoices.slice(0, 10),
    recentNotes: store.notes.slice(-5),
    demoLinks: {
      websiteDemo: 'https://abc-builders-madurai.vercel.app/',
      aiQrSandbox: 'https://whatsapp-assistant-iqpi.onrender.com/demo',
      commandCenter: 'https://whatsapp-assistant-iqpi.onrender.com/'
    }
  };
}

// -----------------------------------------------------------------------------
// GEMINI FUNCTION DECLARATIONS
// -----------------------------------------------------------------------------
const SOLODEV_PA_TOOLS = [{
  functionDeclarations: [
    {
      name: 'manageTasksCrud',
      description: 'Create, read, update (or complete), or delete Suresh\'s tasks and reminders (syncs live with Todoist when TODOIST_API_TOKEN is set, with local backup).',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'] },
          taskId: { type: 'STRING', description: 'Local Task ID (TSK-001) or Todoist Task ID' },
          todoistId: { type: 'STRING', description: 'Optional Todoist Task ID' },
          title: { type: 'STRING', description: 'Task or reminder title' },
          clientName: { type: 'STRING', description: 'Related client or prospect name' },
          dueDate: { type: 'STRING', description: 'YYYY-MM-DD date' },
          dueTime: { type: 'STRING', description: 'Optional time e.g. 10:00 AM' },
          priority: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Urgent'] },
          status: { type: 'STRING', enum: ['Pending', 'In Progress', 'Done'] },
          notes: { type: 'STRING' },
          searchText: { type: 'STRING' }
        },
        required: ['operation']
      }
    },
    {
      name: 'manageLeadGenSheet',
      description: 'Read summary, search leads, add a lead, or update Stage/Next follow-up in the "solo dev lead gen" Google Sheet (Prospects tab).',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['read_summary', 'search_lead', 'update_stage', 'add_lead'] },
          businessName: { type: 'STRING' },
          phone: { type: 'STRING' },
          website: { type: 'STRING' },
          city: { type: 'STRING' },
          stage: { type: 'STRING', enum: ['Pending', 'Cold outreach', 'Follow up 1', 'Follow up 2', 'Follow up 3', 'Call booked', 'Rejected', 'Maybe later'] },
          nextFollowUp: { type: 'STRING', description: 'YYYY-MM-DD' },
          painPoint: { type: 'STRING' },
          ticketSize: { type: 'STRING', enum: ['Low', 'Mid', 'High'] },
          dealValue: { type: 'STRING' },
          need: { type: 'STRING' },
          objectionReason: { type: 'STRING' },
          searchText: { type: 'STRING' }
        },
        required: ['operation']
      }
    },
    {
      name: 'controlN8nOutreachWorkflow',
      description: 'Check status, activate, or pause the outreach workflow on Cloud n8n (and local PA outreach state) when Suresh asks to turn outreach ON or OFF.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['status', 'activate', 'pause', 'list'] },
          workflowId: { type: 'STRING', description: 'Optional specific n8n workflow ID' }
        },
        required: ['action']
      }
    },
    {
      name: 'runLeadGenOutreachBatch',
      description: 'Send WhatsApp cold outreach to the next N Pending leads (e.g. 5 or 10 people) from the "solo dev lead gen" Google Sheet (Prospects tab) and update their Stage to Cold outreach. ONLY call when Suresh explicitly tells you to send outreach to N people.',
      parameters: {
        type: 'OBJECT',
        properties: {
          count: { type: 'NUMBER', description: 'Number of Pending leads to contact (e.g. 5 or 10, max 15)' },
          dryRun: { type: 'BOOLEAN', description: 'If true, preview which leads would be contacted without sending' },
          force: { type: 'BOOLEAN', description: 'Set true only if Suresh insists when outreach was paused' }
        },
        required: ['count']
      }
    },
    {
      name: 'manageClientProjectsCrud',
      description: 'Create, read, update, or delete active client projects (Starter ₹9,999, Pro ₹24,999, Enterprise ₹49,999, Monthly Care ₹1,999).',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'update', 'delete'] },
          projectId: { type: 'STRING', description: 'Project ID e.g. PRJ-001' },
          clientName: { type: 'STRING' },
          phone: { type: 'STRING' },
          packageTier: { type: 'STRING', enum: ['Starter', 'Pro', 'Enterprise', 'Custom'] },
          totalAmount: { type: 'NUMBER' },
          advancePaid: { type: 'NUMBER' },
          sprintDay: { type: 'STRING', description: 'e.g. Day 1 - Discovery, Day 4 - Integration, Live' },
          carePlanActive: { type: 'BOOLEAN', description: 'Whether ₹1,999/mo Care Plan is active' },
          status: { type: 'STRING', enum: ['Active', 'On Hold', 'Completed'] },
          notes: { type: 'STRING' },
          searchText: { type: 'STRING' }
        },
        required: ['operation']
      }
    },
    {
      name: 'managePaymentInvoices',
      description: 'Create customer payment invoices, list pending invoices, mark paid, or send automated WhatsApp payment reminders directly to the customer.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'mark_paid', 'send_reminder'] },
          invoiceId: { type: 'STRING', description: 'Invoice ID e.g. INV-001' },
          clientName: { type: 'STRING' },
          phone: { type: 'STRING', description: '10-digit or E.164 WhatsApp number' },
          packageOrItem: { type: 'STRING', description: 'Package or service description' },
          amount: { type: 'NUMBER', description: 'Amount in INR' },
          dueDate: { type: 'STRING', description: 'YYYY-MM-DD' },
          status: { type: 'STRING', enum: ['Pending', 'Paid'] },
          sendImmediately: { type: 'BOOLEAN', description: 'If true on create, send invoice to WhatsApp right away' },
          notes: { type: 'STRING' }
        },
        required: ['operation']
      }
    },
    {
      name: 'sendOutreachOrFollowUp',
      description: 'Send a single outreach or follow-up message to one specific phone number requested by Suresh.',
      parameters: {
        type: 'OBJECT',
        properties: {
          phone: { type: 'STRING', description: 'Target WhatsApp phone number' },
          businessName: { type: 'STRING', description: 'Target company name' },
          ownerName: { type: 'STRING', description: 'Optional owner/contact name' },
          industry: { type: 'STRING', description: 'e.g. construction, clinic, restaurant, retail' },
          messageType: { type: 'STRING', enum: ['outreach', 'followup_1', 'followup_3', 'followup_7', 'followup_14', 'custom'] },
          language: { type: 'STRING', enum: ['english', 'tamil'] },
          customMessage: { type: 'STRING', description: 'Used when messageType is custom' }
        },
        required: ['phone', 'businessName', 'messageType']
      }
    },
    {
      name: 'manageNotesCrud',
      description: 'Save, search, or delete Suresh\'s quick voice notes, project ideas, or client instructions.',
      parameters: {
        type: 'OBJECT',
        properties: {
          operation: { type: 'STRING', enum: ['create', 'read', 'delete'] },
          noteId: { type: 'STRING' },
          category: { type: 'STRING', description: 'Idea, Client, Outreach, Tech, Reminder' },
          content: { type: 'STRING' },
          searchText: { type: 'STRING' }
        },
        required: ['operation']
      }
    },
    {
      name: 'getDailyBriefing',
      description: 'Get Suresh\'s executive briefing: pending tasks, active client projects, pending payment invoices/receivables, outreach status, and live demo links.',
      parameters: {
        type: 'OBJECT',
        properties: {},
        required: []
      }
    },
    {
      name: 'manageLiveBehaviorRule',
      description: 'Add, list, or delete live AI prompt behavior directives.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'list', 'remove'] },
          ruleText: { type: 'STRING' },
          ruleIndex: { type: 'NUMBER' }
        },
        required: ['action']
      }
    }
  ]
}];

function buildSolodevPaSystemPrompt() {
  return `# SOLODEVELOPER PERSONAL ASSISTANT (INTERNAL BOSS OS)

You are the dedicated **Personal Assistant & Operations Manager** for **Suresh Kumar** (Founder, SoloDeveloper.pro, Madurai).
You work strictly for Suresh Kumar (and authorized numbers: +91 93615 99097, +91 8072239594, +91 7871762490).

### Your Core Capabilities & Tools:
1. **Todoist Tasks & Reminders (\`manageTasksCrud\`):** Create, list, complete, update, and delete Suresh's tasks (syncs live to his Todoist app when \`TODOIST_API_TOKEN\` is set, plus local backup).
2. **\`solo dev lead gen\` Google Sheet (\`manageLeadGenSheet\`):** Read pending lead counts, search prospects, add new leads, or update \`Stage\` / \`Next follow-up\` in the \`Prospects\` tab.
3. **Outreach Workflow Control (\`controlN8nOutreachWorkflow\`):** Activate, pause, or check status of the n8n Cloud Outreach workflow when Suresh asks.
4. **On-Demand Outreach Batch (\`runLeadGenOutreachBatch\`):** When Suresh explicitly says "5 பேருக்கு outreach அனுப்பு" or "Send outreach to 10 people", pick the next N \`Pending\` leads from the \`Prospects\` tab, send paced WhatsApp outreach, and update \`Stage\` ➔ \`Cold outreach\`.
5. **Client Projects & 7-Day Sprints (\`manageClientProjectsCrud\`):** Track Starter (₹9,999), Pro (₹24,999), Enterprise (₹49,999), and Monthly Care Plan (₹1,999/mo) projects.
6. **Customer Payment Invoices & WhatsApp Reminders (\`managePaymentInvoices\`):** Create invoices, check pending collections, mark paid, and send Customer Payment Invoices / Payment Reminders via WhatsApp.
7. **Quick Voice/Text Notes (\`manageNotesCrud\`) & Daily Briefing (\`getDailyBriefing\`).**

### Reference Links & Pricing:
• **Website Demo (ABC Builders Madurai):** https://abc-builders-madurai.vercel.app/
• **AI Automation QR Sandbox:** https://whatsapp-assistant-iqpi.onrender.com/demo
• **Starter (₹9,999)** | **Pro (₹24,999)** | **Enterprise (₹49,999)** | **Care Plan (₹1,999/mo)** | **One-Time Fix (₹999+)**

### Communication Rules:
• Match Suresh's language: warm Tamil script (தமிழ் எழுத்துக்களில்) with clean English tech/business terms when he writes/speaks in Tamil/Tanglish; crisp English if he writes in English.
• Action-First: Execute the requested tool immediately and confirm concisely with IDs/counts.
• Never treat Suresh as a sales lead. Never send outreach unless Suresh explicitly commands it.`;
}

async function executeSolodevPaToolCall(fnCall, chatId, isOwner = false, options = {}) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  if (!isAuthorizedPaUser(isOwner, chatId, options)) {
    return {
      success: false,
      error: 'Unauthorized: SoloDeveloper Personal Assistant tools are restricted to authorized owner numbers.'
    };
  }

  if (fnName === 'manageTasksCrud') return await handleTasksCrud(args);
  if (fnName === 'manageLeadGenSheet') return await handleLeadGenSheet(args);
  if (fnName === 'controlN8nOutreachWorkflow') return await controlN8nOutreachWorkflow(args);
  if (fnName === 'runLeadGenOutreachBatch') return await runLeadGenOutreachBatch(args, chatId);
  if (fnName === 'manageClientProjectsCrud') return handleProjectsCrud(args);
  if (fnName === 'managePaymentInvoices') return await handleInvoicesAndReminders(args);
  if (fnName === 'manageNotesCrud') return handleNotesCrud(args);
  if (fnName === 'getDailyBriefing') return getDailyBriefingSummary();

  if (fnName === 'sendOutreachOrFollowUp') {
    const targetPhone = normalizePhone(args.phone);
    if (!targetPhone) return { success: false, error: 'Valid target phone number is required' };
    if (!whatsAppSenderFn) return { success: false, error: 'WhatsApp sender not ready' };

    const prospect = {
      businessName: args.businessName,
      company: args.businessName,
      ownerName: args.ownerName || args.businessName,
      industry: args.industry || 'construction'
    };
    const lang = (args.language || 'english').toLowerCase();
    let msgText = '';

    if (args.messageType === 'custom' && args.customMessage) {
      msgText = args.customMessage;
    } else if (args.messageType === 'outreach') {
      const script = generateOutreachScript(prospect);
      msgText = lang === 'tamil' ? script.tamilHook : script.englishHook;
    } else {
      const dayMap = { followup_1: 1, followup_3: 3, followup_7: 7, followup_14: 14 };
      const day = dayMap[args.messageType] || 1;
      const fu = generateFollowUpMessage(prospect, day);
      msgText = lang === 'tamil' ? fu.tamil : fu.english;
    }

    const res = await whatsAppSenderFn(targetPhone, msgText);
    return {
      success: Boolean(res?.success),
      phone: targetPhone,
      messageType: args.messageType,
      sentPreview: msgText.slice(0, 140),
      sendRes: res
    };
  }

  if (fnName === 'manageLiveBehaviorRule') {
    if (args.action === 'add' && args.ruleText) {
      adminRules.addDirective(args.ruleText);
      return { success: true, message: `Rule added: "${args.ruleText}"` };
    }
    if (args.action === 'list') {
      return { success: true, rules: adminRules.getDirectivesText() };
    }
    if (args.action === 'remove' && args.ruleIndex) {
      const removed = adminRules.removeDirective(args.ruleIndex);
      return { success: Boolean(removed), message: removed ? `Removed rule #${args.ruleIndex}` : 'Invalid rule index' };
    }
    return { success: false, error: 'Invalid manageLiveBehaviorRule action' };
  }

  return { success: false, error: `Unknown tool: ${fnName}` };
}

module.exports = {
  SOLODEV_PA_TOOLS,
  buildSolodevPaSystemPrompt,
  executeSolodevPaToolCall,
  setWhatsAppSender,
  isAuthorizedPaUser,
  handleTasksCrud,
  handleLeadGenSheet,
  controlN8nOutreachWorkflow,
  runLeadGenOutreachBatch,
  handleProjectsCrud,
  handleInvoicesAndReminders,
  handleNotesCrud,
  getDailyBriefingSummary
};
