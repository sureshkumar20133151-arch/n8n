const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Paths to CSV file (supports both running from repo root or whatsapp-gemini-assistant dir)
const CSV_PATHS = [
  path.resolve(__dirname, '..', 'project', '05_wholesale_whatsapp_agent', 'annamaliyar_oil_store_inventory.csv'),
  path.resolve(__dirname, 'data', 'annamaliyar_oil_store_inventory.csv'),
  path.resolve(__dirname, 'annamaliyar_oil_store_inventory.csv')
];

const ORDERS_LOG_PATH = path.resolve(__dirname, 'wholesale_orders.json');
const SHEET_CONFIG_PATH = path.resolve(__dirname, 'wholesale_sheet_config.json');

const N8N_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';
const OWNER_PHONE = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');

function extractSheetId(urlOrId = '') {
  const str = String(urlOrId).trim();
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(str)) return str;
  return null;
}

class WholesaleInventoryService {
  constructor() {
    this.inventory = [];
    this.lastLoaded = null;
    this.sheetCsvUrl = process.env.WHOLESALE_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/157UsO4SU9AQaIE3x-O-uiP-H2f95TR29r5P7dHRRkKQ/export?format=csv';
    this.sheetId = process.env.WHOLESALE_SHEET_ID || '157UsO4SU9AQaIE3x-O-uiP-H2f95TR29r5P7dHRRkKQ';
    this.sheetTab = process.env.WHOLESALE_SHEET_TAB || 'Sheet1';
    this.loadSheetConfig();
    this.loadInventory();
    if (this.sheetCsvUrl) {
      this.syncFromGoogleSheet().catch(() => {});
    }
  }

  loadSheetConfig() {
    try {
      if (fs.existsSync(SHEET_CONFIG_PATH)) {
        const cfg = JSON.parse(fs.readFileSync(SHEET_CONFIG_PATH, 'utf-8'));
        if (cfg.sheetId) this.sheetId = cfg.sheetId;
        if (cfg.sheetTab) this.sheetTab = cfg.sheetTab;
        if (cfg.sheetCsvUrl) this.sheetCsvUrl = cfg.sheetCsvUrl;
      }
    } catch (e) {
      console.warn(`[Wholesale Inventory] Could not load sheet config: ${e.message}`);
    }
  }

