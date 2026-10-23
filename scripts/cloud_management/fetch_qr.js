const https = require('https');
const fs = require('fs');

https.get('https://whatsapp-assistant-iqpi.onrender.com', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const match = data.match(/data:image\/png;base64,([^"']+)/);
    if (match) {
      const buffer = Buffer.from(match[1], 'base64');
      fs.writeFileSync('C:/Users/Suresh/.gemini/antigravity/brain/0e00006f-fbbd-4b6d-a382-d5a47c501844/whatsapp_qr.png', buffer);
      console.log('SUCCESS_QR_SAVED');
    } else {
      console.log('NO_QR_IN_HTML');
    }
  });
}).on('error', err => console.error(err.message));
