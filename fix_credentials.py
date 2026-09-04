import sqlite3
import json
import uuid
import datetime

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
wf_id = 'WfLinkedInViralPost03'

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
cursor = conn.cursor()

# Get current workflow
cursor.execute('SELECT nodes, connections FROM workflow_entity WHERE id = ?', (wf_id,))
row = cursor.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# Fix: Change all OpenAI nodes to use "OpenAI account 2" (NVIDIA NIM - FREE)
nvidia_cred = {
    "id": "v9JtulMZ8bYcNDSf",
    "name": "OpenAI account 2"
}

changed = 0
for node in nodes:
    if node.get('credentials', {}).get('openAiApi'):
        old_cred = node['credentials']['openAiApi']
        print(f"Node: {node['name']}")
        print(f"  OLD credential: {old_cred.get('name')} (ID: {old_cred.get('id')})")
        node['credentials']['openAiApi'] = nvidia_cred
        print(f"  NEW credential: {nvidia_cred['name']} (ID: {nvidia_cred['id']})")
        changed += 1

if changed > 0:
    cursor.execute('''
        UPDATE workflow_entity 
        SET nodes = ?, updatedAt = ?, versionId = ?
        WHERE id = ?
    ''', (json.dumps(nodes), now, str(uuid.uuid4()), wf_id))
    conn.commit()
    print(f"\n✅ Fixed {changed} node(s) to use NVIDIA NIM (FREE) credential!")
    print("🔄 Refresh your browser (F5) to see the changes.")
else:
    print("No OpenAI nodes found to fix.")

conn.close()
