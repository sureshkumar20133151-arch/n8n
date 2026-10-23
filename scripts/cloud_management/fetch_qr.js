const https = require('https');
const fs = require('fs');

https.get('https://whatsapp-assistant-iqpi.onrender.com', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const match = data.match(/data:image\/png;base64,([^"']+)/);
    if (match) {
      const buffer = Buffer.from(match[1], 'base64');
      fs.writeFileSync('C:/Users/Suresh/.gemini/antigravity/brain/54dd42da-c9cb-436a-ad78-14176b640168/whatsapp_qr.png', buffer);
      console.log('SUCCESS_QR_SAVED');
    } else if (data.includes('ONLINE')) {
      console.log('ALREADY_ONLINE_LOGGED_IN');
    } else {
      console.log('STATUS:', data.substring(0, 300));
    }
  });
}).on('error', err => console.error(err.message));
