const wholesaleInventory = require('./wholesaleInventoryService');

// Tool declarations for customer orders AND owner voice/text inventory & Google Sheet updates
const WHOLESALE_TOOLS = [{
  functionDeclarations: [
    {
      name: 'bookWholesaleOrder',
      description: 'Call this tool when a retail or wholesale customer confirms an order for oil pouches, cans, boxes, or tins. Both retail (even 1-2 pouches) and wholesale (boxes/tins) orders are accepted. Collect customer/store name, area in Madurai (or pickup), and item breakdown.',
      parameters: {
        type: 'OBJECT',
        properties: {
          storeName: { type: 'STRING', description: 'Name of the retail customer or grocery store' },
          contactPerson: { type: 'STRING', description: 'Name of the person ordering' },
          deliveryArea: { type: 'STRING', description: 'Delivery area in Madurai or "Shop Pickup (Mattuthavani Shop 13)"' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                productName: { type: 'STRING' },
                packSize: { type: 'STRING' },
                boxQuantity: { type: 'INTEGER', description: 'Number of pouches, boxes, or tins' },
                boxRate: { type: 'INTEGER', description: 'Price per unit/box/tin in INR' },
                subtotal: { type: 'INTEGER', description: 'Subtotal in INR' }
              }
            },
            description: 'List of ordered items with quantities and rates'
          },
          totalEstimatedValue: { type: 'STRING', description: 'Total order value (e.g. ₹3,600)' },
          remarks: { type: 'STRING', description: 'Any special pickup or lorry transport remarks' }
        },
        required: ['storeName', 'deliveryArea', 'items']
      }
    },
    {
      name: 'upsertWholesaleProduct',
      description: 'OWNER / ADMIN ONLY: Add a new product or update an existing product (price, MRP, stock, pack size, brand) in the Annamaliyar Oil Store inventory and Google Sheet. Call this immediately when the owner sends a text or voice note to add a product or update its price.',
      parameters: {
        type: 'OBJECT',
        properties: {
          productName: { type: 'STRING', description: 'Full product name (e.g. "Gold Winner Refined Sunflower Oil", "Annamaliyar Own Brand Gingelly Oil")' },
          brand: { type: 'STRING', description: 'Brand name (e.g. Gold Winner, Annamaliyar Own, Fortune, Local Brand)' },
          category: { type: 'STRING', description: 'Category (e.g. Edible Oil, Gingelly Oil, Groundnut Oil, Palm Oil)' },
          packSize: { type: 'STRING', description: 'Pack size (e.g. 1 Litre Pouch, 500ml Pouch, 15 Litre Tin, 15 Kg Tin)' },
          unitsPerBox: { type: 'INTEGER', description: 'Number of pouches/units per box (default 10 for pouches, 1 for tins)' },
          unitWholesaleRate: { type: 'INTEGER', description: 'Single pouch/unit selling price in INR' },
          boxWholesaleRate: { type: 'INTEGER', description: 'Full box/tin selling price in INR (if omitted, calculated as unitWholesaleRate * unitsPerBox)' },
          unitMrp: { type: 'INTEGER', description: 'Single unit MRP in INR (optional)' },
          boxMrp: { type: 'INTEGER', description: 'Box MRP in INR (optional)' },
          stockBoxes: { type: 'INTEGER', description: 'Available stock in boxes/tins. Pass 0 if stock is finished / out of stock.' },
          moq: { type: 'STRING', description: 'Minimum order note (e.g. "1 Pouch (Retail & Wholesale)")' }
        },
        required: ['productName', 'packSize']
      }
    },
    {
      name: 'updateWholesaleStockOrPrice',
      description: 'OWNER / ADMIN ONLY: Quickly update the price or stock (including marking Stock = 0 / Out of Stock) of an existing product by name/packSize and sync to Google Sheet.',
      parameters: {
        type: 'OBJECT',
        properties: {
          productQuery: { type: 'STRING', description: 'Product name or pack size to match (e.g. "1 litre", "500ml", "15kg tin")' },
          unitWholesaleRate: { type: 'INTEGER', description: 'New single unit/pouch price in INR (if updating price)' },
          boxWholesaleRate: { type: 'INTEGER', description: 'New box/tin price in INR (if updating price)' },
          stockBoxes: { type: 'INTEGER', description: 'New stock count. Set to 0 if product is completely finished / out of stock.' },
          markOutOfStock: { type: 'BOOLEAN', description: 'Set true if the owner says stock is zero / finished ("ஸ்டாக் ஜீரோ", "முடிஞ்சு போச்சு")' }
        },
        required: ['productQuery']
      }
    },
    {
      name: 'setWholesaleGoogleSheet',
      description: 'OWNER / ADMIN ONLY: Save a Google Sheet URL or ID sent by the owner and sync the Annamaliyar Oil Store product catalog to/from it.',
      parameters: {
        type: 'OBJECT',
        properties: {
          sheetUrlOrId: { type: 'STRING', description: 'The Google Sheets link or Spreadsheet ID' },
          tabName: { type: 'STRING', description: 'Optional sheet tab name (default Sheet1)' },
          pushCurrentInventory: { type: 'BOOLEAN', description: 'If true, push current basic products to the Google Sheet; if false, pull from the sheet.' }
        },
        required: ['sheetUrlOrId']
      }
    },
    {
      name: 'removeWholesaleProduct',
      description: 'OWNER / ADMIN ONLY: Remove/delete a product or price entry completely from the Annamaliyar Oil Store inventory and Google Sheet when the owner asks to remove/delete it.',
      parameters: {
        type: 'OBJECT',
        properties: {
          productQuery: { type: 'STRING', description: 'Name or pack size of the product to remove (e.g. "200ml", "100ml pouch")' }
        },
        required: ['productQuery']
      }
    }
  ]
}];

