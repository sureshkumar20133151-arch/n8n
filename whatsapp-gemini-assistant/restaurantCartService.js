const fs = require('fs');
const path = require('path');
const restaurantMenu = require('./restaurantMenuService');

const CARTS_FILE = path.resolve(__dirname, 'data', 'restaurant_carts.json');

class RestaurantCartService {
  constructor() {
    this.carts = new Map();
    this.loadAllCarts();
  }

  loadAllCarts() {
    try {
      if (fs.existsSync(CARTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(CARTS_FILE, 'utf-8'));
        for (const [chatId, cart] of Object.entries(data)) {
          this.carts.set(chatId, cart);
        }
      }
    } catch (e) {
      console.warn('[RestaurantCartService] Failed to load carts from disk:', e.message);
    }
  }

  saveAllCarts() {
    try {
      const dir = path.dirname(CARTS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const obj = {};
      for (const [chatId, cart] of this.carts.entries()) {
        obj[chatId] = cart;
      }
      fs.writeFileSync(CARTS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[RestaurantCartService] Failed to save carts to disk:', e.message);
    }
  }

  getCleanChatId(chatId) {
    return String(chatId || '').trim();
  }

  getCart(chatId) {
    const id = this.getCleanChatId(chatId);
    let cart = this.carts.get(id);
    if (!cart) {
      cart = {
        chatId: id,
        status: 'EMPTY', // 'EMPTY' | 'BUILDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED'
        items: [],
        subtotal: 0,
        eligibleOffer: null,
        freeGift: null,
        total: 0,
        customerName: '',
        pickupTime: '',
        paymentMethod: '',
        token: null,
        updatedAt: new Date().toISOString()
      };
      this.carts.set(id, cart);
    }
    return cart;
  }

  recalculate(cart) {
    let subtotal = 0;
    for (const item of cart.items) {
      item.lineTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += item.lineTotal;
    }

    cart.subtotal = subtotal;

    // Highest eligible offer rule (Strictly > threshold)
    if (subtotal > 1499) {
      cart.eligibleOffer = '1 Chicken Leg Piece FREE';
      cart.freeGift = { code: 'GIFT_LEG', name: 'Chicken Leg Piece FREE', price: 0, quantity: 1 };
    } else if (subtotal > 999) {
      cart.eligibleOffer = '1 Chicken 65 Regular FREE';
      cart.freeGift = { code: 'GIFT_65', name: 'Chicken 65 Regular FREE', price: 0, quantity: 1 };
    } else if (subtotal > 499) {
      cart.eligibleOffer = '1 Omelette FREE';
      cart.freeGift = { code: 'GIFT_OMELETTE', name: 'Omelette FREE', price: 0, quantity: 1 };
    } else {
      cart.eligibleOffer = null;
      cart.freeGift = null;
    }

    cart.total = subtotal; // No hidden fees
    cart.status = cart.items.length > 0 ? (cart.status === 'CONFIRMED' ? 'CONFIRMED' : 'BUILDING') : 'EMPTY';
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  findMenuItem(query) {
    if (!query) return null;
    const cleanQ = query.toString().trim().toLowerCase();
    const allMenu = restaurantMenu.getAll();

    // 1. Direct code match (e.g. "B01", "C01", "D01")
    const codeMatch = allMenu.find(m => m.itemId?.toLowerCase() === cleanQ);
    if (codeMatch) return codeMatch;

    // 2. Exact name match
    const exactNameMatch = allMenu.find(m => m.name?.toLowerCase() === cleanQ);
    if (exactNameMatch) return exactNameMatch;

    // 3. Keyword / Synonyms
    if (cleanQ === 'chicken' || cleanQ === 'chicken biryani' || cleanQ === 'chicken briyani' || cleanQ === 'chkn biryani') {
      return allMenu.find(m => m.itemId === 'B01');
    }
    if (cleanQ === 'chicken 65 biryani' || cleanQ === 'chik 65 biryani') {
      return allMenu.find(m => m.itemId === 'B02');
    }
    if (cleanQ === 'chicken 65' || cleanQ === 'chicken 65 side' || cleanQ === 'chkn 65') {
      return allMenu.find(m => m.itemId === 'C01');
    }
    if (cleanQ === 'mutton' || cleanQ === 'mutton biryani' || cleanQ === 'mutton briyani') {
      return allMenu.find(m => m.itemId === 'B03');
    }
    if (cleanQ === 'mutton chukka biryani' || cleanQ === 'mutton sukka biryani') {
      return allMenu.find(m => m.itemId === 'B04');
    }
    if (cleanQ === 'fish biryani' || cleanQ === 'vanjaram fish biryani' || cleanQ === 'fish briyani') {
      return allMenu.find(m => m.itemId === 'B05');
    }
    if (cleanQ === 'chicken chukka' || cleanQ === 'chicken sukka' || cleanQ === 'chkn chukka') {
      return allMenu.find(m => m.itemId === 'C02');
    }
    if (cleanQ === 'mutton chukka' || cleanQ === 'mutton sukka' || cleanQ === 'sukka' || cleanQ === 'chukka') {
      return allMenu.find(m => m.itemId === 'M01');
    }
    if (cleanQ === 'rose milk' || cleanQ === 'rosemilk') {
      return allMenu.find(m => m.itemId === 'D01');
    }
    if (cleanQ === 'jigarthanda' || cleanQ === 'jigar thanda') {
      return allMenu.find(m => m.itemId === 'D02');
    }
    if (cleanQ === 'omelette' || cleanQ === 'omlet' || cleanQ === 'omlette') {
      return allMenu.find(m => m.itemId === 'E02');
    }
    if (cleanQ === 'kuska' || cleanQ === 'plain kuska') {
      return allMenu.find(m => m.itemId === 'B07');
    }

    // 4. Substring search fallback
    return allMenu.find(m => m.name.toLowerCase().includes(cleanQ));
  }

  addItem(chatId, itemQuery, quantity = 1) {
    const cart = this.getCart(chatId);
    const menuItem = this.findMenuItem(itemQuery);
    if (!menuItem) {
      return { success: false, error: `Item "${itemQuery}" not found in menu catalog.` };
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const existing = cart.items.find(it => it.code === menuItem.itemId);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.items.push({
        code: menuItem.itemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty
      });
    }

    this.recalculate(cart);
    this.saveAllCarts();
    return { success: true, cart, addedItem: menuItem.name, qty };
  }

  removeItem(chatId, itemQuery) {
    const cart = this.getCart(chatId);
    const cleanQ = (itemQuery || '').toString().toLowerCase();

    const idx = cart.items.findIndex(it =>
      it.code.toLowerCase() === cleanQ ||
      it.name.toLowerCase().includes(cleanQ) ||
      cleanQ.includes(it.name.toLowerCase())
    );

    if (idx >= 0) {
      const removed = cart.items.splice(idx, 1)[0];
      this.recalculate(cart);
      this.saveAllCarts();
      return { success: true, cart, removedItem: removed.name };
    }

    return { success: false, error: `Item "${itemQuery}" was not in the cart.` };
  }

  setQuantity(chatId, itemQuery, quantity) {
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      return this.removeItem(chatId, itemQuery);
    }

    const cart = this.getCart(chatId);
    const cleanQ = (itemQuery || '').toString().toLowerCase();
    const item = cart.items.find(it =>
      it.code.toLowerCase() === cleanQ ||
      it.name.toLowerCase().includes(cleanQ) ||
      cleanQ.includes(it.name.toLowerCase())
    );

    if (item) {
      item.quantity = qty;
      this.recalculate(cart);
      this.saveAllCarts();
      return { success: true, cart, item: item.name, newQty: qty };
    }

    return this.addItem(chatId, itemQuery, qty);
  }

  replaceItem(chatId, oldItemQuery, newItemQuery, qty = 1) {
    this.removeItem(chatId, oldItemQuery);
    return this.addItem(chatId, newItemQuery, qty);
  }

  clearCart(chatId) {
    const cart = this.getCart(chatId);
    cart.items = [];
    cart.status = 'EMPTY';
    cart.subtotal = 0;
    cart.eligibleOffer = null;
    cart.freeGift = null;
    cart.total = 0;
    this.saveAllCarts();
    return { success: true, cart };
  }

  confirmBooking(chatId, bookingDetails = {}) {
    const cart = this.getCart(chatId);
    if (!cart.items || cart.items.length === 0) {
      return { success: false, error: 'Cart is empty. Cannot confirm booking.' };
    }

    // Idempotency: If already confirmed for this session, return existing token
    if (cart.status === 'CONFIRMED' && cart.token) {
      return {
        success: true,
        alreadyConfirmed: true,
        token: cart.token,
        cart
      };
    }

    const token = restaurantMenu.generateToken();
    cart.token = token;
    cart.status = 'CONFIRMED';
    cart.customerName = bookingDetails.customerName || cart.customerName || 'Taj Biryani Customer';
    cart.pickupTime = bookingDetails.pickupTime || cart.pickupTime || '10–12 Mins';
    cart.paymentMethod = bookingDetails.paymentMethod || cart.paymentMethod || 'Cash on Pickup';
    cart.confirmedAt = new Date().toISOString();

    // Log order to kitchen orders
    restaurantMenu.logOrder({
      token,
      chatId,
      customerName: cart.customerName,
      customerPhone: chatId.replace(/\D/g, ''),
      items: cart.items.map(it => ({
        code: it.code,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        subtotal: it.lineTotal
      })),
      subtotal: cart.subtotal,
      freeGift: cart.freeGift ? cart.freeGift.name : null,
      total: cart.total,
      totalAmount: `₹${cart.total}`,
      paymentMethod: cart.paymentMethod,
      pickupWaitTime: cart.pickupTime
    });

    this.saveAllCarts();
    return {
      success: true,
      token,
      cart
    };
  }

  formatCartForPrompt(chatId) {
    const cart = this.getCart(chatId);
    if (!cart.items || cart.items.length === 0) {
      return `[CURRENT CART STATE: EMPTY (Total: ₹0). Customer has not added any items yet.]`;
    }

    const lines = cart.items.map(it => `  • ${it.name} (${it.code}) × ${it.quantity} = ₹${it.lineTotal}`);
    let offerLine = cart.freeGift
      ? `\n  🎁 Eligible Free Gift: ${cart.freeGift.name} (₹0)`
      : '';

    return `[CURRENT VERIFIED BACKEND CART:
  Status: ${cart.status}
${lines.join('\n')}${offerLine}
  Subtotal: ₹${cart.subtotal}
  Total Payable: ₹${cart.total}
  Customer Confirmed: ${cart.status === 'CONFIRMED' ? `YES (Token: ${cart.token})` : 'NO'}
]`;
  }

  formatCustomerBill(chatId) {
    const cart = this.getCart(chatId);
    if (!cart.items || cart.items.length === 0) return 'உங்கள் கார்ட் காலியாக உள்ளது.';

    const lines = cart.items.map(it => `• ${it.name} ×${it.quantity} = ₹${it.lineTotal}`);
    if (cart.freeGift) {
      lines.push(`• 🎁 ${cart.freeGift.name} = ₹0`);
    }

    return `📋 உங்கள் ஆர்டர் விவரம்:\n${lines.join('\n')}\n💰 மொத்த தொகை: ₹${cart.total}`;
  }
}

module.exports = new RestaurantCartService();
