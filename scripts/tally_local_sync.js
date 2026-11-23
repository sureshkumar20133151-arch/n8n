/**
 * Tally Prime Local Auto-Sync Daemon
 * Runs locally on Windows PC where Tally Prime is installed.
 * Reads queued vouchers from Google Sheets and imports them into Tally Prime via Port 9000.
 */
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SPREADSHEET_ID = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
const KEY_PATH = path.resolve(__dirname, '../whatsapp-gemini-assistant/google_drive_key.json');
const TALLY_PORT = 9000;

function postXmlToTally(xmlEnvelope) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TALLY_PORT,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xmlEnvelope)
      },
      timeout: 3000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const isOk = data.includes('<CREATED>1</CREATED>') || (data.includes('<STATUS>1</STATUS>') && !data.includes('<ERRORS>1</ERRORS>'));
        resolve({ success: isOk, raw: data });
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message }));
    req.write(xmlEnvelope);
    req.end();
  });
}

function buildXml({ company, voucherType, partyName, amount, narration, tallyDate }) {
  const numAmount = parseFloat(amount || 0);
  let voucherXml = '';

  if (voucherType === 'Sales') {
    voucherXml = `
      <VOUCHER VCHTYPE="Sales" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <NARRATION>${narration || ''}</NARRATION>
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
        <NARRATION>${narration || ''}</NARRATION>
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
        <NARRATION>${narration || ''}</NARRATION>
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
    voucherXml = `
      <VOUCHER VCHTYPE="Payment" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <NARRATION>${narration || ''}</NARRATION>
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
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Import</TALLYREQUEST><TYPE>Data</TYPE><ID>Vouchers</ID></HEADER>
  <BODY>
    <DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES></DESC>
    <DATA><TALLYMESSAGE xmlns:UDF="TallyUDF">${voucherXml}</TALLYMESSAGE></DATA>
  </BODY>
</ENVELOPE>`;
}

async function syncTab(sheets, tabName) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A2:N`
    });

    const rows = res.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;
      const [timestamp, date, company, vchType, party, item, qty, rate, amount, site, payer, status, syncStatus, narration] = row;

      if (syncStatus && syncStatus.startsWith('Queued')) {
        console.log(`[SYNC] Processing row ${rowIndex} in ${tabName}: ${party} - Rs.${amount}`);
        const xml = buildXml({
          company,
          voucherType: vchType,
          partyName: party,
          amount,
          narration,
          tallyDate: '20261101'
        });

        const result = await postXmlToTally(xml);
        if (result.success) {
          console.log(`[SYNC SUCCESS] Row ${rowIndex} successfully synced to Tally!`);
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${tabName}!M${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['Synced to Tally Port 9000']] }
          });
        } else {
          console.log(`[SYNC FAILED] Tally returned error:`, result.error || result.raw);
        }
      }
    }
  } catch (err) {
    if (!err.message.includes('Unable to parse range')) {
      console.error(`Error syncing ${tabName}:`, err.message);
    }
  }
}

async function startSyncLoop() {
  console.log('🚀 Tally Prime Local Auto-Sync Daemon Started...');
  console.log('Watching Google Sheets for Queued Vouchers -> Port 9000');

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  setInterval(async () => {
    await syncTab(sheets, 'Dhanam_Tally_Vouchers');
    await syncTab(sheets, 'SMT_Tally_Vouchers');
  }, 10000); // Check every 10 seconds
}

if (require.main === module) {
  startSyncLoop();
}

module.exports = { syncTab, startSyncLoop };
