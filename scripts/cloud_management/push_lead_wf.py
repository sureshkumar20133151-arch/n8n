import urllib.request
import urllib.error
import json

api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWM2MjkyOS04MTkzLTQ1NTctOTJjYy00YmYzODA5MDQ1NjYiLCJpc3MiOiJuOG4iLCJqdGkiOiI1NjdlZGJhMi0xOTYxLTRmMWItOTBjNC0xZjMwOWNjMTFhNTQiLCJpYXQiOjE3OTIwMDU0NDYsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.7qMwMUwJ1rehgdEguJRm956DwFyhkOd-2xmRNAoqZ1k'
workflow_id = 'A4dpOmJiZC7jwjaE'
url = f'https://suresh-n8n-fhr6.onrender.com/api/v1/workflows/{workflow_id}'

with open('whatsapp_direct_lead_logger_workflow.json', 'r', encoding='utf-8') as f:
    wf_data = json.load(f)

payload = {
    'name': wf_data['name'],
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
        print("Updated Workflow ID:", res.get('id'))
        print("Active Status:", res.get('active'))
        print("Nodes count:", len(res.get('nodes', [])))

    # Ensure it's active
    act_req = urllib.request.Request(
        f'{url}/activate',
        headers={'X-N8N-API-KEY': api_key},
        method='POST'
    )
    with urllib.request.urlopen(act_req) as act_resp:
        act_res = json.loads(act_resp.read().decode('utf-8'))
        print("Workflow is Active:", act_res.get('active'))

except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
