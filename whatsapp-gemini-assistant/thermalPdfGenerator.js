/**
 * Sri Meenakshi Traders - 80mm Compact Thermal Receipt & Godown Loading Slip
 * Specifically designed for fast-lane godown vehicle loading by labours/workers.
 * Simple, clear, zero GST clutter, and 100% clean ASCII to prevent PDFKit WinAnsi mojibake.
 */

const PDFDocument = require('pdfkit');

function cleanAscii(str, fallback = '') {
  if (!str) return fallback;
  // If string contains English inside parentheses e.g. "கேசவன் (Kesavan Oil Store)", extract English
  const matchParen = str.match(/\(([A-Za-z0-9\s,&.-]+)\)/);
  if (matchParen && matchParen[1] && matchParen[1].trim()) {
    return matchParen[1].trim();
  }

  const lower = str.toLowerCase();
  // Transliterate known Tamil shop names / areas
  if (lower.includes('கேசவன்') || lower.includes('kesavan')) return 'Kesavan Oil Store';
  if (lower.includes('நம்பியப்பா') || lower.includes('nambiyappa')) return 'Nambiyappa Oil Store';
  if (lower.includes('சௌந்தர்') || lower.includes('soundar') || lower.includes('sowndhar')) return 'Sowndhar Trading';
  if (lower.includes('லட்சுமி') || lower.includes('lakshmi')) return 'Sri Lakshmi Oil Store';
  if (lower.includes('பாண்டியன்') || lower.includes('pandian')) return 'Pandian Stores';
  if (lower.includes('வெற்றிலை') || lower.includes('vettrilai') || lower.includes('vetrilai')) return 'Old Vettrilai Kadai Street, Madurai';
  if (lower.includes('பூக்கடை') || lower.includes('pookadai')) return 'Pookadai Street, Madurai';
  if (lower.includes('கீழமாசி') || lower.includes('keelamasi')) return 'Keelamasi Street, Madurai';
  if (lower.includes('தயிர்') || lower.includes('thayir')) return 'Thayir Kadai Sandhu, Madurai';
  if (lower.includes('சிம்மக்கல்') || lower.includes('simmakkal')) return 'Simmakkal, Madurai';
  if (lower.includes('மதுரை') || lower.includes('madurai')) return 'Madurai';

  // Status transliteration
  if (lower.includes('google sheets') || lower.includes('பத்திரமாக') || lower.includes('சேமிக்க') || lower.includes('synced')) {
    return 'Google Sheets & Tally Synced';
  }

  // Strip non-ASCII characters to prevent PDFKit WinAnsi encoding Mojibake
  const asciiOnly = str.replace(/[^\x20-\x7E]/g, '').trim();
  if (asciiOnly.length > 0) return asciiOnly;

  return fallback;
}

function cleanItemName(itemDesc = '') {
  if (!itemDesc) return 'Edible Oil Box';
  const lower = itemDesc.toLowerCase();
  if (lower.includes('gold winner') || lower.includes('கோல்டு வின்னர்') || lower.includes('சூரியகாந்தி') || lower.includes('sunflower')) {
    if (lower.includes('500') || lower.includes('1/2')) return 'Gold Winner Sunflower Oil 500ml';
    if (lower.includes('5')) return 'Gold Winner Sunflower Oil 5L Can';
    if (lower.includes('200')) return 'Gold Winner Sunflower Oil 200ml';
    return '1 Litre Gold Winner Sunflower Oil';
  }
  if (lower.includes('fortune') || lower.includes('பார்ச்சூன்')) {
    if (lower.includes('500') || lower.includes('1/2')) return 'Fortune Sunflower Oil 500ml';
    return '1 Litre Fortune Sunflower Oil';
  }
  if (lower.includes('gemini') || lower.includes('ஜெமினி')) {
    if (lower.includes('கடலை') || lower.includes('groundnut')) return 'Gemini Gold Groundnut Oil 1L';
    return 'Gemini Gold Sunflower Oil 1L';
  }
  if (lower.includes('ithayam') || lower.includes('idhayam') || lower.includes('இதயம்') || lower.includes('நல்லெண்ணெய்') || lower.includes('sesame')) {
    return '1 Litre Idhayam Gingelly Oil';
  }
  if (lower.includes('palm') || lower.includes('பாமாயில்') || lower.includes('பாம்')) {
    if (lower.includes('500') || lower.includes('1/2')) return 'Palm Oil 500ml Pouch';
    if (lower.includes('5')) return 'Palm Oil 5L Can';
    return '1 Litre Palm Oil Pouch';
  }
  if (lower.includes('deepam') || lower.includes('தீபம்')) {
    return 'Deepam Pooja Oil 1L';
  }

  const ascii = itemDesc.replace(/[^\x20-\x7E]/g, '').trim();
  return ascii || 'Edible Oil Box';
}

function generateThermalReceiptPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const items = order.items || [];
      // Calculate dynamic receipt height so it remains a single clean continuous slip
      const dynamicHeight = Math.max(380, 270 + items.length * 42);

      const doc = new PDFDocument({
        size: [226.77, dynamicHeight], // Exactly 80mm thermal receipt width
        margins: { top: 12, bottom: 12, left: 10, right: 10 }
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const cleanCustomer = cleanAscii(order.customerName, 'Cash Customer');
      const cleanAddr = cleanAscii(order.address, 'Madurai Market');
      const cleanPhone = cleanAscii(order.phone, 'Direct Walk-in');
      const billNo = order.billNumber || '#SMT-BILL';

      // Header - Store Info
      doc.font('Helvetica-Bold').fontSize(12).text('SRI MEENAKSHI TRADERS', { align: 'center' });
      doc.font('Helvetica').fontSize(8).text('Edible Oils Wholesale Merchant', { align: 'center' });
      doc.fontSize(7.5).text('Pookadai Street, Madurai | Ph: +91 93615 99097', { align: 'center' });
      doc.moveDown(0.2);

      doc.text('------------------------------------------------------------', { align: 'center' });
      doc.moveDown(0.2);

      // Slip Purpose & Bill Number (Simple, no GST clutter)
      doc.font('Helvetica-Bold').fontSize(10).text(billNo, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).text('[ GODOWN LOADING SLIP ]', { align: 'center' });
      doc.font('Helvetica').fontSize(7.5).text('(Direct Vehicle Loading For Labours)', { align: 'center' });
      doc.moveDown(0.25);

      // Customer Details (100% clean English, no corrupted glyphs)
      doc.font('Helvetica').fontSize(8);
      doc.text(`Customer : ${cleanCustomer}`);
      if (cleanAddr) doc.text(`Address  : ${cleanAddr}`);
      if (cleanPhone) doc.text(`Phone    : ${cleanPhone}`);

      let dateStr = '';
      try {
        dateStr = order.createdAt
          ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      } catch (e) {
        dateStr = new Date().toLocaleString('en-IN');
      }
      doc.text(`Date     : ${dateStr}`);
      doc.moveDown(0.3);

      // Line items Header
      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('ITEM                                QTY      AMOUNT');
      doc.font('Helvetica').fontSize(7.5);
      doc.text('------------------------------------------------------------');
      doc.moveDown(0.15);

      let totalBoxes = 0;
      items.forEach(it => {
        const itemClean = cleanItemName(it.item);
        const boxes = Number(it.boxes) || 1;
        totalBoxes += boxes;
        const pkts = it.piecesPerBox ? `${it.piecesPerBox} pkt/box` : '10 pkt/box';
        const rate = it.ratePerBox ? `@ Rs.${it.ratePerBox}` : '';
        const lineAmt = `Rs. ${(Number(it.lineTotal) || (boxes * (it.ratePerBox || 0))).toLocaleString('en-IN')}`;

        doc.font('Helvetica-Bold').fontSize(8).text(itemClean);
        doc.font('Helvetica').fontSize(7.5);
        const subInfo = `${boxes} Box (${pkts}) ${rate}`;
        doc.text(`${subInfo.padEnd(28)} ${lineAmt}`);
        doc.moveDown(0.15);
      });

      doc.text('------------------------------------------------------------');
      doc.moveDown(0.2);

      // Box Count and Total (Clean, Simple, Big)
      doc.font('Helvetica-Bold').fontSize(8.5).text(`TOTAL BOXES TO LOAD : ${totalBoxes} BOXES`);
      doc.font('Helvetica-Bold').fontSize(11).text(`TOTAL AMOUNT : Rs. ${(Number(order.totalAmount) || 0).toLocaleString('en-IN')}`, { align: 'right' });
      doc.moveDown(0.35);

      // Godown Loading & Labour Verification Section
      doc.font('Helvetica-Bold').fontSize(8.5).text('*** FAST-LANE GODOWN TOKEN ***', { align: 'center' });
      doc.font('Helvetica').fontSize(7.5).text('Hand over this slip to godown labours for loading.', { align: 'center' });
      doc.fontSize(7).text('No Billing Queue - Verified & Cleared for Dispatch', { align: 'center' });
      doc.moveDown(0.2);

      doc.text('------------------------------------------------------------', { align: 'center' });
      doc.font('Helvetica').fontSize(7).text('Labour Loading Check: [  ] Verified & Loaded', { align: 'center' });
      const cleanStatus = cleanAscii(order.tallyStatus, 'Ready for Dispatch');
      doc.text(`Tally Status: ${cleanStatus}`, { align: 'center' });
      doc.moveDown(0.15);
      doc.font('Helvetica-Bold').fontSize(7.5).text('Thank You! Sri Meenakshi Traders, Madurai', { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  cleanAscii,
  cleanItemName,
  generateThermalReceiptPdfBuffer
};
