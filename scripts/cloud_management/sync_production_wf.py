import urllib.request
import urllib.error
import json

api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k'
workflow_id = 'slnIwf3YkjAX4ijc'
url = f'https://suresh-n8n-fhr6.onrender.com/api/v1/workflows/{workflow_id}'

with open('production_builder_outreach_system.json', 'r', encoding='utf-8') as f:
    wf_data = json.load(f)

payload = {
    'name': wf_data.get('name', 'Production Builder Outreach System (Prospects -> WhatsApp & Gmail)'),
    'nodes': wf_data['nodes'],
    'connections': wf_data['connections'],
    'settings': wf_data.get('settings', {'executionOrder': 'v1'})
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'},
    method='PUT'
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("✅ Successfully Synced Workflow to Render n8n Cloud!")
        print("Workflow ID:", res.get('id'))
        print("Name:", res.get('name'))
        print("Active Status (Kept Inactive per instruction):", res.get('active'))
        print("Total Nodes:", len(res.get('nodes', [])))
        print("Updated At:", res.get('updatedAt'))
except urllib.error.HTTPError as e:
    print("❌ HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("❌ Error:", e)
