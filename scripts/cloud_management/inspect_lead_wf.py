import urllib.request
import json

api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k"
url = 'https://suresh-n8n-fhr6.onrender.com/api/v1/workflows/A4dpOmJiZC7jwjaE'

req = urllib.request.Request(url, headers={'X-N8N-API-KEY': api_key, 'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode())
    print("Keys:", list(data.keys()))
    print("Active:", data.get('active'))
    for n in data.get('nodes', []):
        print(f"Node: {n.get('name')} ({n.get('type')})")
        if 'googleSheets' in n.get('type', ''):
            cols = n.get('parameters', {}).get('columns', {})
            print("Google Sheets node values:", json.dumps(cols, indent=2))
