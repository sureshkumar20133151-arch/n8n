const https = require('https');
const fs = require('fs');
const resendKey = process.env.RESEND_API_KEY || (fs.existsSync('.env') ? fs.readFileSync('.env','utf8').match(/RESEND_API_KEY=(.*)/)?.[1]?.trim() : 'YOUR_RESEND_API_KEY');

// Suresh's Real Zoomed Face (#OPENTOWORK): https://iili.io/npp0o6g.png
// SoloDeveloper Logo (Clean Light Backing): https://iili.io/npp05wN.png

async function sendWhatsApp() {
  return new Promise((resolve, reject) => {
    const waText = 
`Hi *Suresh*,

I came across *SoloDeveloper Constructions* on Google Maps while researching house builders in *Madurai* (great to see your *4.8★* rating and *24 reviews*!).

Your construction work looks solid. However, I noticed you don't currently have a dedicated website to showcase your completed projects, floor plans, and elevations.

Today, most homeowners compare 3-4 builders online before requesting a quotation.

We help independent builders launch a high-trust digital presence:

✔ *Project Portfolio & 3D Tours* — showcases your completed homes online
✔ *Smart Cost Estimator* — gives clients indicative per sq.ft pricing upfront
✔ *24/7 WhatsApp AI Assistant* — answers queries and books site visits automatically

*(We also build custom software and mobile apps for construction teams).*

Can I send you a quick 2-minute concept preview designed for *SoloDeveloper Constructions*?`;

    const waData = JSON.stringify({
      phone: '918072239594',
      message: waText
    });

    const req = https.request('https://whatsapp-assistant-iqpi.onrender.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(waData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('✅ WhatsApp API Status:', res.statusCode, body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', err => {
      console.error('❌ WhatsApp Error:', err.message);
      reject(err);
    });

    req.write(waData);
    req.end();
  });
}

async function sendEmail() {
  return new Promise((resolve, reject) => {
    // 1. Logo on top of email body
    // 2. Mentions WhatsApp message sent first
    // 3. Real zoomed face of Suresh (#OPENTOWORK) in signature at the end
    // 4. Logo also in signature
    const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; font-size: 15px; line-height: 1.6; max-width: 600px;">
  <div style="margin-bottom: 22px;">
    <img src="https://iili.io/npp05wN.png" alt="SoloDeveloper" height="38" style="display: block; border-radius: 4px;" />
  </div>

  <p>Hi Suresh,</p>
  
  <p>I was researching house builders in Madurai today and came across <strong>SoloDeveloper Constructions</strong> on Google Maps (great to see your <strong>4.8★ rating and 24 reviews</strong>!). I also sent you a quick message on WhatsApp earlier today.</p>
  
  <p>Your completed construction projects look solid. However, I noticed you don't currently have an official website to showcase your completed elevations, floor layouts, and project walkthroughs.</p>
  
  <p>Most homeowners compare multiple contractors online before reaching out. We help house builders set up a professional digital presence that brings in qualified quotation enquiries:</p>
  
  <div style="margin: 14px 0 14px 12px;">
    <div style="margin-bottom: 6px;">&#10004; <strong>Modern Project Portfolio:</strong> showcase your elevations and 360&deg; site walkthroughs</div>
    <div style="margin-bottom: 6px;">&#10004; <strong>Cost &amp; Budget Calculator:</strong> pre-qualifies client budget and plot dimensions</div>
    <div style="margin-bottom: 6px;">&#10004; <strong>24/7 WhatsApp AI Assistant:</strong> answers buyer questions and books site visits</div>
  </div>
  
  <p style="color: #6b7280; font-size: 13px;"><em>(We also build custom web platforms and mobile apps tailored for construction businesses).</em></p>
  
  <p>Would you be open to checking out a quick 2-minute concept preview designed for SoloDeveloper Constructions?</p>
  
  <p style="margin-top: 24px; margin-bottom: 12px; color: #111827;">Best regards,</p>
  
  <table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <tr>
      <td style="vertical-align: middle; padding-right: 14px;">
        <img src="https://iili.io/npp0o6g.png" alt="Suresh Kumar" width="70" height="70" style="border-radius: 50%; display: block; border: 2px solid #16a34a; object-fit: cover;" />
      </td>
      <td style="vertical-align: middle; padding-right: 18px; border-right: 2px solid #e5e7eb;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; line-height: 1.2;">Suresh Kumar</div>
        <div style="font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 3px;">Founder &amp; Lead Engineer &bull; SoloDeveloper.pro</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Builder Digital Experience &amp; Enquiry System</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">&#128241; +91 93615 99097 &bull; &#128205; Madurai, Tamil Nadu</div>
      </td>
      <td style="vertical-align: middle; padding-left: 18px;">
        <img src="https://iili.io/npp05wN.png" alt="SoloDeveloper Logo" height="38" style="display: block; border-radius: 4px;" />
      </td>
    </tr>
  </table>
</div>
`;

    const plainText = 
`SoloDeveloper

Hi Suresh,

I was researching house builders in Madurai today and came across SoloDeveloper Constructions on Google Maps (great to see your 4.8★ rating and 24 reviews!). I also sent you a quick message on WhatsApp earlier today.

Your completed construction projects look solid. However, I noticed you don't currently have an official website to showcase your completed elevations, floor layouts, and project walkthroughs.

Most homeowners compare multiple contractors online before reaching out. We help house builders set up a professional digital presence that brings in qualified quotation enquiries:
✔ Modern Project Portfolio: showcase your elevations and 360° site walkthroughs
✔ Cost & Budget Calculator: pre-qualifies client budget and plot dimensions
✔ 24/7 WhatsApp AI Assistant: answers buyer questions and books site visits

(We also build custom web platforms and mobile apps tailored for construction businesses).

Would you be open to checking out a quick 2-minute concept preview designed for SoloDeveloper Constructions?

Best regards,

Suresh Kumar
Founder & Lead Engineer • SoloDeveloper.pro
Builder Digital Experience & Enquiry System
📱 +91 93615 99097 • 📍 Madurai, Tamil Nadu`;

    const emailPayload = JSON.stringify({
      from: 'Suresh <suresh@solodeveloper.pro>',
      to: ['sureshkumar20133151@gmail.com'],
      reply_to: 'sureshkumar20133151@gmail.com',
      subject: 'SoloDeveloper Constructions — project showcase & inquiry system',
      text: plainText,
      html: emailHtml
    });

    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailPayload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('✅ Resend Email API Status:', res.statusCode, body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', err => {
      console.error('❌ Resend Email Error:', err.message);
      reject(err);
    });

    req.write(emailPayload);
    req.end();
  });
}

async function run() {
  console.log('🚀 Sending preview with Logo on Top and Real Zoomed Avatar...');
  try { await sendWhatsApp(); } catch (e) { console.error('WA err:', e); }
  try { await sendEmail(); } catch (e) { console.error('Email err:', e); }
  console.log('🏁 Done!');
}

run();
