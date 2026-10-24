const fs = require('fs');
const path = require('path');
const https = require('https');

const MENU_PATHS = [
  path.resolve(__dirname, 'data', 'taj_hotel_menu.csv'),
  path.resolve(__dirname, '..', 'project', '06_restaurant_whatsapp_agent', 'taj_hotel_menu.csv'),
  path.resolve(__dirname, 'taj_hotel_menu.csv')
];

const KITCHEN_ORDERS_PATH = path.resolve(__dirname, 'data', 'restaurant_orders.json');
const KITCHEN_ORDERS_LEGACY_PATH = path.resolve(__dirname, 'restaurant_orders.json');
const PENDING_QUEUE_PATH = path.resolve(__dirname, 'data', 'pending_n8n_orders.json');

const N8N_HOST = process.env.N8N_WEBHOOK_HOST || 'suresh-n8n-fhr6.onrender.com';
const N8N_PATH = process.env.N8N_WEBHOOK_PATH || '/webhook/tajhotel-order';

class RestaurantMenuService {
  constructor() {
    this.menu = [];
    this.pendingQueue = [];
    this.loadMenu();
    this.loadPendingQueue();
    this.startRetryLoop();
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
      { itemId: 'B01', category: 'Biryani', name: 'Taj Special Chicken Biryani', description: 'Seeraga Samba Dum Biryani + Tender Chicken + Ennai Kathirikai Dalcha + Raitha + Sweet Bread Halwa', price: 190, prepTimeMins: 10, availability: 'Available' },
      { itemId: 'B02', category: 'Biryani', name: 'Taj Chicken 65 Biryani', description: 'Dum Biryani topped with crispy Chicken 65 + Boiled Egg + Dalcha + Raitha', price: 230, prepTimeMins: 10, availability: 'Available' },
      { itemId: 'B03', category: 'Biryani', name: 'Taj Special Mutton Biryani', description: 'Traditional Madurai tender mutton cooked in slow dum + Boiled Egg + Dalcha + Raitha', price: 290, prepTimeMins: 12, availability: 'Available' },
      { itemId: 'B04', category: 'Biryani', name: 'Taj Mutton Chukka Biryani', description: 'Seeraga Samba Biryani with spicy Madurai Mutton Chukka roast + Egg + Dalcha', price: 340, prepTimeMins: 12, availability: 'Available' },
      { itemId: 'B05', category: 'Biryani', name: 'Taj Vanjaram Fish Biryani', description: 'Premium fresh Vanjaram (Seer Fish) fry slice infused in rich Biryani rice + Raitha + Fish Gravy', price: 270, prepTimeMins: 15, availability: 'Available' },
      { itemId: 'C01', category: 'Sides', name: 'Chicken 65 – Regular', description: 'Crispy deep fried spiced chicken bites', price: 150, prepTimeMins: 8, availability: 'Available' },
      { itemId: 'C02', category: 'Sides', name: 'Madurai Chicken Chukka 250g', description: 'Spicy Madurai dry pepper roasted chicken', price: 140, prepTimeMins: 8, availability: 'Available' },
      { itemId: 'M01', category: 'Sides', name: 'Mutton Sukka Varuval 200g', description: 'Authentic Chettinad tender mutton fry', price: 210, prepTimeMins: 8, availability: 'Available' },
      { itemId: 'D01', category: 'Beverages', name: 'Madurai Special Rose Milk', description: 'Chilled creamy Rose Milk with Badam Pisin', price: 50, prepTimeMins: 2, availability: 'Available' }
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
    return items.map(it => `• ${it.name} (${it.itemId}): ₹${it.price} [${it.category}] - ${it.description}`).join('\n');
  }

  generateToken() {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `#TAJ-${randomSuffix}`;
  }

  generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `TAJ-${dateStr}-${rand}`;
  }

  logOrder(orderData) {
    try {
      const token = orderData.token || this.generateToken();
      const orderId = orderData.orderId || this.generateOrderId();
      const cleanPhone = (orderData.customerPhone || orderData.phone || '').replace(/\D/g, '');

      const structuredRecord = {
        event: 'ORDER_CONFIRMED',
        order_id: orderId,
        token: token,
        created_at: new Date().toISOString(),
        customer: {
          name: orderData.customerName || 'Taj Biryani Customer',
          phone: cleanPhone,
          whatsapp_jid: orderData.chatId || `${cleanPhone}@s.whatsapp.net`
        },
        items: (orderData.items || []).map(it => ({
          code: it.code || it.itemId || 'GEN',
          name: it.itemName || it.name,
          quantity: it.quantity || 1,
          unit_price: it.price || 0,
          subtotal: it.subtotal || ((it.price || 0) * (it.quantity || 1))
        })),
        subtotal: orderData.subtotal || 0,
        free_gift: orderData.freeGift ? {
          name: typeof orderData.freeGift === 'string' ? orderData.freeGift : orderData.freeGift.name,
          price: 0,
          quantity: 1
        } : null,
        total: orderData.total || (typeof orderData.totalAmount === 'number' ? orderData.totalAmount : parseInt(String(orderData.totalAmount || '0').replace(/\D/g, ''), 10) || 0),
        total_formatted: orderData.totalAmount || `₹${orderData.total || 0}`,
        payment_method: orderData.paymentMethod || 'CASH_ON_PICKUP',
        payment_status: 'PENDING',
        pickup_window: orderData.pickupWaitTime || orderData.pickupTime || '10–12 Mins',
        order_status: 'CONFIRMED',
        kitchen_status: 'Sent to Kitchen Display'
      };

      // Save to primary orders file
      let orders = this.getOrders();
      orders.unshift(structuredRecord);

      const dir = path.dirname(KITCHEN_ORDERS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(KITCHEN_ORDERS_PATH, JSON.stringify(orders.slice(0, 200), null, 2), 'utf-8');

      // Keep legacy file in sync for backwards compatibility
      try {
        fs.writeFileSync(KITCHEN_ORDERS_LEGACY_PATH, JSON.stringify(orders.slice(0, 100), null, 2), 'utf-8');
      } catch (e) {}

      console.log(`🍗 [Kitchen Order Logged]: Token ${token} for ${structuredRecord.customer.name} - Total: ${structuredRecord.total_formatted}`);

      // Dispatch to n8n with resilient queue
      this.dispatchOrderToN8n(structuredRecord);

      return {
        success: true,
        orderId,
        token,
        record: structuredRecord
      };
    } catch (err) {
      console.error(`[Restaurant Order Log Error]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  getOrders(limit = 100) {
    try {
      const p = fs.existsSync(KITCHEN_ORDERS_PATH) ? KITCHEN_ORDERS_PATH : (fs.existsSync(KITCHEN_ORDERS_LEGACY_PATH) ? KITCHEN_ORDERS_LEGACY_PATH : null);
      if (p) {
        const raw = fs.readFileSync(p, 'utf-8');
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list.slice(0, limit) : [];
      }
    } catch (e) {
      console.warn('[RestaurantMenuService] Failed to read orders:', e.message);
    }
    return [];
  }

  updateOrderStatus(token, newStatus) {
    try {
      const orders = this.getOrders(500);
      const match = orders.find(o => o.token === token || o.order_id === token);
      if (match) {
        match.order_status = newStatus;
        match.kitchen_status = newStatus;
        match.updated_at = new Date().toISOString();

        if (fs.existsSync(KITCHEN_ORDERS_PATH)) {
          fs.writeFileSync(KITCHEN_ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf-8');
        }
        if (fs.existsSync(KITCHEN_ORDERS_LEGACY_PATH)) {
          fs.writeFileSync(KITCHEN_ORDERS_LEGACY_PATH, JSON.stringify(orders.slice(0, 100), null, 2), 'utf-8');
        }
        return { success: true, order: match };
      }
    } catch (e) {
      console.warn('[updateOrderStatus Error]:', e.message);
    }
    return { success: false, error: 'Order not found' };
  }

  // Resilient n8n dispatch with retry queue
  loadPendingQueue() {
    try {
      if (fs.existsSync(PENDING_QUEUE_PATH)) {
        this.pendingQueue = JSON.parse(fs.readFileSync(PENDING_QUEUE_PATH, 'utf-8'));
      }
    } catch (e) {
      this.pendingQueue = [];
    }
  }

  savePendingQueue() {
    try {
      const dir = path.dirname(PENDING_QUEUE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PENDING_QUEUE_PATH, JSON.stringify(this.pendingQueue, null, 2), 'utf-8');
    } catch (e) {}
  }

  dispatchOrderToN8n(orderRecord) {
    const postData = JSON.stringify(orderRecord);
    const options = {
      hostname: N8N_HOST,
      port: 443,
      path: N8N_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Taj-Event': 'ORDER_CONFIRMED',
        'X-Taj-Token': orderRecord.token || ''
      },
      timeout: 6000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`📡 [n8n Taj Hotel Webhook] Order ${orderRecord.token} dispatched successfully! HTTP ${res.statusCode}`);
      } else {
        console.warn(`⚠️ [n8n Webhook Notice] Server responded with HTTP ${res.statusCode}. Added to retry queue.`);
        this.enqueueRetry(orderRecord);
      }
    });

    req.on('error', (e) => {
      console.warn(`⚠️ [n8n Webhook Network Error] ${e.message}. Added order ${orderRecord.token} to retry queue.`);
      this.enqueueRetry(orderRecord);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn(`⚠️ [n8n Webhook Timeout] Added order ${orderRecord.token} to retry queue.`);
      this.enqueueRetry(orderRecord);
    });

    req.write(postData);
    req.end();
  }

  enqueueRetry(orderRecord) {
    const exists = this.pendingQueue.some(p => p.token === orderRecord.token);
    if (!exists) {
      this.pendingQueue.push({
        record: orderRecord,
        attempts: 1,
        queuedAt: new Date().toISOString()
      });
      this.savePendingQueue();
    }
  }

  startRetryLoop() {
    // Retry sending pending orders every 60 seconds
    setInterval(() => {
      if (this.pendingQueue.length === 0) return;

      const item = this.pendingQueue.shift();
      if (!item) return;

      console.log(`🔄 [n8n Retry Loop] Retrying dispatch for ${item.record.token} (Attempt ${item.attempts})...`);
      item.attempts += 1;

      const postData = JSON.stringify(item.record);
      const options = {
        hostname: N8N_HOST,
        port: 443,
        path: N8N_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 6000
      };

      const req = https.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [n8n Retry Loop Success] Order ${item.record.token} successfully acknowledged!`);
          this.savePendingQueue();
        } else if (item.attempts < 10) {
          this.pendingQueue.push(item);
          this.savePendingQueue();
        }
      });

      req.on('error', () => {
        if (item.attempts < 10) {
          this.pendingQueue.push(item);
          this.savePendingQueue();
        }
      });

      req.write(postData);
      req.end();
    }, 60000);
  }
}

const restaurantMenuService = new RestaurantMenuService();
module.exports = restaurantMenuService;
