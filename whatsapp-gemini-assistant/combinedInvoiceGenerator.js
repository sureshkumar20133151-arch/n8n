/**
 * Sri Meenakshi Traders - Consolidated Invoice & Godown Token Generator
 * Combines both:
 *   Page 1: 80mm Compact Fast-Lane Godown Labour Token Slip (for labours to load boxes)
 *   Page 2: Official A4 GST Tax Invoice & e-Invoice with QR Code & HSN (for accounting & tax)
 * Into ONE SINGLE OPTIMIZED PDF document, delivered in ONE single WhatsApp chat message!
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { cleanAscii, cleanItemName } = require('./thermalPdfGenerator');
const { numberToWordsINR } = require('./a4GstInvoiceGenerator');

function getHsnForOil(itemDesc = '') {
  const lower = (itemDesc || '').toLowerCase();
  if (lower.includes('palm') || lower.includes('பாமாயில்') || lower.includes('பாம்')) return '1511';
  if (lower.includes('gingelly') || lower.includes('sesame') || lower.includes('இதயம்') || lower.includes('நல்லெண்ணெய்')) return '1515';
  if (lower.includes('groundnut') || lower.includes('கடலை')) return '1508';
  return '1512'; // Default Sunflower Seed Oil HSN
}

async function generateUnifiedBillAndTokenPdfBuffer(order) {
  const invoiceNo = (order.billNumber || 'SMT-2026-001').replace(/^#/, '');
  const totalAmount = Number(order.totalAmount || 0);
  const sellerGstin = '33AABCS1234F1Z5';
  const buyerGstin = order.gstNumber || '33AAACL5678G1Z2';
  const invoiceDate = order.createdAt
    ? new Date(order.createdAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Pre-generate e-Invoice QR code buffer for Page 2
  const qrPayload = JSON.stringify({
    SellerGstin: sellerGstin,
    BuyerGstin: buyerGstin,
    DocNo: invoiceNo,
    DocTyp: 'INV',
    DocDate: invoiceDate,
    TotInvVal: totalAmount,
    ItemCnt: (order.items || []).length,
    MainHsnCode: '1512',
    Irn: 'fef1df90406b928db26a62f816debc9bb5256d9375e6-0dc4226653cc23a8c595'
  });

  const qrPngBuffer = await QRCode.toBuffer(qrPayload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    width: 110
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ autoFirstPage: false });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const items = order.items || [];
      const cleanCustomer = cleanAscii(order.customerName, 'Kesavan Oil Store');
      const cleanAddr = cleanAscii(order.address, 'Pookadai Street, Madurai');
      const cleanPhone = cleanAscii(order.phone, '7871762490');
      const billNo = order.billNumber || '#SMT-BILL';

      // =========================================================================
      // PAGE 1: 80mm COMPACT GODOWN LABOUR DISPATCH TOKEN SLIP (No GST Clutter)
      // =========================================================================
      const dynamicHeight = Math.max(380, 270 + items.length * 42);
      doc.addPage({
        size: [226.77, dynamicHeight], // Standard 80mm roll width
        margins: { top: 12, bottom: 12, left: 10, right: 10 }
      });

      // Header - Store Info
      doc.font('Helvetica-Bold').fontSize(12).text('SRI MEENAKSHI TRADERS', { align: 'center' });
      doc.font('Helvetica').fontSize(8).text('Edible Oils Wholesale Merchant', { align: 'center' });
      doc.fontSize(7.5).text('Pookadai Street, Madurai | Ph: +91 93615 99097', { align: 'center' });
      doc.moveDown(0.2);

      doc.text('------------------------------------------------------------', { align: 'center' });
      doc.moveDown(0.2);

      // Slip Title & Token
      doc.font('Helvetica-Bold').fontSize(10).text(billNo, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).text('[ GODOWN LOADING SLIP ]', { align: 'center' });
      doc.font('Helvetica').fontSize(7.5).text('(Direct Vehicle Loading For Labours)', { align: 'center' });
      doc.moveDown(0.25);

      // Customer Details (Clean ASCII)
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
      doc.font('Helvetica-Bold').fontSize(11).text(`TOTAL AMOUNT : Rs. ${totalAmount.toLocaleString('en-IN')}`, { align: 'right' });
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
      doc.font('Helvetica-Oblique').fontSize(6.5).text('(Official GST Tax Invoice on Page 2)', { align: 'center' });

      // =========================================================================
      // PAGE 2: OFFICIAL A4 GST TAX INVOICE & e-INVOICE WITH QR CODE & HSN
      // =========================================================================
      doc.addPage({
        size: 'A4', // 595.28 x 841.89 pt
        margins: { top: 25, bottom: 25, left: 28, right: 28 }
      });

      const left = 28;
      const right = 567;
      const width = right - left; // 539

      // Title
      doc.font('Helvetica-Bold').fontSize(14).text('Tax Invoice', left, 25, { width, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).text('e-Invoice', 450, 25, { width: 100, align: 'center' });

      // Embed QR code at top right
      doc.image(qrPngBuffer, 460, 38, { width: 75, height: 75 });

      // IRN Details
      doc.font('Helvetica-Bold').fontSize(7.5).text('IRN', left, 50);
      doc.font('Helvetica').fontSize(7.5).text(':  fef1df90406b928db26a62f816debc9bb5256d9375e60dc4226653cc23a8c595', left + 55, 50);

      doc.font('Helvetica-Bold').fontSize(7.5).text('Ack No.', left, 63);
      doc.font('Helvetica').fontSize(7.5).text(':  112010036563310', left + 55, 63);

      doc.font('Helvetica-Bold').fontSize(7.5).text('Ack Date', left, 76);
      doc.font('Helvetica').fontSize(7.5).text(`:  ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '24-Nov-26'}`, left + 55, 76);

      // MAIN BOX (Supplier & Consignee / Invoice Meta)
      const boxTop = 118;
      const boxHeight = 175;
      const midX = left + 270;

      // Outer border of top party box
      doc.rect(left, boxTop, width, boxHeight).strokeColor('#000').lineWidth(0.75).stroke();
      doc.moveTo(midX, boxTop).lineTo(midX, boxTop + boxHeight).stroke(); // Vertical split

      // LEFT COLUMN: Supplier, Consignee, Buyer
      doc.font('Helvetica-Bold').fontSize(8).text('Sri Meenakshi Traders', left + 6, boxTop + 6);
      doc.font('Helvetica').fontSize(7.5);
      doc.text('Pookadai Street, Near Central Market', left + 6, boxTop + 18);
      doc.text('Madurai - 625001, Tamil Nadu', left + 6, boxTop + 28);
      doc.text('GSTIN/UIN: 33AABCS1234F1Z5', left + 6, boxTop + 38);
      doc.text('State Name : Tamil Nadu, Code : 33', left + 6, boxTop + 48);

      // Consignee Line
      doc.moveTo(left, boxTop + 58).lineTo(midX, boxTop + 58).stroke();
      doc.font('Helvetica-Oblique').fontSize(7).text('Consignee (Ship to)', left + 6, boxTop + 62);
      doc.font('Helvetica-Bold').fontSize(8).text(cleanCustomer, left + 6, boxTop + 73);
      doc.font('Helvetica').fontSize(7.5).text(cleanAddr, left + 6, boxTop + 84);
      doc.text(`GSTIN/UIN   : ${buyerGstin}`, left + 6, boxTop + 95);
      doc.text('State Name : Tamil Nadu, Code : 33', left + 6, boxTop + 105);

      // Buyer Line
      doc.moveTo(left, boxTop + 116).lineTo(midX, boxTop + 116).stroke();
      doc.font('Helvetica-Oblique').fontSize(7).text('Buyer (Bill to)', left + 6, boxTop + 120);
      doc.font('Helvetica-Bold').fontSize(8).text(cleanCustomer, left + 6, boxTop + 131);
      doc.font('Helvetica').fontSize(7.5).text(cleanAddr, left + 6, boxTop + 142);
      doc.text(`GSTIN/UIN   : ${buyerGstin}`, left + 6, boxTop + 152);
      doc.text('State Name : Tamil Nadu, Code : 33', left + 6, boxTop + 162);

      // RIGHT COLUMN: Invoice Numbers, Dates & Delivery Dispatch
      const col2Left = midX + 6;
      const col2Mid = midX + 135;

      // Row 1: Invoice No & Dated
      doc.font('Helvetica').fontSize(7).text('Invoice No.', col2Left, boxTop + 6);
      doc.text('Dated', col2Mid, boxTop + 6);
      doc.font('Helvetica-Bold').fontSize(8).text(invoiceNo, col2Left, boxTop + 16);
      const datedStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '24-Nov-26';
      doc.text(datedStr, col2Mid, boxTop + 16);
      doc.moveTo(midX, boxTop + 29).lineTo(right, boxTop + 29).stroke();

      // Row 2: Delivery Note & Terms of Payment
      doc.font('Helvetica').fontSize(7).text('Delivery Note', col2Left, boxTop + 33);
      doc.text('Mode/Terms of Payment', col2Mid, boxTop + 33);
      doc.font('Helvetica-Bold').fontSize(7.5).text('Immediate / Cash / UPI', col2Mid, boxTop + 43);
      doc.moveTo(midX, boxTop + 56).lineTo(right, boxTop + 56).stroke();

      // Row 3: Reference No & Date
      doc.font('Helvetica').fontSize(7).text('Reference No. & Date.', col2Left, boxTop + 60);
      doc.text('Other References', col2Mid, boxTop + 60);
      doc.moveTo(midX, boxTop + 83).lineTo(right, boxTop + 83).stroke();

      // Row 4: Buyer Order No. & Dated
      doc.font('Helvetica').fontSize(7).text("Buyer's Order No.", col2Left, boxTop + 87);
      doc.text('Dated', col2Mid, boxTop + 87);
      doc.moveTo(midX, boxTop + 110).lineTo(right, boxTop + 110).stroke();

      // Row 5: Dispatch Doc No. & Delivery Note Date
      doc.font('Helvetica').fontSize(7).text('Dispatch Doc No.', col2Left, boxTop + 114);
      doc.text('Delivery Note Date', col2Mid, boxTop + 114);
      doc.moveTo(midX, boxTop + 137).lineTo(right, boxTop + 137).stroke();

      // Row 6: Dispatched through & Destination
      doc.font('Helvetica').fontSize(7).text('Dispatched through', col2Left, boxTop + 141);
      doc.text('Destination', col2Mid, boxTop + 141);
      doc.font('Helvetica-Bold').fontSize(7.5).text('Own Transport', col2Left, boxTop + 151);
      doc.text('Madurai Godown', col2Mid, boxTop + 151);
      doc.moveTo(midX, boxTop + 162).lineTo(right, boxTop + 162).stroke();

      // Terms of Delivery
      doc.font('Helvetica').fontSize(7).text('Terms of Delivery : Ex-Godown Sri Meenakshi Traders, Madurai', col2Left, boxTop + 165);

      // GOODS TABLE
      const tableTop = boxTop + boxHeight;
      const tableHeight = 220;
      doc.rect(left, tableTop, width, tableHeight).strokeColor('#000').lineWidth(0.75).stroke();

      // Table Header Row
      const headerH = 20;
      doc.rect(left, tableTop, width, headerH).fillColor('#f8fafc').fillAndStroke('#f8fafc', '#000');
      doc.fillColor('#000');

      // Column widths and X positions
      const cSl = left;           // Width 24
      const cDesc = cSl + 24;     // Width 230
      const cHsn = cDesc + 230;   // Width 55
      const cQty = cHsn + 55;     // Width 50
      const cRate = cQty + 50;    // Width 50
      const cPer = cRate + 50;    // Width 35
      const cDisc = cPer + 35;    // Width 35
      const cAmt = cDisc + 35;    // Width 60 -> ends at 567

      // Header Texts
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('Sl\nNo.', cSl + 2, tableTop + 3, { width: 22, align: 'center' });
      doc.text('Description of Goods', cDesc + 6, tableTop + 6);
      doc.text('HSN/SAC', cHsn, tableTop + 6, { width: 55, align: 'center' });
      doc.text('Quantity', cQty, tableTop + 6, { width: 50, align: 'center' });
      doc.text('Rate', cRate, tableTop + 6, { width: 50, align: 'center' });
      doc.text('per', cPer, tableTop + 6, { width: 35, align: 'center' });
      doc.text('Disc. %', cDisc, tableTop + 6, { width: 35, align: 'center' });
      doc.text('Amount', cAmt, tableTop + 6, { width: 60, align: 'right' });

      // Vertical Grid Lines for the table body
      [cDesc, cHsn, cQty, cRate, cPer, cDisc, cAmt].forEach(x => {
        doc.moveTo(x, tableTop).lineTo(x, tableTop + tableHeight - 20).strokeColor('#000').lineWidth(0.5).stroke();
      });

      // Rows rendering
      let rowY = tableTop + headerH + 6;
      let totalQtyBoxes = 0;

      items.forEach((it, idx) => {
        const itemAscii = cleanAscii(it.item, 'Edible Oil Box');
        const hsn = getHsnForOil(itemAscii);
        const boxes = it.boxes || 1;
        totalQtyBoxes += boxes;
        const lineTotal = it.lineTotal || (boxes * (it.ratePerBox || 1320));

        doc.font('Helvetica').fontSize(8);
        doc.text(`${idx + 1}`, cSl + 2, rowY, { width: 20, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8).text(itemAscii, cDesc + 6, rowY);
        doc.font('Helvetica').fontSize(7.5);
        doc.text(`Pack: ${it.piecesPerBox || 10} pouches/box | Wholesale Mandi Grade`, cDesc + 6, rowY + 10);

        doc.text(hsn, cHsn, rowY, { width: 55, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8).text(`${boxes} Box`, cQty, rowY, { width: 50, align: 'center' });
        doc.font('Helvetica').fontSize(8).text((it.ratePerBox || 1320).toFixed(2), cRate, rowY, { width: 48, align: 'right' });
        doc.text('Box', cPer, rowY, { width: 35, align: 'center' });
        doc.text('-', cDisc, rowY, { width: 35, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8).text(lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cAmt, rowY, { width: 58, align: 'right' });

        rowY += 28;
      });

      // Calculate Statutory GST (5% = 2.5% CGST + 2.5% SGST)
      const taxableValue = Math.round((totalAmount / 1.05) * 100) / 100;
      const cgstAmt = Math.round(((totalAmount - taxableValue) / 2) * 100) / 100;
      const sgstAmt = Math.round((totalAmount - taxableValue - cgstAmt) * 100) / 100;

      // CGST & SGST lines in the goods table
      rowY = Math.max(rowY + 10, tableTop + tableHeight - 75);
      doc.font('Helvetica-BoldOblique').fontSize(8);
      doc.text('CGST (2.5%)', cDesc + 30, rowY);
      doc.font('Helvetica').fontSize(8).text(cgstAmt.toFixed(2), cAmt, rowY, { width: 58, align: 'right' });

      doc.font('Helvetica-BoldOblique').fontSize(8);
      doc.text('SGST (2.5%)', cDesc + 30, rowY + 14);
      doc.font('Helvetica').fontSize(8).text(sgstAmt.toFixed(2), cAmt, rowY + 14, { width: 58, align: 'right' });

      // Table Total Row
      const totalRowY = tableTop + tableHeight - 20;
      doc.rect(left, totalRowY, width, 20).fillColor('#f8fafc').fillAndStroke('#f8fafc', '#000');
      doc.fillColor('#000');

      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('Total', cDesc + 6, totalRowY + 5);
      doc.text(`${totalQtyBoxes} Box`, cQty, totalRowY + 5, { width: 50, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, cAmt - 20, totalRowY + 5, { width: 78, align: 'right' });

      // AMOUNT IN WORDS
      const inWordsTop = tableTop + tableHeight;
      const inWordsHeight = 28;
      doc.rect(left, inWordsTop, width, inWordsHeight).strokeColor('#000').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).text('Amount Chargeable (in words)', left + 6, inWordsTop + 4);
      doc.font('Helvetica-Bold').fontSize(8).text(numberToWordsINR(totalAmount), left + 6, inWordsTop + 14);
      doc.font('Helvetica-Oblique').fontSize(7.5).text('E. & O.E', right - 50, inWordsTop + 4);

      // TAX BREAKDOWN TABLE
      const taxTableTop = inWordsTop + inWordsHeight;
      const taxTableHeight = 62;
      doc.rect(left, taxTableTop, width, taxTableHeight).strokeColor('#000').lineWidth(0.5).stroke();

      const tHsnW = 100;
      const tTaxableW = 90;
      const tRateW = 45;
      const tAmtW = 75;
      const tTotTaxW = 85;

      const tX1 = left + tHsnW;
      const tX2 = tX1 + tTaxableW;
      const tX3 = tX2 + tRateW + tAmtW;
      const tX4 = tX3 + tRateW + tAmtW;

      doc.rect(left, taxTableTop, width, 18).fillColor('#f8fafc').fillAndStroke('#f8fafc', '#000');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(7);

      doc.text('HSN/SAC', left + 6, taxTableTop + 5);
      doc.text('Taxable Value', tX1 + 6, taxTableTop + 5);
      doc.text('Central Tax (CGST)', tX2 + 6, taxTableTop + 2);
      doc.font('Helvetica').fontSize(6).text('Rate      Amount', tX2 + 10, taxTableTop + 10);

      doc.font('Helvetica-Bold').fontSize(7).text('State Tax (SGST)', tX3 + 6, taxTableTop + 2);
      doc.font('Helvetica').fontSize(6).text('Rate      Amount', tX3 + 10, taxTableTop + 10);

      doc.font('Helvetica-Bold').fontSize(7).text('Total Tax Amount', tX4 + 6, taxTableTop + 5);

      // Tax Table Data Row
      const tDataY = taxTableTop + 22;
      doc.font('Helvetica').fontSize(7.5);
      doc.text('1512 (Edible Oil)', left + 6, tDataY);
      doc.text(taxableValue.toFixed(2), tX1 + 6, tDataY);
      doc.text('2.5%', tX2 + 8, tDataY);
      doc.text(cgstAmt.toFixed(2), tX2 + 50, tDataY);
      doc.text('2.5%', tX3 + 8, tDataY);
      doc.text(sgstAmt.toFixed(2), tX3 + 50, tDataY);
      doc.font('Helvetica-Bold').fontSize(7.5).text((cgstAmt + sgstAmt).toFixed(2), tX4 + 10, tDataY);

      // Tax Total Row
      const tTotY = taxTableTop + 42;
      doc.moveTo(left, tTotY).lineTo(right, tTotY).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Total', left + 6, tTotY + 4);
      doc.text(taxableValue.toFixed(2), tX1 + 6, tTotY + 4);
      doc.text(cgstAmt.toFixed(2), tX2 + 50, tTotY + 4);
      doc.text(sgstAmt.toFixed(2), tX3 + 50, tTotY + 4);
      doc.text((cgstAmt + sgstAmt).toFixed(2), tX4 + 10, tTotY + 4);

      // TAX IN WORDS
      const taxWordsTop = taxTableTop + taxTableHeight;
      const taxWordsHeight = 22;
      doc.rect(left, taxWordsTop, width, taxWordsHeight).strokeColor('#000').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).text('Tax Amount (in words) : ', left + 6, taxWordsTop + 7);
      doc.font('Helvetica-Bold').fontSize(7.5).text(numberToWordsINR(cgstAmt + sgstAmt), left + 100, taxWordsTop + 7);

      // DECLARATION & SIGNATURE BOX
      const declTop = taxWordsTop + taxWordsHeight;
      const declHeight = 65;
      doc.rect(left, declTop, width, declHeight).strokeColor('#000').lineWidth(0.5).stroke();
      const signSplitX = left + 320;
      doc.moveTo(signSplitX, declTop).lineTo(signSplitX, declTop + declHeight).stroke();

      // Declaration Left
      doc.font('Helvetica-Bold').fontSize(7.5).text('Declaration', left + 6, declTop + 6);
      doc.font('Helvetica').fontSize(7).text(
        'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. All disputes are subject to Madurai jurisdiction.',
        left + 6,
        declTop + 18,
        { width: 300, lineGap: 2 }
      );

      // Signatory Right
      doc.font('Helvetica-Bold').fontSize(8).text('for Sri Meenakshi Traders', signSplitX + 10, declTop + 6);
      doc.font('Helvetica').fontSize(7).text('Pookadai Street, Madurai', signSplitX + 10, declTop + 16);
      doc.font('Helvetica-Bold').fontSize(8).text('Authorised Signatory', signSplitX + 50, declTop + 50);

      // Computer generated footer
      doc.font('Helvetica-Oblique').fontSize(7.5).text('This is a Computer Generated Tax Invoice & Fast-Lane Pickup Document', left, 785, { width, align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  generateUnifiedBillAndTokenPdfBuffer
};
