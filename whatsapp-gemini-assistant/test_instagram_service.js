/**
 * test_instagram_service.js
 * Comprehensive unit and integration test suite for the Instagram AI Agent & DM Automation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const instagramService = require('./instagramService');
const builderCustomerMemory = require('./builderCustomerMemory');

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING INSTAGRAM AI AGENT & AUTOMATION TEST SUITE');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}:`, e.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}:`, e.message);
    }
  }

  // -------------------------------------------------------------
  // Test 1: Phone Number Extraction
  // -------------------------------------------------------------
  test('Extract 10-digit Indian Mobile Number', () => {
    const p1 = instagramService.extractPhoneNumber('My number is 9876543210 send details');
    assert.strictEqual(p1, '9876543210');

    const p2 = instagramService.extractPhoneNumber('WhatsApp me on +91 9361599097 please');
    assert.strictEqual(p2, '9361599097');

    const p3 = instagramService.extractPhoneNumber('Hello, I am interested in building a house in Madurai');
    assert.strictEqual(p3, null);

    const p4 = instagramService.extractPhoneNumber('Contact: +91-8903123456');
    assert.strictEqual(p4, '8903123456');
  });

  // -------------------------------------------------------------
  // Test 2: Webhook GET Verification
  // -------------------------------------------------------------
  test('Webhook Verification (GET) - Valid Token', () => {
    let statusCode = null;
    let responseBody = '';
    const mockReq = {
      url: '/webhook/instagram?hub.mode=subscribe&hub.challenge=test_challenge_12345&hub.verify_token=DANAM_INSTA_VERIFY_TOKEN_2026',
      headers: { host: 'localhost' }
    };
    const mockRes = {
      writeHead: (code) => { statusCode = code; },
      end: (body) => { responseBody = body; }
    };

    instagramService.handleVerification(mockReq, mockRes);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody, 'test_challenge_12345');
  });

  test('Webhook Verification (GET) - Invalid Token', () => {
    let statusCode = null;
    const mockReq = {
      url: '/webhook/instagram?hub.mode=subscribe&hub.challenge=test_challenge_12345&hub.verify_token=WRONG_TOKEN',
      headers: { host: 'localhost' }
    };
    const mockRes = {
      writeHead: (code) => { statusCode = code; },
      end: () => {}
    };

    instagramService.handleVerification(mockReq, mockRes);
    assert.strictEqual(statusCode, 403);
  });

  // -------------------------------------------------------------
  // Test 3: Reel Comment Processing & Auto-DM Trigger
  // -------------------------------------------------------------
  await testAsync('Process Reel Comment & Trigger Public Reply + Private DM', async () => {
    const commentId = `test_comment_${Date.now()}`;
    const commentData = {
      id: commentId,
      text: 'Square feet rate evlo sir? Villapuram site',
      from: { username: 'karthik_madurai' }
    };

    const result = await instagramService.handleReelComment(commentData);
    assert.ok(result.publicReply, 'Should generate public reply');
    assert.ok(result.privateDm, 'Should generate private DM greeting');
    assert.ok(result.privateDm.includes('Standard Package'), 'Private DM should include package pricing');
    assert.ok(result.privateDm.includes('Premium Luxury Package'), 'Private DM should include luxury pricing');
  });

  // -------------------------------------------------------------
  // Test 4: Reel Comment with Direct Phone Number
  // -------------------------------------------------------------
  await testAsync('Process Reel Comment with Embedded Phone Number', async () => {
    const commentId = `test_comment_phone_${Date.now()}`;
    const commentData = {
      id: commentId,
      text: 'Call me 9842154321 for 3 cent plot in Goripalayam',
      from: { username: 'ramesh_builder_lead' }
    };

    const result = await instagramService.handleReelComment(commentData);
    assert.ok(result.publicReply);
    assert.ok(result.privateDm);

    // Verify enquiry file was written
    const enquiriesFile = path.resolve(__dirname, 'data', 'construction_enquiries.json');
    assert.ok(fs.existsSync(enquiriesFile), 'Enquiries file must exist');
    const data = JSON.parse(fs.readFileSync(enquiriesFile, 'utf-8'));
    const found = data.find(item => item.customerPhone === '919842154321');
    assert.ok(found, 'Lead with phone 919842154321 must be recorded in construction_enquiries.json');
  });

  // -------------------------------------------------------------
  // Test 5: Incoming Instagram DM Processing with Gemini & Memory
  // -------------------------------------------------------------
  await testAsync('Handle Incoming DM & Update Customer Memory Profile', async () => {
    const senderId = `user_${Date.now()}`;
    const userText = 'வணக்கம், வில்லாபுரத்தில் 3 சென்ட் இடம் உள்ளது. G+1 கட்ட வேண்டும், 9876543210';

    const result = await instagramService.handleIncomingDM(senderId, userText);
    assert.ok(result.replyText, 'Must generate AI reply');

    // Check memory profile
    const profile = builderCustomerMemory.getProfile(`insta_builder_${senderId}`);
    assert.ok(profile.customer_phone && profile.customer_phone.includes('9876543210'), 'Phone should be stored in memory');
    assert.ok(profile.location && profile.location.includes('Villapuram'), 'Location should be Villapuram');
    assert.strictEqual(profile.house_type, 'G+1 Duplex');
  });

  // -------------------------------------------------------------
  // Test 6: Instagram Service Status
  // -------------------------------------------------------------
  test('Instagram Service Status Telemetry', () => {
    const status = instagramService.getStatus();
    assert.strictEqual(status.engine, 'instagram-graph-api-v19.0');
    assert.strictEqual(status.verifyToken, 'DANAM_INSTA_VERIFY_TOKEN_2026');
    assert.strictEqual(status.webhookEndpoint, '/webhook/instagram');
    assert.ok(status.processedComments >= 2, 'Should track processed comments');
  });

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('========================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
