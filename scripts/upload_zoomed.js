const fs = require('fs');
const https = require('https');

const imageBase64 = fs.readFileSync('suresh_zoomed_circle_avatar.png', { encoding: 'base64' });
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW' + Math.random().toString(36).substring(2);
let data = '';
data += '--' + boundary + '\r\n';
data += 'Content-Disposition: form-data; name="key"\r\n\r\n6d207e02198a847aa98d0a2a901485a5\r\n';
data += '--' + boundary + '\r\n';
data += 'Content-Disposition: form-data; name="action"\r\n\r\nupload\r\n';
data += '--' + boundary + '\r\n';
data += 'Content-Disposition: form-data; name="source"\r\n\r\n' + imageBase64 + '\r\n';
data += '--' + boundary + '--\r\n';

const req = https.request('https://freeimage.host/api/1/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(b);
      console.log('ZOOMED_AVATAR_URL:', j.image?.url);
    } catch(e) {
      console.log('Error parsing:', b.substring(0, 100));
    }
  });
});
req.write(data);
req.end();
