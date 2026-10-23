import urllib.request
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://whatsapp-assistant-iqpi.onrender.com/'

for i in range(15):
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            html = r.read().decode()
            if 'Scan this QR code' in html or 'qr-box' in html:
                print('🎉 SUCCESS: QR Code is LIVE and ready on the page!')
                break
            elif 'ONLINE' in html:
                print('🎉 SUCCESS: Bot is ONLINE and authenticated!')
                break
            else:
                start_tag = 'class="status-box">'
                idx = html.find(start_tag)
                if idx != -1:
                    status = html[idx + len(start_tag):html.find('</div>', idx)]
                    print(f'Attempt {i+1}: {status.strip()}')
                else:
                    print(f'Attempt {i+1}: Waiting for status...')
    except Exception as e:
        print(f'Attempt {i+1} err:', e)
    time.sleep(8)
