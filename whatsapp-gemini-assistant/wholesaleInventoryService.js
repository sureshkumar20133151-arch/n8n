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

const N8N_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';
const OWNER_PHONE = (process.env.OWNER_PHONE || '919361599097').replace(/\D/g, '');

class WholesaleInventoryService {
  constructor() {
    this.inventory = [];
    this.lastLoaded = null;
    this.sheetCsvUrl = process.env.WHOLESALE_SHEET_CSV_URL || null;
    this.loadInventory();
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

    for (let i = 1; i < lines.length; i++) {
      // Split on comma while preserving simple values
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx];
      });

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
      return `${idx + 1}. ${it.name} - ${it.packSize}:
   • Units per Box: ${it.unitsPerBox} ${it.unitsPerBox === 1 ? 'Tin/Can' : 'Pouches'}
   • Wholesale Rate: ₹${it.unitWholesaleRate} / unit | ₹${it.boxWholesaleRate} per Box
   • MRP: ₹${it.unitMrp} / unit | ₹${it.boxMrp} per Box
   • Stock Available: ${it.stockBoxes} Boxes (${it.status})
   • Minimum Order (MOQ): strictly ${it.moq}`;
    }).join('\n\n');
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
