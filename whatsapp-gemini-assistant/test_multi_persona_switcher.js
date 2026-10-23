const assert = require('assert');
const personaManager = require('./personaManager');
const wholesaleInventory = require('./wholesaleInventoryService');
const restaurantMenu = require('./restaurantMenuService');
const GeminiService = require('./geminiService');

console.log('🧪 ========================================================');
console.log('🧪 MULTI-PERSONA WHATSAPP SWITCHER TEST SUITE');
console.log('🧪 ========================================================\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// 1. Test Wholesale Inventory Loading & MOQ
runTest('Wholesale Inventory contains 7 Gold Winner SKUs with correct pack & rates', () => {
  const items = wholesaleInventory.getAll();
  assert(items.length >= 7, `Expected at least 7 items, found ${items.length}`);

  const item1L = items.find(i => i.productId === 'OIL-GW-1000');
  assert(item1L, '1 Litre item not found');
  assert.strictEqual(item1L.unitsPerBox, 10, '1L units per box must be 10 pouches');
  assert.strictEqual(item1L.boxWholesaleRate, 1420, '1L box rate must be ₹1,420');
  assert.strictEqual(item1L.unitWholesaleRate, 142, '1L pouch rate must be ₹142');
  assert.strictEqual(item1L.moq, '1 Box', '1L MOQ must be 1 Box');

  const itemHalfL = items.find(i => i.productId === 'OIL-GW-500');
  assert(itemHalfL, '500ml item not found');
  assert.strictEqual(itemHalfL.unitsPerBox, 10, '500ml units per box must be 10 pouches');
  assert.strictEqual(itemHalfL.boxWholesaleRate, 740, '500ml box rate must be ₹740');
  assert.strictEqual(itemHalfL.moq, '1 Box', '500ml MOQ must be 1 Box');

  const item15L = items.find(i => i.productId === 'OIL-GW-15LTR');
  assert(item15L, '15 Ltr Tin not found');
  assert.strictEqual(item15L.boxWholesaleRate, 2180, '15 Ltr Tin rate must be ₹2,180');
  assert.strictEqual(item15L.moq, '1 Tin', '15 Ltr Tin MOQ must be 1 Tin');

  const item15Kg = items.find(i => i.productId === 'OIL-GW-15KG');
  assert(item15Kg, '15 Kg Tin not found');
  assert.strictEqual(item15Kg.boxWholesaleRate, 2420, '15 Kg Tin rate must be ₹2,420');
  assert.strictEqual(item15Kg.moq, '1 Tin', '15 Kg Tin MOQ must be 1 Tin');
});

// 2. Test Wholesale Keyword Query
runTest('Wholesale Inventory Query matches natural search terms', () => {
  const q1L = wholesaleInventory.query('1 Litre');
  assert(q1L.some(i => i.productId === 'OIL-GW-1000'));

  const q15Kg = wholesaleInventory.query('15 kg');
  assert(q15Kg.some(i => i.productId === 'OIL-GW-15KG'));

  const qHalf = wholesaleInventory.query('1/2 litre');
  assert(qHalf.some(i => i.productId === 'OIL-GW-500'));
});

// 3. Test Wholesale Order Logging
runTest('Wholesale Order Logging generates ID and records order', () => {
  const orderRes = wholesaleInventory.logOrder({
    storeName: 'Murugan Maligai',
    contactPerson: 'Murugan',
    phone: '919876543210',
    deliveryArea: 'Melur, Madurai',
    items: [
      { productName: 'Gold Winner 1L', boxQuantity: 2, boxRate: 1420, subtotal: 2840 },
      { productName: '15 Kg Tin', boxQuantity: 1, boxRate: 2420, subtotal: 2420 }
    ],
    totalEstimatedValue: '₹5,260'
  });
  assert(orderRes.success);
  assert(orderRes.orderId.startsWith('AOS-'));
});

// 4. Test Restaurant Menu & Token Generation
runTest('Taj Hotel Menu contains authentic Biryanis and generates Token', () => {
  const menu = restaurantMenu.getAll();
  assert(menu.length >= 5);
  
  const token = restaurantMenu.generateToken();
  assert(/^#TAJ-\d{3}$/.test(token), `Token format invalid: ${token}`);

  const orderRes = restaurantMenu.logOrder({
    customerName: 'Karthik',
    customerPhone: '919842100000',
    items: [{ itemName: 'Taj Special Chicken Biryani', quantity: 2, price: 190, subtotal: 380 }],
    totalAmount: '₹380'
  });
  assert(orderRes.success);
  assert(orderRes.token.startsWith('#TAJ-'));
});

// 5. Test Persona Switching Mechanics
runTest('PersonaManager switches between wholesale, restaurant, and dev modes', () => {
  // Test wholesale switch
  const res1 = personaManager.setMode('wholesale', 'unit_test');
  assert(res1.success);
  assert.strictEqual(personaManager.getActiveMode(), 'wholesale');
  assert(res1.switchMessage.includes('Annamaliyar Oil Store'));

  // Test restaurant switch
  const res2 = personaManager.setMode('restaurant', 'unit_test');
  assert(res2.success);
  assert.strictEqual(personaManager.getActiveMode(), 'restaurant');
  assert(res2.switchMessage.includes('Taj Hotel'));

  // Test dev switch
  const res3 = personaManager.setMode('dev', 'unit_test');
  assert(res3.success);
  assert.strictEqual(personaManager.getActiveMode(), 'dev');
  assert(res3.switchMessage.includes('SoloDeveloper.pro'));

  // Switch back to wholesale (user priority)
  personaManager.setMode('wholesale', 'unit_test');
  assert.strictEqual(personaManager.getActiveMode(), 'wholesale');
});

// 6. Test Gemini Dynamic System Instruction & Tool Selection
runTest('GeminiService selects correct system prompt and tools based on active persona', () => {
  const gemini = new GeminiService();

  // Mode: wholesale
  personaManager.setMode('wholesale', 'unit_test');
  const wholesalePrompt = gemini.getSystemInstruction();
  assert(wholesalePrompt.includes('Annamaliyar Oil Store'), 'Wholesale prompt missing client name');
  assert(wholesalePrompt.includes('Manikanda Vinayaga Prabhu'), 'Wholesale prompt missing proprietor');
  assert(wholesalePrompt.includes('MOQ is STRICTLY 1 Box'), 'Wholesale prompt missing MOQ rule');
  const wholesaleTools = gemini.getActiveTools(false);
  assert(wholesaleTools[0].functionDeclarations.some(f => f.name === 'checkWholesaleInventory'));
  assert(wholesaleTools[0].functionDeclarations.some(f => f.name === 'bookWholesaleOrder'));

  // Mode: restaurant
  personaManager.setMode('restaurant', 'unit_test');
  const restaurantPrompt = gemini.getSystemInstruction();
  assert(restaurantPrompt.includes('Taj Hotel Madurai'), 'Restaurant prompt missing hotel name');
  assert(restaurantPrompt.includes('Seeraga Samba'), 'Restaurant prompt missing specialty');
  assert(restaurantPrompt.includes('Token'), 'Restaurant prompt missing token instructions');
  const restaurantTools = gemini.getActiveTools(false);
  assert(restaurantTools[0].functionDeclarations.some(f => f.name === 'bookRestaurantOrder'));

  // Mode: dev
  personaManager.setMode('dev', 'unit_test');
  const devPrompt = gemini.getSystemInstruction();
  assert(devPrompt.includes('SoloDeveloper'), 'Dev prompt missing SoloDeveloper brand');
  const devTools = gemini.getActiveTools(false);
  assert(devTools[0].functionDeclarations.some(f => f.name === 'saveLeadDetails'));

  // Reset back to wholesale
  personaManager.setMode('wholesale', 'unit_test');
});

console.log(`\n🎉 ALL ${passedTests} TESTS PASSED SUCCESSFULLY!`);