  setSheetConfig(urlOrId, tabName = 'Sheet1') {
    const parsedId = extractSheetId(urlOrId);
    if (!parsedId) {
      return { success: false, message: 'Invalid Google Sheet URL or ID' };
    }
    this.sheetId = parsedId;
    this.sheetTab = tabName || this.sheetTab || 'Sheet1';
    this.sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${parsedId}/export?format=csv`;
    try {
      fs.writeFileSync(SHEET_CONFIG_PATH, JSON.stringify({
        sheetId: this.sheetId,
        sheetTab: this.sheetTab,
        sheetCsvUrl: this.sheetCsvUrl,
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf-8');
    } catch (e) {
      console.warn(`[Wholesale Inventory] Failed to save sheet config: ${e.message}`);
    }
    return { success: true, sheetId: this.sheetId, sheetTab: this.sheetTab, sheetCsvUrl: this.sheetCsvUrl };
  }

  getResolvedCsvPath() {
    for (const p of CSV_PATHS) {
      if (fs.existsSync(p)) return p;
    }
    return CSV_PATHS[0];
  }

  parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const items = [];
    const isSimple3Col = headers.some(h => h.toLowerCase() === 'products') && headers.some(h => h.toLowerCase() === 'price');

    for (let i = 1; i < lines.length; i++) {
      // Split on comma while preserving simple values
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < 2) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] !== undefined ? cols[idx] : '';
      });

      if (isSimple3Col) {
        const prodName = row.Products || row.products || '';
        if (!prodName) continue;
        const priceNum = parseInt((row.Price || row.price || '').replace(/\D/g, ''), 10) || 0;
        const stockNum = parseInt((row.Stock || row.stock || '0').replace(/\D/g, ''), 10) || 0;
        items.push({
          productId: `OIL-${i}`,
          category: 'Edible Oil',
          brand: prodName.toLowerCase().includes('gold winner') ? 'Gold Winner' : 'Annamaliyar / Local',
          name: prodName,
          packSize: '',
          unitsPerBox: 1,
          unitWholesaleRate: priceNum,
          boxWholesaleRate: priceNum,
          unitMrp: 0,
          boxMrp: 0,
          stockBoxes: stockNum,
          status: stockNum > 0 ? 'In Stock' : 'Out of Stock',
          moq: '1 Unit / 1 Box',
          lastUpdated: new Date().toISOString()
        });
        continue;
      }

      if (cols.length < headers.length) continue;

      // Parse and normalize numeric rates
      const unitRateNum = parseInt((row.Unit_Wholesale_Rate || '').replace(/\D/g, ''), 10) || 0;
      const boxRateNum = parseInt((row.Box_Wholesale_Rate || '').replace(/\D/g, ''), 10) || 0;
      const unitMrpNum = parseInt((row.Unit_MRP || '').replace(/\D/g, ''), 10) || 0;
      const boxMrpNum = parseInt((row.Box_MRP || '').replace(/\D/g, ''), 10) || 0;
      const unitsPerBox = parseInt((row.Units_Per_Box || '').replace(/\D/g, ''), 10) || 1;
      const stockBoxes = parseInt((row.Stock_Boxes || '').replace(/\D/g, ''), 10) || 0;

      items.push({
        productId: row.Product_ID,
        category: row.Category || 'Edible Oil',
        brand: row.Brand || 'Gold Winner',
        name: row.Product_Name || 'Gold Winner Refined Sunflower Oil',
        packSize: row.Pack_Size,
        unitsPerBox: unitsPerBox,
        unitWholesaleRate: unitRateNum,
        boxWholesaleRate: boxRateNum,
        unitMrp: unitMrpNum,
        boxMrp: boxMrpNum,
        stockBoxes: stockBoxes,
        status: row.Stock_Status || (stockBoxes > 0 ? 'In Stock' : 'Out of Stock'),
        moq: row.MOQ || '1 Box',
        lastUpdated: row.Last_Updated || new Date().toISOString()
      });
    }

    return items;
  }

  loadInventory() {
    try {
      const csvPath = this.getResolvedCsvPath();
      if (fs.existsSync(csvPath)) {
        const raw = fs.readFileSync(csvPath, 'utf-8');
        this.inventory = this.parseCsv(raw);
        this.lastLoaded = new Date().toISOString();
        console.log(`📦 [Wholesale Inventory] Loaded ${this.inventory.length} items from ${csvPath}`);
        return this.inventory;
      }
    } catch (err) {
      console.error(`[Wholesale Inventory Error]: Failed to load CSV: ${err.message}`);
    }

    // Fallback embedded data if file reading fails
    this.inventory = [
      {
        productId: 'OIL-GW-1000',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '1 Litre Pouch',
        unitsPerBox: 10,
        unitWholesaleRate: 142,
        boxWholesaleRate: 1420,
        unitMrp: 165,
        boxMrp: 1650,
        stockBoxes: 150,
        status: 'In Stock',
        moq: '1 Box'
      },
      {
        productId: 'OIL-GW-500',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '500ml (1/2 Litre) Pouch',
        unitsPerBox: 10,
        unitWholesaleRate: 74,
        boxWholesaleRate: 740,
        unitMrp: 88,
        boxMrp: 880,
        stockBoxes: 85,
        status: 'In Stock',
        moq: '1 Box'
      },
      {
        productId: 'OIL-GW-200',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '200ml Pouch',
        unitsPerBox: 48,
        unitWholesaleRate: 32,
        boxWholesaleRate: 1536,
        unitMrp: 39,
        boxMrp: 1872,
        stockBoxes: 60,
        status: 'In Stock',
        moq: '1 Box'
      },
      {
        productId: 'OIL-GW-100',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '100ml Pouch',
        unitsPerBox: 96,
        unitWholesaleRate: 17,
        boxWholesaleRate: 1632,
        unitMrp: 22,
        boxMrp: 2112,
        stockBoxes: 45,
        status: 'In Stock',
        moq: '1 Box'
      },
      {
        productId: 'OIL-GW-5000',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '5 Litre Can',
        unitsPerBox: 4,
        unitWholesaleRate: 740,
        boxWholesaleRate: 2960,
        unitMrp: 850,
        boxMrp: 3400,
        stockBoxes: 30,
        status: 'In Stock',
        moq: '1 Can'
      },
      {
        productId: 'OIL-GW-15LTR',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '15 Litre Commercial Tin',
        unitsPerBox: 1,
        unitWholesaleRate: 2180,
        boxWholesaleRate: 2180,
        unitMrp: 2450,
        boxMrp: 2450,
        stockBoxes: 25,
        status: 'In Stock',
        moq: '1 Tin'
      },
      {
        productId: 'OIL-GW-15KG',
        brand: 'Gold Winner',
        name: 'Gold Winner Refined Sunflower Oil',
        packSize: '15 Kilogram (Kg) Bulk Tin',
        unitsPerBox: 1,
        unitWholesaleRate: 2420,
        boxWholesaleRate: 2420,
        unitMrp: 2690,
        boxMrp: 2690,
        stockBoxes: 20,
        status: 'In Stock',
        moq: '1 Tin'
      }
    ];
    return this.inventory;
  }

  /**
   * Sync directly from live Google Sheets CSV publish link
   */
  async syncFromGoogleSheet(url = this.sheetCsvUrl) {
    if (!url) return { success: false, message: 'No Google Sheet CSV URL configured' };

    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.syncFromGoogleSheet(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return resolve({ success: false, status: res.statusCode, message: `HTTP ${res.statusCode}` });
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = this.parseCsv(data);
            if (parsed.length > 0) {
              this.inventory = parsed;
              this.lastLoaded = new Date().toISOString();
              const csvPath = this.getResolvedCsvPath();
              fs.writeFileSync(csvPath, data, 'utf-8');
              console.log(`🔄 [Google Sheet Sync] Successfully updated ${parsed.length} inventory records!`);
              resolve({ success: true, count: parsed.length, timestamp: this.lastLoaded });
            } else {
              resolve({ success: false, message: 'Empty sheet or invalid CSV structure' });
            }
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      }).on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
    });
  }

  getAll() {
    if (!this.inventory || this.inventory.length === 0) {
      this.loadInventory();
    }
    return this.inventory;
  }

  query(searchTerm = '') {
    const list = this.getAll();
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return list;

    return list.filter(item => {
      const text = `${item.productId} ${item.name} ${item.packSize} ${item.brand} ${item.unitsPerBox}`.toLowerCase();
      if (q.includes('15') && q.includes('kg') && item.packSize.toLowerCase().includes('kg')) return true;
      if (q.includes('15') && (q.includes('ltr') || q.includes('litre') || q.includes('liter')) && item.packSize.toLowerCase().includes('litre')) return true;
      if ((q.includes('1/2') || q.includes('half') || q.includes('500')) && item.packSize.includes('500ml')) return true;
      if ((q.includes('1 l') || q.includes('1l') || q.includes('1 litre') || q.includes('1000')) && item.packSize.includes('1 Litre')) return true;
      if (q.includes('200') && item.packSize.includes('200ml')) return true;
      if (q.includes('100') && !q.includes('1000') && item.packSize.includes('100ml')) return true;
      if (q.includes('5l') || q.includes('5 litre') || q.includes('can')) {
        if (item.packSize.includes('5 Litre')) return true;
      }
      return text.includes(q);
    });
  }

  formatCatalogForPrompt() {
    const items = this.getAll();
    return items.map((it, idx) => {
      const isOutOfStock = it.stockBoxes <= 0 || String(it.status).toLowerCase().includes('out');
      if (isOutOfStock) {
        return `${idx + 1}. ${it.name} - ${it.packSize} [OUT OF STOCK]:
   • Status: OUT OF STOCK (Stock: 0) — DO NOT quote as available for sale.
   • Last Sold Reference Price: ₹${it.unitWholesaleRate} / unit | ₹${it.boxWholesaleRate} per Box (mention ONLY if customer asks for last price)`;
      }
      return `${idx + 1}. ${it.name} - ${it.packSize}:
   • Units per Box: ${it.unitsPerBox} ${it.unitsPerBox === 1 ? 'Tin/Can' : 'Pouches'}
   • Retail / Single Unit Rate: ₹${it.unitWholesaleRate} / unit | Box Rate: ₹${it.boxWholesaleRate} per Box
   • MRP: ₹${it.unitMrp} / unit | ₹${it.boxMrp} per Box
   • Stock Available: ${it.stockBoxes} ${it.unitsPerBox === 1 ? 'Tins/Cans' : 'Boxes'} (In Stock — Retail 1-2 pouches & Wholesale both available)`;
    }).join('\n\n');
  }

  saveCsv() {
    try {
      const csvPath = this.getResolvedCsvPath();
      const headers = 'Product_ID,Category,Brand,Product_Name,Pack_Size,Units_Per_Box,Unit_Wholesale_Rate,Box_Wholesale_Rate,Unit_MRP,Box_MRP,Stock_Boxes,Stock_Status,MOQ,Last_Updated';
      const rows = this.getAll().map(it => [
        it.productId,
        it.category || 'Edible Oil',
        it.brand || 'Local Brand',
        (it.name || '').replace(/,/g, ' '),
        (it.packSize || '').replace(/,/g, ' '),
        it.unitsPerBox || 1,
        `₹${it.unitWholesaleRate || 0}`,
        `₹${it.boxWholesaleRate || 0}`,
        `₹${it.unitMrp || 0}`,
        `₹${it.boxMrp || 0}`,
        it.stockBoxes ?? 0,
        (it.stockBoxes <= 0 ? 'Out of Stock' : (it.status || 'In Stock')),
        (it.moq || '1 Pouch / 1 Box').replace(/,/g, ' '),
        it.lastUpdated || new Date().toISOString()
      ].join(','));
      fs.writeFileSync(csvPath, [headers, ...rows].join('\n'), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[Wholesale Inventory] Failed to save CSV: ${err.message}`);
      return false;
    }
  }

  async pushInventoryToGoogleSheet() {
    if (!this.sheetId) {
      return { success: false, skipped: true, message: 'No Google Sheet ID configured yet' };
    }
    try {
      const googleDrive = require('./googleDriveService');
      if (!googleDrive || !googleDrive.isConfigured()) {
        return { success: false, message: 'Google service account not configured' };
      }
      const token = await googleDrive.getAccessToken();
      const headers = ['Products', 'Price', 'Stock'];
      const values = [
        headers,
        ...this.getAll().map(it => [
          it.packSize && !it.name.toLowerCase().includes(it.packSize.toLowerCase())
            ? `${it.name} (${it.packSize})`
            : it.name,
          it.unitWholesaleRate || 0,
          it.stockBoxes ?? 0
        ])
      ];

      const rangeStr = `${this.sheetTab}!A1:C${values.length + 10}`;
      const payload = JSON.stringify({ range: `${this.sheetTab}!A1:C${values.length}`, majorDimension: 'ROWS', values });

      return await new Promise((resolve) => {
        const req = https.request({
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(`${this.sheetTab}!A1:C${values.length}`)}?valueInputOption=USER_ENTERED`,
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 10000
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`✅ [Wholesale Google Sheet] Synced ${this.inventory.length} products to Sheet ${this.sheetId}`);
              resolve({ success: true, count: this.inventory.length, sheetId: this.sheetId });
            } else {
              console.warn(`⚠️ [Wholesale Google Sheet] Sync HTTP ${res.statusCode}: ${body}`);
              resolve({ success: false, status: res.statusCode, message: body });
            }
          });
        });
        req.on('error', (err) => resolve({ success: false, message: err.message }));
        req.write(payload);
        req.end();
      });
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async upsertProduct(data = {}) {
    const list = this.getAll();
    const nameLower = (data.productName || '').toLowerCase().trim();
    const packLower = (data.packSize || '').toLowerCase().trim();

    let existing = list.find(it =>
      it.name.toLowerCase() === nameLower && it.packSize.toLowerCase() === packLower
    );

    const unitsPerBox = Number.isFinite(Number(data.unitsPerBox)) && Number(data.unitsPerBox) > 0
      ? Number(data.unitsPerBox)
      : (existing ? existing.unitsPerBox : (packLower.includes('tin') || packLower.includes('can') ? 1 : 10));

    const unitRate = Number.isFinite(Number(data.unitWholesaleRate))
      ? Number(data.unitWholesaleRate)
      : (existing ? existing.unitWholesaleRate : 0);

    const boxRate = Number.isFinite(Number(data.boxWholesaleRate))
      ? Number(data.boxWholesaleRate)
      : (unitRate > 0 ? unitRate * unitsPerBox : (existing ? existing.boxWholesaleRate : 0));

    const stockBoxes = data.stockBoxes !== undefined && data.stockBoxes !== null
      ? Math.max(0, parseInt(data.stockBoxes, 10) || 0)
      : (existing ? existing.stockBoxes : 20);

    const nowStr = new Date().toISOString();

    if (existing) {
      if (data.brand) existing.brand = data.brand;
      if (data.category) existing.category = data.category;
      existing.unitsPerBox = unitsPerBox;
      if (unitRate > 0) existing.unitWholesaleRate = unitRate;
      if (boxRate > 0) existing.boxWholesaleRate = boxRate;
      if (Number.isFinite(Number(data.unitMrp))) existing.unitMrp = Number(data.unitMrp);
      if (Number.isFinite(Number(data.boxMrp))) existing.boxMrp = Number(data.boxMrp);
      existing.stockBoxes = stockBoxes;
      existing.status = stockBoxes <= 0 ? 'Out of Stock' : 'In Stock';
      if (data.moq) existing.moq = data.moq;
      existing.lastUpdated = nowStr;
    } else {
      const slug = `${(data.brand || 'OIL').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      existing = {
        productId: `OIL-${slug}`,
        category: data.category || 'Edible Oil',
        brand: data.brand || 'Local / Own Brand',
        name: data.productName || 'Edible Oil',
        packSize: data.packSize || '1 Litre Pouch',
        unitsPerBox,
        unitWholesaleRate: unitRate,
        boxWholesaleRate: boxRate,
        unitMrp: Number(data.unitMrp) || (unitRate > 0 ? Math.round(unitRate * 1.15) : 0),
        boxMrp: Number(data.boxMrp) || (boxRate > 0 ? Math.round(boxRate * 1.15) : 0),
        stockBoxes,
        status: stockBoxes <= 0 ? 'Out of Stock' : 'In Stock',
        moq: data.moq || '1 Pouch / 1 Box',
        lastUpdated: nowStr
      };
      list.push(existing);
    }

    this.saveCsv();
    const sheetSync = await this.pushInventoryToGoogleSheet();
    return { success: true, item: existing, sheetSync };
  }

  async updateStockOrPrice(productQuery = '', updates = {}) {
    const matches = this.query(productQuery);
    if (!matches || matches.length === 0) {
      return { success: false, message: `No matching product found for "${productQuery}"` };
    }
    const target = matches[0];
    if (Number.isFinite(Number(updates.unitWholesaleRate)) && Number(updates.unitWholesaleRate) > 0) {
      target.unitWholesaleRate = Number(updates.unitWholesaleRate);
      if (!updates.boxWholesaleRate) {
        target.boxWholesaleRate = target.unitWholesaleRate * (target.unitsPerBox || 1);
      }
    }
    if (Number.isFinite(Number(updates.boxWholesaleRate)) && Number(updates.boxWholesaleRate) > 0) {
      target.boxWholesaleRate = Number(updates.boxWholesaleRate);
    }
    if (updates.markOutOfStock === true || updates.stockBoxes === 0) {
      target.stockBoxes = 0;
      target.status = 'Out of Stock';
    } else if (updates.stockBoxes !== undefined && updates.stockBoxes !== null) {
      const s = Math.max(0, parseInt(updates.stockBoxes, 10) || 0);
      target.stockBoxes = s;
      target.status = s <= 0 ? 'Out of Stock' : 'In Stock';
    }
    target.lastUpdated = new Date().toISOString();

    this.saveCsv();
    const sheetSync = await this.pushInventoryToGoogleSheet();
    return { success: true, item: target, sheetSync };
  }

  async removeProduct(productQuery = '') {
    const matches = this.query(productQuery);
    if (!matches || matches.length === 0) {
      return { success: false, message: `No matching product found for "${productQuery}"` };
    }
    const target = matches[0];
    this.inventory = this.getAll().filter(it => it.productId !== target.productId);
    this.saveCsv();
    const sheetSync = await this.pushInventoryToGoogleSheet();
    return { success: true, removedItem: target, remainingCount: this.inventory.length, sheetSync };
  }

  logOrder(orderData) {
    try {
      const orderId = `AOS-${Date.now().toString().slice(-6)}`;
      const cleanPhone = (orderData.contactPhone || orderData.phone || '').replace(/\D/g, '');
      
      const record = {
        orderId,
        createdAt: new Date().toISOString(),
        storeName: orderData.storeName || 'Grocery Store',
        contactPerson: orderData.contactPerson || 'Store Owner',
        phone: cleanPhone,
        deliveryArea: orderData.deliveryArea || 'Madurai Market Area',
        items: orderData.items || [],
        totalEstimatedValue: orderData.totalEstimatedValue || '₹0',
        dispatchTime: '2:00 PM Daily Lorry Loading (Mattuthavani)',
        status: 'Pending Dispatch Confirmation'
      };

      // Save locally
      let orders = [];
      if (fs.existsSync(ORDERS_LOG_PATH)) {
        try {
          orders = JSON.parse(fs.readFileSync(ORDERS_LOG_PATH, 'utf-8'));
        } catch (e) {}
      }
      orders.unshift(record);
      fs.writeFileSync(ORDERS_LOG_PATH, JSON.stringify(orders.slice(0, 100), null, 2), 'utf-8');
      console.log(`📦 [Wholesale Order Saved]: ${orderId} from ${record.storeName} (${record.deliveryArea})`);

      // Dispatch to n8n webhook
      this.dispatchOrderToN8n(record);

      return {
        success: true,
        orderId,
        record
      };
    } catch (err) {
      console.error(`[Wholesale Order Log Error]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  dispatchOrderToN8n(orderRecord) {
    try {
      const postData = JSON.stringify(orderRecord);
      const options = {
        hostname: N8N_HOST,
        port: 443,
        path: '/webhook/annamaliyar-order',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        console.log(`📡 [n8n Wholesale Webhook] Order dispatched! HTTP ${res.statusCode}`);
      });
      req.on('error', (e) => {
        console.warn(`⚠️ [n8n Webhook Notice] ${e.message} (Order saved locally in wholesale_orders.json)`);
      });
      req.write(postData);
      req.end();
    } catch (err) {
      console.warn(`[Wholesale Dispatch Error]: ${err.message}`);
    }
  }
}

const wholesaleInventoryService = new WholesaleInventoryService();
module.exports = wholesaleInventoryService;
