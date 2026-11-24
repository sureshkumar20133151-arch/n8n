/**
 * Comprehensive Automated Security, Edge Cases & Bug Validation Suite
 * Sri Meenakshi Traders (SMT) & Multi-Persona Assistant
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 ==============================================================');
console.log('🧪 STARTING COMPREHENSIVE SECURITY, BUG & LOGIC AUDIT TEST SUITE');
console.log('🧪 ==============================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

(async () => {
  // -------------------------------------------------------------
  // TEST 1: Tally Prime XML Injection & Special Character Sanitization
  // -------------------------------------------------------------
  const tallyXmlBuilder = require('./tallyXmlBuilder');
  runTest('Tally XML builder escapes &, <, >, ", \' to prevent XML corruption', () => {
    const maliciousInput = {
      company: 'Sri Meenakshi Traders',
      voucherType: 'Sales',
      partyName: 'பாண்டியன் மளிகை & ஆயில் <script>alert("xss")</script>',
      amount: 2500,
      itemName: '1L Gold Winner & Gemini "Best" Deal',
      quantity: 2,
      rate: 1250,
      narration: 'Payment via GPay & Cash <ref#123> "special"'
    };

    const xml = tallyXmlBuilder.buildTallyVoucherXml(maliciousInput);
    assert(!xml.includes('& '), 'Raw unescaped ampersand found in XML!');
    assert(xml.includes('&amp;'), 'Escaped &amp; must be present!');
    assert(!xml.includes('<script>'), 'Unescaped < found in party name!');
    assert(xml.includes('&lt;script&gt;'), 'Escaped &lt;script&gt; must be present!');
    assert(xml.includes('&quot;xss&quot;'), 'Escaped quotes must be present!');
    assert(xml.includes('&quot;special&quot;'), 'Escaped quotes in narration must be present!');
  });

  // -------------------------------------------------------------
  // TEST 2: Order Calculation Boundaries & Division-by-Zero Defense
  // -------------------------------------------------------------
  const smt = require('./meenakshiTradersPersona');
  await runAsyncTest('createSmtOilOrder defends against negative/NaN boxes and zero division', async () => {
    const toolCall = {
      name: 'createSmtOilOrder',
      args: {
        customerName: 'Test Buyer',
        billingType: 'Cash',
        items: [
          { itemDescription: 'Gold Winner 1L', boxes: -5, pieces: -20 }, // Malicious negative inputs
          { itemDescription: 'Unknown Brand Oil', boxes: 'invalid_number', customRatePerBox: -100 }
        ]
      }
    };

    const res = await smt.executeSmtToolCall(toolCall, '919999999999@s.whatsapp.net');
    assert(res.success === true, 'Order creation must succeed gracefully');
    assert(res.totalAmount > 0, `Total amount must be positive, got: ${res.totalAmount}`);
    for (const item of res.items) {
      assert(item.boxes >= 1, `Boxes must be positive integer >= 1, got: ${item.boxes}`);
      assert(item.piecesPerBox >= 1, `PiecesPerBox must be >= 1, got: ${item.piecesPerBox}`);
      assert(item.ratePerBox > 0, `RatePerBox must be > 0, got: ${item.ratePerBox}`);
      assert(item.lineTotal > 0, `Line total must be > 0, got: ${item.lineTotal}`);
    }
  });

  // -------------------------------------------------------------
  // TEST 3: Customer Identification for Kesavan (7871762490) Across Scenarios
  // -------------------------------------------------------------
  runTest('Customer matching recognizes Kesavan across Phone, LID, PushName, and Query', () => {
    const allCustomers = smt.loadCustomers();

    // Scenario A: Direct Phone JID
    const sysPromptPhone = smt.buildSmtSystemPrompt('917871762490@s.whatsapp.net', {});
    assert(sysPromptPhone.includes('CURRENT CALLER SENDER IDENTIFIED'), 'Failed to identify Kesavan via Phone JID');
    assert(sysPromptPhone.includes('கேசவன் ஆயில் ஸ்டோர்'), 'Failed to match Kesavan name via Phone JID');

    // Scenario B: WhatsApp @lid with remoteJidAlt
    const sysPromptLidAlt = smt.buildSmtSystemPrompt('234857209384729@lid', {
      remoteJidAlt: '917871762490@s.whatsapp.net',
      senderName: 'Friend'
    });
    assert(sysPromptLidAlt.includes('CURRENT CALLER SENDER IDENTIFIED'), 'Failed to identify Kesavan via @lid + remoteJidAlt');

    // Scenario C: WhatsApp @lid with pushName "SR"
    const sysPromptPushSr = smt.buildSmtSystemPrompt('234857209384729@lid', {
      senderName: 'SR'
    });
    assert(sysPromptPushSr.includes('CURRENT CALLER SENDER IDENTIFIED'), 'Failed to identify Kesavan via pushName SR');

    // Scenario D: WhatsApp @lid with pushName "Suresh rosy"
    const sysPromptPushSuresh = smt.buildSmtSystemPrompt('234857209384729@lid', {
      senderName: 'Suresh rosy'
    });
    assert(sysPromptPushSuresh.includes('CURRENT CALLER SENDER IDENTIFIED'), 'Failed to identify Kesavan via pushName Suresh rosy');
  });

  // -------------------------------------------------------------
  // TEST 4: Thermal Receipt PDF Generator (80mm) Output Verification
  // -------------------------------------------------------------
  const { generateThermalReceiptPdfBuffer } = require('./thermalPdfGenerator');
  await runAsyncTest('80mm Thermal Receipt PDF generates valid PDF buffer with correct magic bytes', async () => {
    const testOrder = {
      billNumber: '#SMT-TEST-AUDIT',
      billingType: 'Cash',
      customerName: 'கேசவன் ஆயில் ஸ்டோர் (Kesavan Oil Store)',
      address: 'பூக்கடை வீதி, மதுரை',
      phone: '7871762490',
      items: [
        { item: '1L Gold Winner', boxes: 2, piecesPerBox: 10, totalPouches: 20, ratePerBox: 1320, lineTotal: 2640 },
        { item: '1L Fortune Oil', boxes: 1, piecesPerBox: 10, totalPouches: 10, ratePerBox: 1280, lineTotal: 1280 }
      ],
      totalAmount: 3920,
      tallyStatus: 'Tally Prime-ல் நேரடியாகப் பதிவானது ✅'
    };

    const pdfBuf = await generateThermalReceiptPdfBuffer(testOrder);
    assert(Buffer.isBuffer(pdfBuf), 'PDF output must be a Buffer');
    assert(pdfBuf.length > 1000, `PDF buffer too small: ${pdfBuf.length} bytes`);
    assert(pdfBuf.slice(0, 4).toString() === '%PDF', 'PDF buffer does not start with %PDF magic bytes!');
  });

  // -------------------------------------------------------------
  // TEST 5: Direct WhatsApp Document PDF Queue and Auto-Pruning
  // -------------------------------------------------------------
  runTest('Bill PDF Queue successfully stores, retrieves, and prunes PDF buffers without memory leak', () => {
    const fakeChatId = 'test_chat_queue_123';
    const fakePdf = {
      buffer: Buffer.from('%PDF-1.4 test'),
      fileName: 'test_bill.pdf',
      caption: 'Test Bill Caption'
    };

    smt.queueBillPdf(fakeChatId, fakePdf);
    const retrieved = smt.getQueuedBillPdf(fakeChatId);
    assert(retrieved !== null, 'Queued PDF could not be retrieved');
    assert(retrieved.fileName === 'test_bill.pdf', 'Retrieved file name mismatch');

    // Second retrieval must be null (single-dispatch protection)
    const secondRetrieval = smt.getQueuedBillPdf(fakeChatId);
    assert(secondRetrieval === null, 'Queue must delete item after dispatch to prevent duplicate send');
  });

  // -------------------------------------------------------------
  // TEST 6: Prompt Directive Sanitization in Gemini Service Output
  // -------------------------------------------------------------
  const GeminiService = require('./geminiService');
  const gemini = new GeminiService();
  runTest('sanitizeTamilText eradicates leaked system prompt directives', () => {
    const leakedText = '[CRITICAL SCRIPT & LANGUAGE DIRECTIVE: Reply in clear, modern, professional English with LLM intelligence and consultative warmth. Ask EXACTLY ONE question]: வணக்கம்! ஸ்ரீ மீனாட்சி டிரேடர்ஸ் ஆயில் மண்டி மதுரை.';
    const cleaned = gemini.sanitizeTamilText(leakedText);
    assert(!cleaned.includes('[CRITICAL SCRIPT'), 'Directive header was not stripped!');
    assert(cleaned.startsWith('வணக்கம்!'), `Cleaned text must start with Tamil greeting, got: "${cleaned}"`);
  });

  // -------------------------------------------------------------
  // TEST 7: Path Traversal & Order Lookup Sanitization
  // -------------------------------------------------------------
  runTest('getOrder safely handles path traversal strings and unknown bill IDs', () => {
    const traversalAttack = '../../../../etc/passwd';
    const res = smt.getOrder(traversalAttack);
    assert(res === null, 'Path traversal string must return null');

    const nonExistent = 'NON-EXISTENT-BILL-999';
    const res2 = smt.getOrder(nonExistent);
    assert(res2 === null, 'Non-existent bill must return null');
  });

  // -------------------------------------------------------------
  // TEST 8: Official A4 GST Tax Invoice (e-Invoice format with QR code)
  // -------------------------------------------------------------
  const { generateA4GstTaxInvoicePdfBuffer } = require('./a4GstInvoiceGenerator');
  await runAsyncTest('A4 GST Tax Invoice generates standard e-Invoice format with QR code, IRN, and HSN tax breakdown', async () => {
    const gstOrder = {
      billNumber: '#SMT-GST-AUDIT',
      billingType: 'GST',
      customerName: 'லட்சுமி ஆயில் ஸ்டோர் (Sri Lakshmi Oil Store)',
      address: 'தயிர் கடை சந்து, மதுரை',
      phone: '9842100103',
      gstNumber: '33AAACL5678G1Z2',
      items: [
        { item: '1L Gold Winner Sunflower Oil', boxes: 10, piecesPerBox: 10, totalPouches: 100, ratePerBox: 1320, lineTotal: 13200 }
      ],
      totalAmount: 13200
    };

    const pdfBuf = await generateA4GstTaxInvoicePdfBuffer(gstOrder);
    assert(Buffer.isBuffer(pdfBuf), 'A4 GST PDF output must be a Buffer');
    assert(pdfBuf.length > 3000, `A4 GST PDF buffer too small: ${pdfBuf.length} bytes`);
    assert(pdfBuf.slice(0, 4).toString() === '%PDF', 'A4 GST PDF buffer does not start with %PDF magic bytes!');
  });

  // -------------------------------------------------------------
  // TEST 9: Unified Single-Chat 2-Page PDF (Page 1: Labour Token + Page 2: GST Tax Invoice)
  // -------------------------------------------------------------
  const { generateUnifiedBillAndTokenPdfBuffer } = require('./combinedInvoiceGenerator');
  await runAsyncTest('Unified 2-Page PDF generator produces exact 2 pages with single queue delivery', async () => {
    const testOrder = {
      billNumber: '#SMT-UNIFIED-AUDIT',
      billingType: 'GST',
      customerName: 'Sowndhar Trading',
      address: 'பழைய வெற்றிலைகடை தெரு, மதுரை',
      phone: '9080416410',
      gstNumber: '33AAACL5678G1Z2',
      items: [
        { item: '1L Palm Oil', boxes: 5, piecesPerBox: 10, ratePerBox: 980, lineTotal: 4900 }
      ],
      totalAmount: 4900
    };

    const pdfBuf = await generateUnifiedBillAndTokenPdfBuffer(testOrder);
    assert(Buffer.isBuffer(pdfBuf), 'Unified PDF output must be a Buffer');
    assert(pdfBuf.slice(0, 4).toString() === '%PDF', 'Buffer does not start with %PDF!');
    const str = pdfBuf.toString('binary');
    const pageMatches = str.match(/\/Type\s*\/Page\b/g) || [];
    assert(pageMatches.length === 2, `Expected exactly 2 pages, got ${pageMatches.length}`);

    // Verify single-chat queue behavior
    smt.queueBillPdf('test-single-chat', { buffer: pdfBuf, fileName: 'SMT_Bill_&_Labour_Token.pdf', caption: 'Single chat test' });
    const queued = smt.getQueuedBillPdfs('test-single-chat');
    assert(queued.length === 1, `Queue must contain exactly 1 PDF item for single chat delivery, got ${queued.length}`);
    assert(queued[0].fileName === 'SMT_Bill_&_Labour_Token.pdf', 'Incorrect queued fileName');
  });

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n==============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