function buildWholesaleSystemPrompt() {
  const catalogText = wholesaleInventory.formatCatalogForPrompt();

  return `You are "Annamaliyar Oil Store WhatsApp AI Assistant", the official digital store manager for Annamaliyar Oil Store, Madurai.

STORE PROFILE & DETAILS (ALWAYS ACCURATE):
- Store Name: Annamaliyar Oil Store (அண்ணாமலையார் ஆயில் ஸ்டோர்)
- Owner / Proprietor: Manikanda Vinayaga Prabhu (மணிகண்ட விநாயக பிரபு)
- Exact Location: Mattuthavani Vegetable Market, Shop No. 13, Madurai (மாட்டுத்தாவணி காய்கறி மார்க்கெட், ஷாப் நம்பர் 13, மதுரை)
- Opening Hours: Morning 4:00 AM to Evening 3:00 PM (sometimes extended up to 5:00 PM). Closed on Market Leave days (மார்க்கெட் லீவ் நாட்களில் கடையும் லீவ்).
- Location Sharing Rule: Whenever anyone asks where the shop is located ("கடை எங்க இருக்கு?", "location", "address"), clearly share: **அண்ணாமலையார் ஆயில் ஸ்டோர், மாட்டுத்தாவணி காய்கறி மார்க்கெட், ஷாப் நம்பர் 13, மதுரை** (Opening: காலை 4:00 மணி – மதியம் 3:00 மணி, சில நாட்கள் மாலை 5:00 மணி வரை).

SALES MODEL (RETAIL + WHOLESALE):
- We serve BOTH Wholesale (Boxes, Cartons, 15L/15Kg Tins) AND Retail customers (சில்லரை விற்பனையும் உண்டு — even 1 pouch or 2 pouches are sold!).
- Never refuse small retail quantities like 1 pouch or 2 pouches.
- We carry branded edible oils (e.g. Gold Winner) as well as quality local brands and our own store brand products.

TONE, WELCOME & CONCISE REPLY RULES:
- Greet customers warmly ("வணக்கம் அண்ணா / வணக்கம் சார் / வணக்கம்! அண்ணாமலையார் ஆயில் ஸ்டோருக்கு வரவேற்கிறோம்").
- Fluent in spoken Tamil, Tanglish, and crisp English. Match the customer's language naturally.
- Keep replies short and crisp (3 to 4 lines). Only mention the specific 1–3 products or prices the customer asked about — NEVER dump the entire catalog unless explicitly asked for the full list.
- If a customer asks about product quality ("ப்ராடக்ட் எப்படி இருக்கும்?", "நல்லா இருக்குமா?"): Reassure them warmly that the oil is very good, pure edible oil, safe and great for daily cooking/use ("நல்லா இருக்கும் சார், சுத்தமான எடிபிள் ஆயில் தான், தாராளமா யூஸ் பண்ணலாம்!").

OUT-OF-STOCK RULE (STOCK = 0 — CRITICAL):
- If a product has Stock = 0 ("Out of Stock"):
  1. Do NOT quote it as available for current sale. Clearly tell the customer it is currently out of stock ("இப்போதைக்கு இந்த ப்ராடக்ட் ஸ்டாக் இல்லை சார்").
  2. You may only mention the last sold price for reference if asked ("கடைசியாக ₹... விலைக்கு சேல் ஆச்சு, இப்போ ஸ்டாக் இல்லை").

LIVE INVENTORY & PACKAGING SPECS:
${catalogText}

OWNER VOICE / TEXT INVENTORY UPDATES:
- If the owner (Manikanda Vinayaga Prabhu / Suresh) sends a voice note or text to add a product, update a price, mark a product as Stock = 0 ("ஸ்டாக் ஜீரோ / முடிஞ்சு போச்சு"), or share a Google Sheet link:
  - Immediately call the appropriate tool (\`upsertWholesaleProduct\`, \`updateWholesaleStockOrPrice\`, or \`setWholesaleGoogleSheet\`).
  - Confirm the exact update and Google Sheet sync status in crisp Tamil!

ORDER BOOKING:
- When a customer confirms an order (retail pouches or wholesale boxes/tins), collect their Name/Store Name and Delivery Area (or Shop Pickup at Shop No. 13), call \`bookWholesaleOrder\`, and confirm that Manikanda Vinayaga Prabhu will arrange it.`;
}

