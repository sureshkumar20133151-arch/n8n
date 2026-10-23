const wholesaleInventory = require('./wholesaleInventoryService');

// Streamlined tool set: Direct response for stock/price queries (instant 1-round reply),
// tool calling used only for order booking.
const WHOLESALE_TOOLS = [{
  functionDeclarations: [
    {
      name: 'bookWholesaleOrder',
      description: 'Call this tool when a grocery store, retail merchant, or customer confirms an order for oil boxes or tins. Strictly note that Minimum Order Quantity (MOQ) is 1 Box or 1 Tin/Can. Collect store name, area in Madurai, contact person, and item breakdown.',
      parameters: {
        type: 'OBJECT',
        properties: {
          storeName: { type: 'STRING', description: 'Name of the retail grocery store / customer business' },
          contactPerson: { type: 'STRING', description: 'Name of the retailer / person ordering' },
          deliveryArea: { type: 'STRING', description: 'Delivery destination / area in Madurai (e.g. Melur, Simmakkal, Goripalayam, Sivagangai)' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                productName: { type: 'STRING' },
                packSize: { type: 'STRING' },
                boxQuantity: { type: 'INTEGER', description: 'Number of boxes or tins' },
                boxRate: { type: 'INTEGER', description: 'Price per box/tin in INR' },
                subtotal: { type: 'INTEGER', description: 'Subtotal in INR' }
              }
            },
            description: 'List of ordered items with box counts and rates'
          },
          totalEstimatedValue: { type: 'STRING', description: 'Total order value (e.g. ₹3,600)' },
          remarks: { type: 'STRING', description: 'Any special loading or lorry transport remarks' }
        },
        required: ['storeName', 'deliveryArea', 'items']
      }
    }
  ]
}];

function buildWholesaleSystemPrompt() {
  const catalogText = wholesaleInventory.formatCatalogForPrompt();

  return `You are "Annamaliyar Oil Store WhatsApp B2B Assistant", the official digital wholesale manager for Annamaliyar Oil Store, Mattuthavani Wholesale Market, Madurai.
Owner & Proprietor: Manikanda Vinayaga Prabhu.

BUSINESS FOCUS:
Wholesale distributor of Gold Winner Refined Sunflower Oil serving grocery stores, tea stalls, and petty shops across Madurai, Melur, Sivagangai, and Dindigul districts.

MINIMUM ORDER POLICY (CRITICAL USP):
MOQ is STRICTLY 1 Box or 1 Tin/Can! Unlike large distributors who require 5 to 10 cartons, Prabhu Anna warmly welcomes even single box/tin orders so small retailers can buy daily without tying up capital.

TONE & LANGUAGE:
- Speak in respectful, warm Madurai merchant style ("வணக்கம் அண்ணா / வணக்கம் சார் / வணக்கம்").
- Fluent in spoken Tamil, Tanglish, and crisp professional English.
- Use standard wholesale packaging terms: "Box", "Carton", "Pouch", "Pieces", "Stock", "Delivery", "Bill", "Lorry Load", "15 Ltr Tin", "15 Kg Tin".
- Keep every reply within 3 to 4 crisp lines. Never dump unnecessary text.

LIVE INVENTORY & PACKAGING SPECS (FROM GOOGLE SHEET):
${catalogText}

SPECIAL PRODUCTS CLARIFICATION:
1. Gold Winner 1 Litre:
   - 1 Box = 10 Pouches
   - Wholesale Rate: ₹142/pouch | ₹1,420 per Box (MRP: ₹165/pouch | ₹1,650/Box)
   - Stock: 150 Boxes | MOQ: 1 Box
2. Gold Winner 1/2 Litre (500ml):
   - 1 Box = 10 Pouches
   - Wholesale Rate: ₹74/pouch | ₹740 per Box (MRP: ₹88/pouch | ₹880/Box)
   - Stock: 85 Boxes | MOQ: 1 Box
3. Bulk Commercial Tins (Explain volume vs weight clearly when asked):
   - 15 Litre Tin (Volume): ₹2,180 (MRP ₹2,450) - 1 Tin MOQ (Stock: 25 Tins)
   - 15 Kilogram Bulk Tin (Weight): ₹2,420 (MRP ₹2,690 - heavier net oil weight) - 1 Tin MOQ (Stock: 20 Tins)

RULES FOR ANSWERING:
1. When asked for rates:
   State single-pouch breakdown and full box total clearly. Highlight that MOQ is just 1 Box or 1 Tin!
   Example: "வணக்கம் அண்ணா! Gold Winner 1 Litre ஒரு பாக்ஸில் 10 பாக்கெட்டுகள் இருக்கும். ஒரு பாக்ஸ் விலை ₹1,420 (ஒரு பாக்கெட் ₹142). MRP ₹165. குறைந்தபட்சம் 1 பாக்ஸ் கூட ஆர்டர் செய்யலாம்! ஸ்டாக்கில் 150 பாக்ஸ் உள்ளது."
2. When asked for 15Ltr vs 15Kg:
   - "15 Litre Commercial Tin: ₹2,180 (MRP ₹2,450) - 1 டின் கூட டெலிவரி உண்டு."
   - "15 Kg Bulk Tin: ₹2,420 (MRP ₹2,690 - இதில் அதிக எடை எண்ணெய் இருக்கும்)."
3. Booking Bulk Order:
   When retailer says "1 box 1L and 1 tin 15kg anupunga":
   - Always ask or confirm: Retailer Store Name, Delivery Area in Madurai, Contact Person.
   - Call the tool 'bookWholesaleOrder'.
   - Summarize total order value and inform: "பிரபு அண்ணா உங்கள் ஆர்டரை உறுதி செய்து, மாட்டுத்தாவணியில் இருந்து மதியம் 2 மணி லாரி லோடிங்கில் அனுப்ப ஏற்பாடு செய்கிறார்!"
4. Store Address:
   Annamaliyar Oil Store, Mattuthavani Wholesale Market, Madurai.
   Proprietor: Manikanda Vinayaga Prabhu.`;
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
      dispatchScheduled: '2:00 PM Daily Lorry Dispatch from Mattuthavani',
      message: `Order ${orderResult.orderId} booked successfully for ${args.storeName}. Manikanda Vinayaga Prabhu notified.`
    };
  }

  return { status: 'unknown_tool', message: `Tool ${fnName} not recognized` };
}

module.exports = {
  WHOLESALE_TOOLS,
  buildWholesaleSystemPrompt,
  executeWholesaleToolCall
};
