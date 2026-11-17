/**
 * test_instagram_http_endpoints.js
 * Tests the HTTP endpoints directly on index.js (GET/POST /webhook/instagram, /api/instagram/status)
 */

const http = require('http');

async function testHttpEndpoints() {
  console.log('🌐 Starting local HTTP server verification for Instagram endpoints...');

  // Start the server on a test port
  process.env.PORT = '10088';
  process.env.AUTO_REPLY_DM = 'false'; // disable socket autoconnect in test
  
  // Require index.js
  require('./index.js');

  // Wait 1 second for listen
  await new Promise(r => setTimeout(r, 1000));

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 10088,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        });
      });

      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 1. GET /api/instagram/status
    console.log('1. Testing GET /api/instagram/status...');
    const resStatus = await request('GET', '/api/instagram/status');
    console.log('Status code:', resStatus.status, 'Response:', resStatus.body);
    if (resStatus.status !== 200) throw new Error('Status endpoint failed');

    // 2. GET /webhook/instagram (Verification)
    console.log('2. Testing GET /webhook/instagram (Verification)...');
    const resVerify = await request('GET', '/webhook/instagram?hub.mode=subscribe&hub.challenge=test_meta_challenge_999&hub.verify_token=DANAM_INSTA_VERIFY_TOKEN_2026');
    console.log('Verification status:', resVerify.status, 'Challenge returned:', resVerify.body);
    if (resVerify.status !== 200 || resVerify.body !== 'test_meta_challenge_999') {
      throw new Error('Webhook verification failed');
    }

    // 3. POST /webhook/instagram (Reel Comment Event)
    console.log('3. Testing POST /webhook/instagram (Reel Comment)...');
    const commentPayload = {
      object: 'instagram',
      entry: [{
        id: 'insta_page_123',
        time: Date.now(),
        changes: [{
          field: 'comments',
          value: {
            id: `cmt_http_${Date.now()}`,
            text: 'Rate per sq.ft please? 9876501234',
            from: { id: 'user_456', username: 'prospect_user' }
          }
        }]
      }]
    };
    const resCmt = await request('POST', '/webhook/instagram', commentPayload);
    console.log('Comment webhook status:', resCmt.status, 'Response:', resCmt.body);
    if (resCmt.status !== 200 || resCmt.body !== 'EVENT_RECEIVED') {
      throw new Error('Comment event handling failed');
    }

    // 4. POST /api/instagram/test-comment
    console.log('4. Testing POST /api/instagram/test-comment...');
    const testCmtRes = await request('POST', '/api/instagram/test-comment', {
      text: 'Square feet rate? Villapuram site',
      username: 'madurai_homeowner'
    });
    console.log('Test comment status:', testCmtRes.status, 'Response:', testCmtRes.body);
    if (testCmtRes.status !== 200) throw new Error('Test comment endpoint failed');

    // 5. POST /api/instagram/test-dm
    console.log('5. Testing POST /api/instagram/test-dm...');
    const testDmRes = await request('POST', '/api/instagram/test-dm', {
      senderId: 'dm_user_123',
      text: 'வணக்கம் சார், அண்ணா நகரில் 4 சென்ட் இடம் உள்ளது'
    });
    console.log('Test DM status:', testDmRes.status, 'Response:', testDmRes.body);
    if (testDmRes.status !== 200) throw new Error('Test DM endpoint failed');

    console.log('\n🎉 ALL HTTP ENDPOINTS VERIFIED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ HTTP verification error:', err);
    process.exit(1);
  }
}

testHttpEndpoints();
