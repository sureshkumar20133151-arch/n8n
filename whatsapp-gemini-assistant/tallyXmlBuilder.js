/**
 * Tally Prime XML Integration Engine
 * Supports both "Dhanam Holdings" and "Sri Meenakshi Traders" (SMT)
 */
const http = require('http');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

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
 * Builds standard XML Envelope for Tally Prime
 */
function buildTallyVoucherXml({ company, voucherType, partyName, amount, itemName, quantity, rate, narration, siteName, payerType }) {
  const tallyDate = getTallyCompatibleDate();
  const targetCompany = company === 'SMT' || company === 'Sri Meenakshi Traders' ? 'Sri Meenakshi Traders' : 'Dhanam Holdings';
  const numAmount = parseFloat(amount || 0);

  let voucherXml = '';
  if (voucherType === 'Sales') {
    voucherXml = `
        <VOUCHER VCHTYPE="Sales" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
          <NARRATION>${narration || ''} [Item: ${itemName || 'Goods'} Qty: ${quantity || 1} @ Rs.${rate || numAmount}]</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
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
          <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
          <NARRATION>${narration || ''} [Item: ${itemName || 'Materials'} Qty: ${quantity || 1}]</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Purchase</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${numAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`;
  } else if (voucherType === 'Receipt') {
    voucherXml = `
        <VOUCHER VCHTYPE="Receipt" ACTION="Create">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
          <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
          <NARRATION>${narration || ''} ${siteName ? `[Site: ${siteName}]` : ''} ${payerType ? `[Payer: ${payerType}]` : ''}</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
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
          <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
          <NARRATION>${narration || ''} ${siteName ? `[Site: ${siteName}]` : ''} ${payerType ? `[For: ${payerType}]` : ''}</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
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
    if (fs.existsSync(keyPath)) {
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

module.exports = {
  buildTallyVoucherXml,
  postXmlToTally,
  processTallyVoucher
};
