const fs = require('fs');
const path = require('path');
const https = require('https');

const MENU_PATHS = [
  path.resolve(__dirname, '..', 'project', '06_restaurant_whatsapp_agent', 'taj_hotel_menu.csv'),
  path.resolve(__dirname, 'data', 'taj_hotel_menu.csv'),
  path.resolve(__dirname, 'taj_hotel_menu.csv')
];

const KITCHEN_ORDERS_PATH = path.resolve(__dirname, 'restaurant_orders.json');
const N8N_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';

class RestaurantMenuService {
  constructor() {
    this.menu = [];
    this.lastTokenNumber = 101;
    this.loadMenu();
  }

  getResolvedMenuPath() {
    for (const p of MENU_PATHS) {
      if (fs.existsSync(p)) return p;
    }
    return MENU_PATHS[0];
  }

  parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx];
      });

      const priceNum = parseInt((row.Price || '').replace(/\D/g, ''), 10) || 0;
      const prepTime = parseInt((row.Preparation_Time_Mins || '').replace(/\D/g, ''), 10) || 10;

      items.push({
        itemId: row.Item_ID,
        category: row.Category || 'Biryani',
        name: row.Item_Name,
        description: row.Description || '',
        price: priceNum,
        prepTimeMins: prepTime,
        availability: row.Availability || 'Available'
      });
    }

    return items;
  }

  loadMenu() {
    try {
      const menuPath = this.getResolvedMenuPath();
      if (fs.existsSync(menuPath)) {
        const raw = fs.readFileSync(menuPath, 'utf-8');
        this.menu = this.parseCsv(raw);
        console.log(`🍗 [Taj Hotel Menu] Loaded ${this.menu.length} menu items from ${menuPath}`);
        return this.menu;
      }
    } catch (err) {
      console.error(`[Taj Hotel Menu Error]: Failed to load CSV: ${err.message}`);
    }

    this.menu = [
      { itemId: 'BRY-001', category: 'Biryani', name: 'Taj Special Chicken Biryani', description: 'Seeraga Samba Dum Biryani + Tender Chicken + Ennai Kathirikai Dalcha + Raitha + Sweet Bread Halwa', price: 190, prepTimeMins: 10, availability: 'Available' },
      { itemId: 'BRY-002', category: 'Biryani', name: 'Taj Chicken 65 Biryani', description: 'Dum Biryani topped with crispy Chicken 65 + Boiled Egg + Dalcha + Raitha', price: 230, prepTimeMins: 10, availability: 'Available' },
      { itemId: 'BRY-003', category: 'Biryani', name: 'Taj Special Mutton Biryani', description: 'Traditional Madurai tender mutton cooked in slow dum + Boiled Egg + Dalcha + Raitha', price: 290, prepTimeMins: 12, availability: 'Available' },
      { itemId: 'BRY-004', category: 'Biryani', name: 'Taj Mutton Chukka Biryani', description: 'Seeraga Samba Biryani with spicy Madurai Mutton Chukka roast + Egg + Dalcha', price: 340, prepTimeMins: 12, availability: 'Available' },
      { itemId: 'BRY-005', category: 'Biryani', name: 'Taj Vanjaram Fish Biryani', description: 'Premium fresh Vanjaram (Seer Fish) fry slice infused in rich Biryani rice + Raitha + Fish Gravy', price: 270, prepTimeMins: 15, availability: 'Available' },
      { itemId: 'SD-001', category: 'Sides', name: 'Madurai Chicken Chukka (250g)', description: 'Spicy Madurai dry pepper roasted chicken', price: 140, prepTimeMins: 8, availability: 'Available' },
      { itemId: 'SD-002', category: 'Sides', name: 'Mutton Sukka Varuval (200g)', description: 'Authentic Chettinad tender mutton fry', price: 210, prepTimeMins: 8, availability: 'Available' },
      { itemId: 'BV-001', category: 'Beverages', name: 'Madurai Special Rose Milk', description: 'Chilled creamy Rose Milk with Badam Pisin', price: 50, prepTimeMins: 2, availability: 'Available' }
    ];
    return this.menu;
  }

  getAll() {
    if (!this.menu || this.menu.length === 0) {
      this.loadMenu();
    }
    return this.menu;
  }

  formatMenuForPrompt() {
    const items = this.getAll();
    return items.map(it => `• ${it.name}: ₹${it.price} (${it.category}) - ${it.description}`).join('\n');
  }

  generateToken() {
    // Generate 3 digit token, e.g. #TAJ-108 or sequential
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `#TAJ-${randomSuffix}`;
  }

  logOrder(orderData) {
    try {
      const token = orderData.token || this.generateToken();
      const cleanPhone = (orderData.customerPhone || orderData.phone || '').replace(/\D/g, '');

      const record = {
        token,
        createdAt: new Date().toISOString(),
        customerName: orderData.customerName || 'Biryani Lover',
        phone: cleanPhone,
        items: orderData.items || [],
        totalAmount: orderData.totalAmount || '₹0',
        paymentMethod: orderData.paymentMethod || 'UPI (tajhotelmadurai@upi)',
        pickupWaitTime: '10–12 Mins',
        status: 'Sent to Kitchen Display'
      };

      let orders = [];
      if (fs.existsSync(KITCHEN_ORDERS_PATH)) {
        try {
          orders = JSON.parse(fs.readFileSync(KITCHEN_ORDERS_PATH, 'utf-8'));
        } catch (e) {}
      }
      orders.unshift(record);
      fs.writeFileSync(KITCHEN_ORDERS_PATH, JSON.stringify(orders.slice(0, 100), null, 2), 'utf-8');
      console.log(`🍗 [Kitchen Order Logged]: Token ${token} for ${record.customerName} - Total: ${record.totalAmount}`);

      this.dispatchOrderToN8n(record);

      return {
        success: true,
        token,
        record
      };
    } catch (err) {
      console.error(`[Restaurant Order Log Error]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  dispatchOrderToN8n(orderRecord) {
    try {
      const postData = JSON.stringify(orderRecord);
      const options = {
        hostname: N8N_HOST,
        port: 443,
        path: '/webhook/tajhotel-order',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        console.log(`📡 [n8n Taj Hotel Webhook] Order dispatched! HTTP ${res.statusCode}`);
      });
      req.on('error', (e) => {
        console.warn(`⚠️ [n8n Webhook Notice] ${e.message} (Order saved locally in restaurant_orders.json)`);
      });
      req.write(postData);
      req.end();
    } catch (err) {
      console.warn(`[Taj Hotel Dispatch Error]: ${err.message}`);
    }
  }
}

const restaurantMenuService = new RestaurantMenuService();
module.exports = restaurantMenuService;
