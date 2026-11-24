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
    aliases: [
      'kesavan',
      'கேசவன்',
      'kesavan oil',
      'கேசவன் ஆயில்',
      '7871762490',
      '917871762490',
      '+917871762490',
      'suresh',
      'suresh 2',
      'suresh rosy',
      'suresh rosy (magizhini st)',
      'sr',
      's.r',
      's r'
    ],
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

const ORDERS_FILE = path.join(__dirname, 'data', 'smt_orders.json');

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
    }
  } catch (e) {
    console.error('Error loading smt_orders.json:', e);
  }
  return [];
}

function saveOrder(order) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const orders = loadOrders();
    orders.unshift(order);
    if (orders.length > 200) orders.length = 200;
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving smt_orders.json:', e);
    return false;
  }
}

function getOrder(billNumber) {
  const orders = loadOrders();
  if (!billNumber || billNumber === 'latest') return orders[0] || null;
  const clean = billNumber.replace(/^#/, '').toLowerCase().trim();
  return orders.find(o => (o.billNumber || '').replace(/^#/, '').toLowerCase() === clean) || null;
}

const queuedBillPdfs = new Map(); // chatId -> { buffer, fileName, caption, timestamp }

function pruneQueuedPdfs() {
  const now = Date.now();
  for (const [key, val] of queuedBillPdfs.entries()) {
    if (val && val.timestamp && (now - val.timestamp > 10 * 60 * 1000)) {
      queuedBillPdfs.delete(key);
    }
  }
  if (queuedBillPdfs.size > 50) {
    const oldestKey = queuedBillPdfs.keys().next().value;
    if (oldestKey) queuedBillPdfs.delete(oldestKey);
  }
}

function queueBillPdf(chatId, pdfData) {
  if (chatId) {
    pruneQueuedPdfs();
    const entry = { ...pdfData, timestamp: Date.now() };
    queuedBillPdfs.set(chatId, entry);
    const cleanDigits = chatId.replace(/\D/g, '');
    if (cleanDigits) queuedBillPdfs.set(cleanDigits, entry);
  }
}

function getQueuedBillPdf(chatId) {
  if (!chatId) return null;
  const cleanDigits = chatId.replace(/\D/g, '');
  const data = queuedBillPdfs.get(chatId) || (cleanDigits ? queuedBillPdfs.get(cleanDigits) : null);
  if (data) {
    queuedBillPdfs.delete(chatId);
    if (cleanDigits) queuedBillPdfs.delete(cleanDigits);
    return data;
  }
  return null;
}

function generateThermalBillHtml(order) {
  if (!order) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;">
      <h2>❌ பில் கிடைக்கவில்லை (Bill Not Found)</h2>
      <p>இந்த பில் எண் எங்கள் பதிவில் இல்லை. மீண்டும் சரிபார்க்கவும்.</p>
    </body></html>`;
  }

  const itemsRows = (order.items || []).map((it, idx) => `
    <tr>
      <td style="padding: 6px 2px; text-align: left; font-weight: bold; border-bottom: 1px dashed #cbd5e1;">
        ${idx + 1}. ${it.item}
        <div style="font-size: 11px; color: #475569; font-weight: 500; margin-top: 2px;">
          ${it.boxes} Box (${it.piecesPerBox} pouches/box = ${it.totalPouches} pkt) @ ₹${it.ratePerBox}/Box
        </div>
      </td>
      <td style="padding: 6px 2px; text-align: right; font-weight: 800; vertical-align: top; border-bottom: 1px dashed #cbd5e1; white-space: nowrap;">
        ₹${it.lineTotal.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN');
  const cleanBillNo = (order.billNumber || '').replace(/[^a-zA-Z0-9-]/g, '');

  return `<!DOCTYPE html>
<html lang="ta">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMT Thermal Bill ${order.billNumber} - Sri Meenakshi Traders</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body { margin: 0; padding: 0; background: #fff !important; }
      .no-print { display: none !important; }
      .bill-card {
        box-shadow: none !important;
        border: none !important;
        width: 78mm !important;
        max-width: 78mm !important;
        padding: 6mm 4mm !important;
        margin: 0 auto !important;
      }
    }
    * { box-sizing: border-box; }
    body {
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 12px 48px;
      margin: 0;
      color: #0f172a;
    }

    .action-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
      width: 100%;
      max-width: 360px;
    }
    .btn-row {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 12px 14px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-pdf {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
    }
    .btn-pdf:hover { background: #dc2626; transform: translateY(-1px); }
    .btn-print {
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .btn-print:hover { background: #059669; transform: translateY(-1px); }

    .demo-pill {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      text-align: center;
      font-weight: 600;
    }

    /* 80mm Thermal Receipt Spec (approx 320px - 340px) */
    .bill-card {
      background: #ffffff;
      width: 100%;
      max-width: 340px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      position: relative;
    }

    .header {
      text-align: center;
      border-bottom: 2px dashed #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .store-title {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .store-sub {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }
    .store-tag {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.3;
    }

    .badge-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 10px 0 8px;
    }
    .token-badge {
      background: #0f172a;
      color: #fff;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .bill-type-badge {
      background: #e2e8f0;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 800;
      border: 1px solid #cbd5e1;
    }

    .info-table {
      width: 100%;
      font-size: 11.5px;
      margin-bottom: 10px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 6px;
    }
    .info-table td { padding: 2px 0; }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin: 8px 0;
    }
    .items-table th {
      border-bottom: 1.5px solid #0f172a;
      padding: 4px 2px;
      font-size: 11px;
      color: #334155;
    }

    .total-box {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 8px 0;
      margin: 12px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label { font-size: 13px; font-weight: 800; color: #0f172a; }
    .total-val { font-size: 18px; font-weight: 900; color: #047857; }

    .fast-lane {
      background: #f0fdf4;
      border: 1.5px solid #16a34a;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #166534;
      margin: 10px 0 8px;
    }

    .barcode-sim {
      text-align: center;
      margin: 8px 0 4px;
      font-family: 'Courier New', monospace;
      font-size: 22px;
      letter-spacing: 5px;
      color: #1e293b;
      user-select: none;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #64748b;
      margin-top: 8px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div class="demo-pill">🖨️ 80mm Thermal Receipt Spec (Demo Mode)</div>
    <div class="btn-row">
      <button class="btn btn-pdf" onclick="downloadThermalPdf()">
        📥 Download Thermal PDF
      </button>
      <button class="btn btn-print" onclick="window.print()">
        🖨️ Print Slip
      </button>
    </div>
  </div>

  <div id="thermal-bill" class="bill-card">
    <div class="header">
      <h1 class="store-title">ஸ்ரீ மீனாட்சி டிரேடர்ஸ்</h1>
      <div class="store-sub">SRI MEENAKSHI TRADERS</div>
      <div class="store-tag">
        எண்ணெய் மொத்த மண்டி • Edible Oils Wholesale<br>
        Madurai, Tamil Nadu • Ph: +91 93615 99097
      </div>
    </div>

    <div class="badge-wrap">
      <span class="token-badge">${order.billNumber}</span>
      <span class="bill-type-badge">${(order.billingType || 'CASH').toUpperCase()} BILL</span>
    </div>

    <table class="info-table">
      <tr>
        <td style="color:#64748b;">வாடிக்கையாளர்:</td>
        <td style="text-align:right; font-weight:800; color:#0f172a;">${order.customerName}</td>
      </tr>
      ${order.address ? `<tr><td style="color:#64748b;">முகவரி:</td><td style="text-align:right; font-weight:600;">${order.address}</td></tr>` : ''}
      ${order.phone ? `<tr><td style="color:#64748b;">போன் எண்:</td><td style="text-align:right;">${order.phone}</td></tr>` : ''}
      ${order.billingType === 'GST' ? `<tr><td style="color:#64748b;">Seller GSTIN:</td><td style="text-align:right; font-weight:700;">33AABCS1234F1Z5</td></tr>` : ''}
      ${order.gstNumber ? `<tr><td style="color:#64748b;">Buyer GSTIN:</td><td style="text-align:right; font-weight:700;">${order.gstNumber}</td></tr>` : ''}
      <tr>
        <td style="color:#64748b;">தேதி & நேரம்:</td>
        <td style="text-align:right; font-size:11px;">${dateStr}</td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:left;">சரக்கு விபரம் (ITEM)</th>
          <th style="text-align:right;">தொகை (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    ${order.billingType === 'GST' ? `
    <div style="font-size: 11px; color: #475569; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
      <div style="display:flex; justify-content:space-between;"><span>Taxable Value (வரிக்கான மதிப்பு):</span><span style="font-weight:700;">₹${(order.totalAmount / 1.05).toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>CGST (2.5% மத்திய ஜிஎஸ்டி):</span><span style="font-weight:700;">₹${(((order.totalAmount - order.totalAmount / 1.05) / 2)).toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>SGST (2.5% மாநில ஜிஎஸ்டி):</span><span style="font-weight:700;">₹${(((order.totalAmount - order.totalAmount / 1.05) / 2)).toFixed(2)}</span></div>
      <div style="display:flex; justify-content:space-between; font-weight:800; color:#0f172a;"><span>Total 5% GST:</span><span>₹${(order.totalAmount - order.totalAmount / 1.05).toFixed(2)}</span></div>
    </div>
    ` : ''}

    <div class="total-box">
      <span class="total-label">மொத்த தொகை (TOTAL INVOICE):</span>
      <span class="total-val">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</span>
    </div>

    <div class="fast-lane">
      ⚡ <b>ஃபாஸ்ட்-லேன் பிக்-அப் டோக்கன்</b><br>
      வரிசையில் நிற்காமல் டோக்கன் காட்டி லோடு ஏற்றவும்!
    </div>

    <div class="barcode-sim">||||| | |||| ||| |||||||</div>

    <div class="footer">
      Tally Prime Status: ${order.tallyStatus || 'Verified & Synced'}<br>
      நன்றி! மீண்டும் வருக! 🙏 (Sri Meenakshi Traders, Madurai)
    </div>
  </div>

  <script>
    function downloadThermalPdf() {
      const element = document.getElementById('thermal-bill');
      const opt = {
        margin: [4, 2, 4, 2],
        filename: 'SMT_Thermal_Bill_${cleanBillNo}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    }

    // Auto-trigger PDF download if requested via ?download=pdf
    if (window.location.search.includes('download=pdf')) {
      setTimeout(downloadThermalPdf, 600);
    }
  </script>
</body>
</html>`;
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
      name: 'sendSmtBillPdf',
      description: 'Dispatch the official 80mm Thermal Receipt Bill PDF document directly to the customer on WhatsApp whenever an order is completed or whenever they ask for the bill, receipt, or PDF.',
      parameters: {
        type: 'OBJECT',
        properties: {
          billNumber: { type: 'STRING', description: 'Bill number e.g. #SMT-20261124-0521 or "latest"' }
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

function buildSmtSystemPrompt(chatId = '', options = {}) {
  const cleanPhone = (chatId || '').replace(/\D/g, '');
  const senderName = (options.senderName || options.pushName || '').toLowerCase().trim();
  const allCustomers = loadCustomers();

  // Multi-source candidate digits (covers WhatsApp @lid, remoteJidAlt, participant, and chatId)
  const candidateDigits = [
    cleanPhone,
    (options.remoteJid || '').replace(/\D/g, ''),
    (options.remoteJidAlt || '').replace(/\D/g, ''),
    (options.altDigits || '').replace(/\D/g, ''),
    (options.participant || '').replace(/\D/g, '')
  ].filter(d => d && d.length >= 7);

  // Match caller phone number or pushName/aliases with known customers
  let callerInfo = '';
  const matchedCustomer = allCustomers.find(c => {
    const custDigits = (c.phone || '').replace(/\D/g, '');
    const phoneMatches = custDigits && candidateDigits.some(cd => cd.endsWith(custDigits) || custDigits.endsWith(cd) || cd.includes(custDigits));
    const aliasMatches = c.aliases && c.aliases.some(a => {
      const cleanA = a.replace(/\D/g, '');
      const aliasDigitMatch = cleanA && cleanA.length >= 7 && candidateDigits.some(cd => cd.endsWith(cleanA) || cleanA.endsWith(cd) || cd.includes(cleanA));
      const aliasNameMatch = senderName && (senderName === a.toLowerCase() || senderName.includes(a.toLowerCase()) || a.toLowerCase().includes(senderName));
      return aliasDigitMatch || aliasNameMatch;
    });
    const nameMatches = senderName && (senderName.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(senderName));
    return phoneMatches || aliasMatches || nameMatches;
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
     * If they ask for a **Dummy GST Bill** ("dummy GST bill podunga", "demo GST bill", "sample GST bill", "GST bill create pannu", or want a GST bill for testing/demo): IMMEDIATELY set billingType as "GST" and call createSmtOilOrder! The system will automatically compute the 5% GST breakdown (CGST 2.5% + SGST 2.5%) and attach a demo Tamil Nadu GSTIN (33AAACL5678G1Z2).
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

async function executeSmtToolCall(fnCall, chatId, options = {}) {
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
    let q = (args.query || '').toLowerCase().trim();
    const cleanCallerPhone = (chatId || '').replace(/\D/g, '');
    const senderName = (options.senderName || options.pushName || '').toLowerCase().trim();

    // If query is empty, generic, or mentions "ennoda" / "my number" / "number" / "na yaaru" / "who am i" / "theriutha"
    if (!q || /^(my|me|mine|ennoda|en|enga|current|sender|caller|who|na|yaar|yaaru)(\s*(number|no|phone|mobile|num|digits|am|i))?$/i.test(q) || q.includes('number') || q.includes('phone') || q.includes('நம்பர்') || q.includes('yaaru') || q.includes('theriutha') || q.includes('who')) {
      if (cleanCallerPhone) q = cleanCallerPhone;
    }

    const allCustomers = loadCustomers();
    const cleanQ = q.replace(/[^0-9]/g, '');

    const found = allCustomers.find(c => {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const custDigits = cleanPhone;
      const phoneMatches = (cleanQ && cleanPhone && (cleanPhone.endsWith(cleanQ) || cleanQ.endsWith(cleanPhone))) ||
        (cleanCallerPhone && cleanPhone && (cleanPhone.endsWith(cleanCallerPhone) || cleanCallerPhone.endsWith(cleanPhone)));
      const nameMatches = c.name.toLowerCase().includes(q) || (c.address && c.address.toLowerCase().includes(q));
      const aliasMatches = c.aliases && c.aliases.some(a => {
        const cleanA = a.replace(/\D/g, '');
        return (
          q.includes(a.toLowerCase()) || a.toLowerCase().includes(q) ||
          (cleanA && cleanQ && cleanQ.endsWith(cleanA)) ||
          (cleanA && cleanCallerPhone && cleanCallerPhone.endsWith(cleanA)) ||
          (cleanA && cleanCallerPhone && cleanCallerPhone.includes(cleanA)) ||
          (senderName && (senderName.includes(a.toLowerCase()) || a.toLowerCase().includes(senderName)))
        );
      });
      const senderMatches = senderName && (senderName.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(senderName));
      return phoneMatches || nameMatches || aliasMatches || senderMatches;
    });

    if (found) {
      return {
        found: true,
        customer: found,
        message: `வாடிக்கையாளர் அடையாளம் காணப்பட்டார்: ${found.name} (${found.address}), பில்லிங் முறை: ${found.defaultBilling} Bill.`
      };
    }
    return { found: false, message: `புதிய வாடிக்கையாளர் (New Customer: ${cleanQ || cleanCallerPhone || senderName || args.query})` };
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
    const billingType = (args.billingType || 'Cash').toUpperCase() === 'GST' ? 'GST' : 'Cash';
    // If GST requested but no GSTIN provided (dummy/demo GST bill), assign standard Tamil Nadu demo GSTIN
    const gstNo = args.gstNumber || (billingType === 'GST' ? '33AAACL5678G1Z2' : null);
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

      const rawBoxes = Number(orderItem.boxes);
      const boxes = Math.max(1, Math.min(1000, Math.floor(Math.abs(!isNaN(rawBoxes) && rawBoxes > 0 ? rawBoxes : 1))));
      const rawPieces = Number(orderItem.pieces);
      const loosePieces = Math.max(0, Math.min(1000, Math.floor(Math.abs(!isNaN(rawPieces) && rawPieces > 0 ? rawPieces : 0))));

      let ratePerBox = 0;
      let piecesPerBox = 10;
      let displayName = orderItem.itemDescription || 'Oil Box';

      if (matched) {
        ratePerBox = Math.max(1, Number(orderItem.customRatePerBox) || matched.ratePerBox);
        piecesPerBox = Math.max(1, matched.piecesPerBox || 10);
        displayName = matched.name;
      } else {
        ratePerBox = Math.max(1, Number(orderItem.customRatePerBox) || 1300);
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

    const allCustomers = loadCustomers();
    const matchedCust = allCustomers.find(c =>
      (customerName && c.name && (c.name.includes(customerName) || customerName.includes(c.name))) ||
      (c.aliases && c.aliases.some(a => customerName && customerName.toLowerCase().includes(a.toLowerCase())))
    );

    const callerPhone = args.phone || (matchedCust ? matchedCust.phone : '') || (chatId ? chatId.split('@')[0].replace(/\D/g, '') : '');
    const cleanId = billNumber.replace(/^#/, '');
    const printUrl = `https://whatsapp-assistant-iqpi.onrender.com/bill/${cleanId}`;

    const orderRecord = {
      billNumber: billNumber,
      createdAt: new Date().toISOString(),
      customerName: customerName,
      address: args.address || (matchedCust ? matchedCust.address : ''),
      phone: callerPhone,
      billingType: billingType,
      gstNumber: gstNo || (matchedCust ? matchedCust.gstNumber : null),
      items: itemSummaries,
      totalAmount: totalAmount,
      tallyStatus: statusTamil,
      printUrl: printUrl
    };

    saveOrder(orderRecord);

    // Auto-generate 80mm thermal receipt PDF and queue for instant WhatsApp document delivery (awaited to prevent race condition)
    try {
      const { generateThermalReceiptPdfBuffer } = require('./thermalPdfGenerator');
      const pdfBuf = await generateThermalReceiptPdfBuffer(orderRecord);
      queueBillPdf(chatId, {
        buffer: pdfBuf,
        fileName: `SMT_Thermal_Bill_${cleanId}.pdf`,
        caption: `📄 *ஸ்ரீ மீனாட்சி டிரேடர்ஸ் - பில் ரசீது*\n📋 பில் எண்: ${billNumber} (${billingType.toUpperCase()} BILL)\n🏪 வாடிக்கையாளர்: ${customerName}\n💰 மொத்த தொகை: ₹${totalAmount.toLocaleString('en-IN')}\n⚡ ஃபாஸ்ட்-லேன் டோக்கன் (No Billing Queue - Direct Loading)`
      });
      if (callerPhone) {
        queueBillPdf(callerPhone, {
          buffer: pdfBuf,
          fileName: `SMT_Thermal_Bill_${cleanId}.pdf`,
          caption: `📄 *ஸ்ரீ மீனாட்சி டிரேடர்ஸ் - பில் ரசீது*\n📋 பில் எண்: ${billNumber} (${billingType.toUpperCase()} BILL)\n🏪 வாடிக்கையாளர்: ${customerName}\n💰 மொத்த தொகை: ₹${totalAmount.toLocaleString('en-IN')}\n⚡ ஃபாஸ்ட்-லேன் டோக்கன் (No Billing Queue - Direct Loading)`
        });
      }
    } catch (e) {
      console.warn('Failed to generate/queue PDF buffer:', e.message);
    }

    return {
      success: true,
      billNumber: billNumber,
      customerName: customerName,
      billingType: billingType,
      gstNumber: gstNo,
      items: itemSummaries,
      totalAmount: totalAmount,
      tallyStatus: statusTamil,
      printUrl: printUrl,
      pdfAttached: true,
      pickupMessage: 'கவுண்ட்டரில் பில்லிங் வரிசையில் நிற்க வேண்டாம்! இந்த பில் நம்பரைக் காட்டிவிட்டு உடனே சரக்கை லோடு ஏற்றிக்கொள்ளலாம்.'
    };
  }

  if (fnName === 'sendSmtBillPdf') {
    const billNumber = args.billNumber || 'latest';
    const order = getOrder(billNumber);
    if (!order) {
      return { success: false, message: 'பில் கிடைக்கவில்லை (Bill not found).' };
    }
    try {
      const { generateThermalReceiptPdfBuffer } = require('./thermalPdfGenerator');
      const pdfBuf = await generateThermalReceiptPdfBuffer(order);
      const cleanId = (order.billNumber || 'BILL').replace(/[^a-zA-Z0-9-]/g, '');
      queueBillPdf(chatId, {
        buffer: pdfBuf,
        fileName: `SMT_Thermal_Bill_${cleanId}.pdf`,
        caption: `📄 *ஸ்ரீ மீனாட்சி டிரேடர்ஸ் - பில் ரசீது*\n📋 பில் எண்: ${order.billNumber}\n💰 மொத்த தொகை: ₹${(order.totalAmount || 0).toLocaleString('en-IN')}\n⚡ ஃபாஸ்ட்-லேன் பிக்-அப் டோக்கன் (No Billing Queue)`
      });
      return {
        success: true,
        message: `✅ பில் PDF (${order.billNumber}) வாட்ஸ்அப்பில் அனுப்பப்பட்டது.`
      };
    } catch (e) {
      return { success: false, message: `PDF உருவாக்க முடியவில்லை: ${e.message}` };
    }
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
  loadOrders,
  saveOrder,
  getOrder,
  generateThermalBillHtml,
  queueBillPdf,
  getQueuedBillPdf,
  SMT_TOOLS,
  buildSmtSystemPrompt,
  executeSmtToolCall
};
