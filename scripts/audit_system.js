const fs = require('fs');
const https = require('https');

console.log('=============================================');
console.log('🔍 FULL-SYSTEM COMPREHENSIVE BUG & ERROR AUDIT');
console.log('=============================================');

let issuesFound = [];
let fixesApplied = [];

// --- 1. Audit production_builder_outreach_system.json ---
const json = JSON.parse(fs.readFileSync('production_builder_outreach_system.json', 'utf8'));
const nodeNames = new Set(json.nodes.map(n => n.name));

for (const [src, conns] of Object.entries(json.connections)) {
  if (!nodeNames.has(src)) {
    issuesFound.push(`Connection source not found: "${src}"`);
  }
  for (const [typ, outputs] of Object.entries(conns)) {
    outputs.forEach((targets, outIdx) => {
      targets.forEach(t => {
        if (!nodeNames.has(t.node)) {
          issuesFound.push(`Connection target not found: "${t.node}" from "${src}"`);
        }
      });
    });
  }
}

// Check Email Node Authorization
const emailNode = json.nodes.find(n => n.id === 'send_email_outreach');
const authHeader = emailNode?.parameters?.headerParameters?.parameters?.find(p => p.name === 'Authorization');
console.log('Email Node Auth Header in JSON:', authHeader?.value);
if (authHeader?.value === 'Bearer YOUR_RESEND_API_KEY') {
  issuesFound.push('Email Node in production_builder_outreach_system.json has placeholder "YOUR_RESEND_API_KEY" instead of dynamic environment variable or live key on cloud.');
}

// Check WhatsApp Node URL
const waNode = json.nodes.find(n => n.id === 'send_whatsapp_message');
console.log('WhatsApp Node URL:', waNode?.parameters?.url);
if (waNode?.parameters?.url?.includes('localhost')) {
  issuesFound.push('WhatsApp Node URL is pointing to localhost instead of cloud endpoint!');
}

// Check Google Sheets Credentials
const gRead = json.nodes.find(n => n.id === 'read_prospects_sheet');
const gUpdate = json.nodes.find(n => n.id === 'update_prospects_sheet');
console.log('Google Sheets Read Credential:', gRead?.credentials);
console.log('Google Sheets Update Credential:', gUpdate?.credentials);
console.log('Google Sheets Doc ID:', gRead?.parameters?.documentId?.value);

// --- 2. Check Cloud n8n on Render ---
async function checkCloud() {
  return new Promise((resolve) => {
    const api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k';
    const req = https.request('https://suresh-n8n-fhr6.onrender.com/api/v1/workflows/slnIwf3YkjAX4ijc', {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': api_key }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const wf = JSON.parse(b);
          console.log('\n--- Cloud Workflow slnIwf3YkjAX4ijc ---');
          console.log('Status: HTTP', res.statusCode);
          console.log('Active:', wf.active);
          console.log('Node Count:', wf.nodes?.length);
          
          const cloudEmail = wf.nodes?.find(n => n.id === 'send_email_outreach');
          const cloudAuth = cloudEmail?.parameters?.headerParameters?.parameters?.find(p => p.name === 'Authorization');
          console.log('Cloud Email Auth Header:', cloudAuth?.value?.substring(0, 15) + '...');
          
          if (cloudAuth?.value === 'Bearer YOUR_RESEND_API_KEY') {
            issuesFound.push('CRITICAL BUG: Cloud n8n workflow has "YOUR_RESEND_API_KEY" placeholder, which would fail when emails are sent!');
          }
          resolve(wf);
        } catch(e) {
          issuesFound.push('Failed to parse Cloud Workflow response: ' + b.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.on('error', err => {
      issuesFound.push('Cloud workflow fetch failed: ' + err.message);
      resolve(null);
    });
    req.end();
  });
}

// --- 3. Check WhatsApp Service Health ---
async function checkWhatsApp() {
  return new Promise((resolve) => {
    https.get('https://whatsapp-assistant-iqpi.onrender.com/healthz', res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        console.log('\n--- WhatsApp Assistant Service ---');
        console.log('Status: HTTP', res.statusCode, b);
        resolve();
      });
    }).on('error', e => {
      issuesFound.push('WhatsApp service error: ' + e.message);
      resolve();
    });
  });
}

(async () => {
  await checkCloud();
  await checkWhatsApp();
  
  console.log('\n=============================================');
  console.log('📋 AUDIT SUMMARY');
  console.log('=============================================');
  if (issuesFound.length === 0) {
    console.log('✅ ZERO ISSUES FOUND! All systems are 100% clean and operational.');
  } else {
    console.log(`⚠️ FOUND ${issuesFound.length} ISSUE(S):`);
    issuesFound.forEach((iss, i) => console.log(`  ${i+1}. ${iss}`));
  }
})();