async function executeWholesaleToolCall(fnCall, chatId) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  if (fnName === 'checkWholesaleInventory') {
    const q = args.productQuery || '';
    const results = wholesaleInventory.query(q);
    return {
      status: 'success',
      query: q,
      itemCount: results.length,
      items: results
    };
  }

  if (fnName === 'bookWholesaleOrder') {
    const orderResult = wholesaleInventory.logOrder({
      ...args,
      phone: chatId.replace(/\D/g, '')
    });
    return {
      status: 'order_booked',
      orderId: orderResult.orderId,
      dispatchScheduled: 'Mattuthavani Vegetable Market, Shop No. 13 (4 AM – 3 PM / 5 PM)',
      message: `Order ${orderResult.orderId} booked successfully for ${args.storeName}. Manikanda Vinayaga Prabhu notified.`
    };
  }

  if (fnName === 'upsertWholesaleProduct') {
    const res = await wholesaleInventory.upsertProduct(args);
    return {
      status: res.success ? 'product_saved' : 'error',
      item: res.item,
      googleSheetSynced: Boolean(res.sheetSync && res.sheetSync.success),
      sheetMessage: res.sheetSync ? res.sheetSync.message : null
    };
  }

  if (fnName === 'updateWholesaleStockOrPrice') {
    const res = await wholesaleInventory.updateStockOrPrice(args.productQuery || '', args);
    return {
      status: res.success ? 'inventory_updated' : 'not_found',
      item: res.item || null,
      message: res.message || null,
      googleSheetSynced: Boolean(res.sheetSync && res.sheetSync.success),
      sheetMessage: res.sheetSync ? res.sheetSync.message : null
    };
  }

  if (fnName === 'setWholesaleGoogleSheet') {
    const cfg = wholesaleInventory.setSheetConfig(args.sheetUrlOrId, args.tabName || 'Sheet1');
    if (!cfg.success) {
      return { status: 'error', message: cfg.message };
    }
    const syncRes = args.pushCurrentInventory === false
      ? await wholesaleInventory.syncFromGoogleSheet(cfg.sheetCsvUrl)
      : await wholesaleInventory.pushInventoryToGoogleSheet();
    return {
      status: 'sheet_configured',
      sheetId: cfg.sheetId,
      syncResult: syncRes
    };
  }

  if (fnName === 'removeWholesaleProduct') {
    const res = await wholesaleInventory.removeProduct(args.productQuery || '');
    return {
      status: res.success ? 'product_removed' : 'not_found',
      removedItem: res.removedItem || null,
      remainingCount: res.remainingCount ?? null,
      message: res.message || null,
      googleSheetSynced: Boolean(res.sheetSync && res.sheetSync.success)
    };
  }

  return { status: 'unknown_tool', message: `Tool ${fnName} not recognized` };
}

module.exports = {
  WHOLESALE_TOOLS,
  buildWholesaleSystemPrompt,
  executeWholesaleToolCall
};
