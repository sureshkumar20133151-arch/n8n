import urllib.request
import json

api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k'
workflow_id = 'A4dpOmJiZC7jwjaE'
url = f'https://suresh-n8n-fhr6.onrender.com/api/v1/executions?workflowId={workflow_id}&limit=3'

req = urllib.request.Request(url, headers={'X-N8N-API-KEY': api_key, 'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        executions = data.get('data', [])
        print(f"Total executions retrieved: {len(executions)}")
        for ex in executions:
            print(f"- Execution ID: {ex.get('id')}, Status: {ex.get('status')}, Finished: {ex.get('finished')}, Mode: {ex.get('mode')}")
except Exception as e:
    print("Error:", e)
