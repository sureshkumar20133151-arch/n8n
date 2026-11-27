/**
 * Tally Prime XML Integration Engine
 * Supports both "Dhanam Holdings" and "Sri Meenakshi Traders" (SMT)
 */
const http = require('http');
const path = require('path');
const fs = require('fs');

let google = null;
try {
  google = require('googleapis').google;
} catch (e) {
  // Safe fallback if googleapis is not in production container
}

const TALLY_URL = process.env.TALLY_SERVER_URL || 'http://127.0.0.1:9000';
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';

function getISTDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function getTallyCompatibleDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  let d = parts.find(p => p.type === 'day').value;

  // Tally Educational Mode only accepts 01, 02, and 31
  if (!['01', '02', '31'].includes(d)) {
    d = '01';
  }
  return `${y}${m}${d}`;
}

/**
 * Escapes characters for safe Tally Prime XML injection
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds standard XML Envelope for Tally Prime
 */
function buildTallyVoucherXml({ company, voucherType, partyName, amount, itemName, quantity, rate, narration, siteName, payerType }) {
  const tallyDate = getTallyCompatibleDate();
  const targetCompany = company === 'SMT' || company === 'Sri Meenakshi Traders' ? 'Sri Meenakshi Traders' : 'Dhanam Holdings';
  const numAmount = parseFloat(amount || 0);

  const safePartyName = escapeXml(partyName || 'Cash');
  const safeNarration = escapeXml(narration || '');
  const safeItemName = escapeXml(itemName || 'Goods');
  const safeSiteName = escapeXml(siteName || '');
  const safePayerType = escapeXml(payerType || '');

  let voucherXml = '';
  if (voucherType === 'Sales') {
    voucherXml = `
        <VOUCHER VCHTYPE="Sales" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
          <NARRATION>${safeNarration} [Item: ${safeItemName} Qty: ${quantity || 1} @ Rs.${rate || numAmount}]</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${safePartyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Sales</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`;
  } else if (voucherType === 'Purchase') {
    voucherXml = `
        <VOUCHER VCHTYPE="Purchase" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
          <NARRATION>${safeNarration} [Item: ${safeItemName} Qty: ${quantity || 1}]</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Purchase</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${safePartyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`;
  } else if (voucherType === 'Receipt') {
    voucherXml = `
        <VOUCHER VCHTYPE="Receipt" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
          <NARRATION>${safeNarration} ${safeSiteName ? `[Site: ${safeSiteName}]` : ''} ${safePayerType ? `[Payer: ${safePayerType}]` : ''}</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${safePartyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Cash</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`;
  } else {
    // Payment
    voucherXml = `
        <VOUCHER VCHTYPE="Payment" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
          <NARRATION>${safeNarration} ${safeSiteName ? `[Site: ${safeSiteName}]` : ''} ${safePayerType ? `[For: ${safePayerType}]` : ''}</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${safePartyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Cash</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`;
  }

  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${targetCompany}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        ${voucherXml}
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Posts XML to local or tunneled Tally Server
 */
function postXmlToTally(xmlEnvelope) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(TALLY_URL);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 9000,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlEnvelope)
        },
        timeout: 4000
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const isCreated = data.includes('<CREATED>1</CREATED>') || (data.includes('<STATUS>1</STATUS>') && !data.includes('<ERRORS>1</ERRORS>'));
          resolve({ success: isCreated, raw: data });
        });
      });

      req.on('error', err => {
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });

      req.write(xmlEnvelope);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Master function called by Bot:
 * Creates voucher in Tally (or queues in Google Sheet if offline)
 */
async function processTallyVoucher({ company, voucherType, partyName, amount, itemName, quantity, rate, narration, siteName, payerType, isReceived, senderPhone }) {
  const targetCompany = (company && (company.toLowerCase().includes('sri') || company.toLowerCase().includes('smt') || company.toLowerCase().includes('meenakshi')))
    ? 'Sri Meenakshi Traders'
    : 'Dhanam Holdings';

  const xml = buildTallyVoucherXml({
    company: targetCompany,
    voucherType: voucherType || 'Receipt',
    partyName,
    amount,
    itemName,
    quantity,
    rate,
    narration,
    siteName,
    payerType
  });

  const tallyResult = await postXmlToTally(xml);
  const syncStatus = tallyResult.success ? 'Synced to Tally' : (tallyResult.error ? `Queued (Server Offline: ${tallyResult.error})` : 'Queued for Local Sync');

  // Log to Google Sheet for audit trail & offline queue
  try {
    const keyPath = path.resolve(__dirname, 'google_drive_key.json');
    if (google && fs.existsSync(keyPath)) {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const tabName = targetCompany === 'Sri Meenakshi Traders' ? 'SMT_Tally_Vouchers' : 'Dhanam_Tally_Vouchers';

      // Check / Create sheet tab
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetExists = meta.data.sheets.some(s => s.properties.title === tabName);
      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{ addSheet: { properties: { title: tabName } } }]
          }
        });
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tabName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Company', 'Voucher_Type', 'Party_Name', 'Item', 'Qty', 'Rate', 'Amount', 'Site_Name', 'Payer_Type', 'Status', 'Tally_Sync_Status', 'Narration']]
          }
        });
      }

      const istDate = getISTDateString();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            new Date().toISOString(),
            istDate,
            targetCompany,
            voucherType || 'Receipt',
            partyName,
            itemName || '-',
            quantity || 1,
            rate || amount,
            amount,
            siteName || '-',
            payerType || 'Self',
            isReceived ? 'Received' : 'Pending',
            syncStatus,
            narration || '-'
          ]]
        }
      });
    }
  } catch (sheetErr) {
    console.error('Tally Google Sheet Log Error:', sheetErr.message);
  }

  return {
    success: true,
    company: targetCompany,
    voucherType: voucherType || 'Receipt',
    partyName,
    amount,
    tallySynced: tallyResult.success,
    syncStatus,
    narration
  };
}

