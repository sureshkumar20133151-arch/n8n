import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k"
req = urllib.request.Request(
    'https://suresh-n8n-fhr6.onrender.com/api/v1/workflows',
    headers={'X-N8N-API-KEY': api_key, 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
        workflows = data.get('data', [])
        print(f"Total workflows on Cloud: {len(workflows)}")
        for w in workflows:
            print(f"- {w.get('name')} (ID: {w.get('id')})")
except Exception as e:
    print(f"Status check failed: {e}")
