const PDFDocument = require('pdfkit');

function generateThermalReceiptPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [226.77, 490], // Standard 80mm thermal receipt width
        margins: { top: 14, bottom: 14, left: 10, right: 10 }
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header
      doc.font('Helvetica-Bold').fontSize(12).text('SRI MEENAKSHI TRADERS', { align: 'center' });
      doc.font('Helvetica').fontSize(8.5).text('Edible Oils Wholesale Merchant', { align: 'center' });
      doc.fontSize(7.5).text('Pookadai Street, Madurai • Ph: +91 93615 99097', { align: 'center' });
      if (order.billingType === 'GST') {
        doc.font('Helvetica-Bold').fontSize(7.5).text('GSTIN (Seller): 33AABCS1234F1Z5', { align: 'center' });
      }
      doc.moveDown(0.2);

      doc.text('------------------------------------------------------------', { align: 'center' });
      doc.moveDown(0.2);

      // Bill Number & Type
      doc.font('Helvetica-Bold').fontSize(10).text(order.billNumber || '#SMT-BILL', { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8).text(`[ ${(order.billingType || 'CASH').toUpperCase()} TAX INVOICE ]`, { align: 'center' });
      doc.moveDown(0.3);

      // Details
      doc.font('Helvetica').fontSize(8);
      doc.text(`Customer : ${order.customerName || 'Cash Customer'}`);
      if (order.address) doc.text(`Address  : ${order.address}`);
      if (order.phone) doc.text(`Phone    : ${order.phone}`);
      if (order.gstNumber) doc.text(`Buyer GSTIN: ${order.gstNumber}`);
      const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN');
      doc.text(`Date     : ${dateStr}`);
      doc.moveDown(0.3);

      // Line items
      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('ITEM                                QTY      AMOUNT');
      doc.font('Helvetica').fontSize(7.5);
      doc.text('------------------------------------------------------------');

      (order.items || []).forEach(it => {
        doc.font('Helvetica-Bold').fontSize(8).text(it.item);
        doc.font('Helvetica').fontSize(7.5);
        const subInfo = `${it.boxes} Box (${it.piecesPerBox} pkt/box) @ Rs.${it.ratePerBox}`;
        const lineAmt = `Rs. ${it.lineTotal.toLocaleString('en-IN')}`;
        doc.text(`${subInfo.padEnd(28)} ${lineAmt}`);
      });

      doc.text('------------------------------------------------------------');
      doc.moveDown(0.2);

      // GST Tax Breakdown (Edible Oils 5% GST = 2.5% CGST + 2.5% SGST)
      if (order.billingType === 'GST') {
        const total = order.totalAmount || 0;
        const taxable = Math.round((total / 1.05) * 100) / 100;
        const cgst = Math.round(((total - taxable) / 2) * 100) / 100;
        const sgst = Math.round((total - taxable - cgst) * 100) / 100;

        doc.font('Helvetica').fontSize(7.5);
        doc.text(`Taxable Value  : Rs. ${taxable.toFixed(2)}`, { align: 'right' });
        doc.text(`CGST @ 2.5%    : Rs. ${cgst.toFixed(2)}`, { align: 'right' });
        doc.text(`SGST @ 2.5%    : Rs. ${sgst.toFixed(2)}`, { align: 'right' });
        doc.text('------------------------------------------------------------');
        doc.moveDown(0.2);
      }

      // Total
      doc.font('Helvetica-Bold').fontSize(11).text(`TOTAL: Rs. ${(order.totalAmount || 0).toLocaleString('en-IN')}`, { align: 'right' });
      doc.moveDown(0.4);

      // Fast Lane Token
      doc.font('Helvetica-Bold').fontSize(8.5).text('*** FAST-LANE PICKUP TOKEN ***', { align: 'center' });
      doc.font('Helvetica').fontSize(7).text('Direct Godown Loading - No Waiting in Queue!', { align: 'center' });
      doc.moveDown(0.2);
      doc.text('------------------------------------------------------------', { align: 'center' });
      doc.fontSize(7).text(`Tally Prime Status: ${order.tallyStatus || 'Sales Voucher Synced'}`, { align: 'center' });
      doc.text('Thank You! Visit Again (Sri Meenakshi Traders)', { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateThermalReceiptPdfBuffer };
