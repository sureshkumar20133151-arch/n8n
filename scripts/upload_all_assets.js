const fs = require('fs');
const https = require('https');
const path = require('path');

const dl = path.join(process.env.USERPROFILE, 'Downloads');
const files = [
  'ChatGPT Image Jul 30, 2026, 09_50_36 PM.png',
  'ChatGPT Image Jul 30, 2026, 10_01_05 PM.png',
  'ChatGPT Image Jul 30, 2026, 09_46_04 PM.png',
  'ChatGPT Image Jul 27, 2026, 08_34_12 PM.png'
];

async function upload(file) {
  const filePath = path.join(dl, file);
  if (!fs.existsSync(filePath)) return;
  const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW' + Math.random().toString(36).substring(2);
  let data = '';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="key"\r\n\r\n6d207e02198a847aa98d0a2a901485a5\r\n';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="action"\r\n\r\nupload\r\n';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="source"\r\n\r\n' + imageBase64 + '\r\n';
  data += '--' + boundary + '--\r\n';

  return new Promise((resolve) => {
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
          console.log(file, '->', j.image?.url);
          resolve(j.image?.url);
        } catch(e) {
          console.log(file, 'error parsing', b.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const f of files) {
    await upload(f);
  }
})();
