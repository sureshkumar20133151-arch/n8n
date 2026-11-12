const fs = require('fs');
const https = require('https');

async function upload() {
  const imageBase64 = fs.readFileSync('profile_suresh.png', { encoding: 'base64' });
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

  let data = '';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="key"\r\n\r\n';
  data += '6d207e02198a847aa98d0a2a901485a5\r\n';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="action"\r\n\r\n';
  data += 'upload\r\n';
  data += '--' + boundary + '\r\n';
  data += 'Content-Disposition: form-data; name="source"\r\n\r\n';
  data += imageBase64 + '\r\n';
  data += '--' + boundary + '--\r\n';

  const req = https.request('https://freeimage.host/api/1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log('PUBLIC_IMAGE_URL:', json.image?.url || json.image?.display_url);
      } catch (e) {
        console.log('Error parsing response:', body);
      }
    });
  });

  req.on('error', err => console.error('Upload Error:', err));
  req.write(data);
  req.end();
}

upload();
