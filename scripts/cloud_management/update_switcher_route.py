import os

index_path = r'whatsapp-gemini-assistant\index.js'
with open(index_path, 'r', encoding='utf-8') as f:
    s = f.read()

start_tag = "res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });"
idx = s.rfind(start_tag)
listen_idx = s.find('server.listen(', idx)

replacement = """  // Dynamic QR Code API for the Switcher Dashboard
  if (req.url === '/api/qr-data' || req.url === '/qr-data') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    });
    return res.end(JSON.stringify({
      ready: isClientReady,
      status: isClientReady ? 'online' : 'connecting',
      qrDataUrl: latestQrDataUrl || null
    }));
  }

  // Serve the complete Interactive Multi-Persona Switcher Dashboard for Home (/) and (/switcher)
  const candidatePaths = [
    path.resolve(__dirname, 'data', 'switcher_web_page.html'),
    path.resolve(__dirname, 'switcher_web_page.html'),
    path.resolve(__dirname, '..', 'project', 'switcher_web_page.html')
  ];
  for (const switcherPath of candidatePaths) {
    if (fs.existsSync(switcherPath)) {
      const html = fs.readFileSync(switcherPath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': allowedOrigin
      });
      return res.end(html);
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end('<h1>SoloDeveloper.pro Switcher Dashboard is loading...</h1>');
});

"""

new_s = s[:idx] + replacement + s[listen_idx:]
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(new_s)

print("SUCCESS_PYTHON_REPLACE")
