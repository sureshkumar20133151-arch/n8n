import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k"

def inspect_workflow(wf_id, filename):
    url = f'https://suresh-n8n-fhr6.onrender.com/api/v1/workflows/{wf_id}'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': api_key, 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        wf = json.loads(res.read().decode())
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(wf, f, indent=2)
        print(f"Workflow {wf.get('name')} (active: {wf.get('active')}) saved to {filename}")
        for n in wf.get('nodes', []):
            print(f"  Node: {n.get('name')} | Type: {n.get('type')}")

inspect_workflow('leCNPXdEzVtNUt1s', 'current_whatsapp_gemini_wf.json')
inspect_workflow('A4dpOmJiZC7jwjaE', 'current_direct_lead_logger_wf.json')
inspect_workflow('iTGdiQ9ONRwDZxDv', 'current_whatsapp_autoreply_wf.json')
