import urllib.request
import json

api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k'
req = urllib.request.Request('https://suresh-n8n-fhr6.onrender.com/api/v1/credentials', headers={'X-N8N-API-KEY': api_key})
try:
    with urllib.request.urlopen(req) as res:
        creds = json.loads(res.read().decode())
        for c in creds.get('data', []):
            print(f"ID: {c.get('id')} | Name: {c.get('name')} | Type: {c.get('type')}")
except Exception as e:
    print('Error:', e)