const TALLY_LEDGER_PATH = path.resolve(__dirname, 'data', 'dhanam_tally_vouchers.json');

function loadLocalTallyLedger() {
  try {
    if (fs.existsSync(TALLY_LEDGER_PATH)) {
      return JSON.parse(fs.readFileSync(TALLY_LEDGER_PATH, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return [];
}

function saveLocalTallyLedger(entries) {
  const dir = path.dirname(TALLY_LEDGER_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TALLY_LEDGER_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Full CRUD helper for Tally Prime vouchers (with local ledger fallback for offline/read/update/delete)
 */
async function executeTallyCrud({
  operation,
  voucherId = null,
  company = 'Dhanam Holdings',
  voucherType = 'Receipt',
  partyName = '',
  amount = null,
  siteName = '',
  payerType = 'Owner',
  isReceived = true,
  narration = ''
}) {
  const op = (operation || 'read').toLowerCase();
  const ledger = loadLocalTallyLedger();

  if (op === 'create') {
    const res = await processTallyVoucher({
      company,
      voucherType,
      partyName,
      amount: Number(amount) || 0,
      siteName,
      payerType,
      isReceived,
      narration
    });
    const record = {
      id: `TLY-${Date.now().toString(36).toUpperCase()}`,
      company: res.company,
      voucherType: res.voucherType,
      partyName: res.partyName,
      amount: Number(amount) || 0,
      siteName: siteName || 'General Project',
      payerType: payerType || 'Owner',
      isReceived: Boolean(isReceived),
      narration: narration || `${siteName || 'Site'} - ${voucherType} for ${partyName}`,
      tallySynced: res.tallySynced,
      syncStatus: res.syncStatus,
      createdAt: new Date().toISOString()
    };
    ledger.push(record);
    saveLocalTallyLedger(ledger);
    return { success: true, operation: 'create', record, ...res };
  }

  if (op === 'read' || op === 'list' || op === 'get') {
    const pFilter = (partyName || '').toLowerCase().trim();
    const sFilter = (siteName || '').toLowerCase().trim();
    const idFilter = (voucherId || '').trim();

    const matched = ledger.filter((v) => {
      if (idFilter && v.id !== idFilter) return false;
      if (pFilter && !(v.partyName || '').toLowerCase().includes(pFilter)) return false;
      if (sFilter && !(v.siteName || '').toLowerCase().includes(sFilter)) return false;
      return true;
    });

    return {
      success: true,
      operation: 'read',
      count: matched.length,
      vouchers: matched.slice(-20)
    };
  }

  if (op === 'update' || op === 'alter') {
    let idx = -1;
    if (voucherId) {
      idx = ledger.findIndex((v) => v.id === voucherId);
    } else {
      const pFilter = (partyName || '').toLowerCase().trim();
      const sFilter = (siteName || '').toLowerCase().trim();
      for (let i = ledger.length - 1; i >= 0; i--) {
        const v = ledger[i];
        const pOk = !pFilter || (v.partyName || '').toLowerCase().includes(pFilter);
        const sOk = !sFilter || (v.siteName || '').toLowerCase().includes(sFilter);
        if (pOk && sOk) { idx = i; break; }
      }
    }

    if (idx === -1) {
      return { success: false, error: 'Matching Tally voucher not found in ledger for update.' };
    }

    const target = ledger[idx];
    if (voucherType) target.voucherType = voucherType;
    if (partyName) target.partyName = partyName;
    if (amount !== null && amount !== undefined) target.amount = Number(amount);
    if (siteName) target.siteName = siteName;
    if (payerType) target.payerType = payerType;
    if (isReceived !== undefined) target.isReceived = Boolean(isReceived);
    if (narration) target.narration = narration;
    target.updatedAt = new Date().toISOString();

    const xml = buildTallyVoucherXml({
      company: target.company,
      voucherType: target.voucherType,
      partyName: target.partyName,
      amount: target.amount,
      narration: target.narration,
      siteName: target.siteName,
      payerType: target.payerType
    }).replace('ACTION="Create"', 'ACTION="Alter"');

    const tallyResult = await postXmlToTally(xml);
    target.tallySynced = tallyResult.success;
    target.syncStatus = tallyResult.success ? 'Altered in Tally' : 'Updated in Local Ledger (Tally Offline)';
    saveLocalTallyLedger(ledger);

    return { success: true, operation: 'update', record: target };
  }

  if (op === 'delete' || op === 'cancel') {
    let idx = -1;
    if (voucherId) {
      idx = ledger.findIndex((v) => v.id === voucherId);
    } else {
      const pFilter = (partyName || '').toLowerCase().trim();
      const sFilter = (siteName || '').toLowerCase().trim();
      for (let i = ledger.length - 1; i >= 0; i--) {
        const v = ledger[i];
        const pOk = !pFilter || (v.partyName || '').toLowerCase().includes(pFilter);
        const sOk = !sFilter || (v.siteName || '').toLowerCase().includes(sFilter);
        if (pOk && sOk) { idx = i; break; }
      }
    }

    if (idx === -1) {
      return { success: false, error: 'Matching Tally voucher not found in ledger for delete.' };
    }

    const [removed] = ledger.splice(idx, 1);
    saveLocalTallyLedger(ledger);
    return { success: true, operation: 'delete', deletedVoucher: removed };
  }

  return { success: false, error: `Unsupported Tally operation: ${operation}` };
}

module.exports = {
  buildTallyVoucherXml,
  postXmlToTally,
  processTallyVoucher,
  executeTallyCrud
};
