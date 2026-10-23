import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', ('WfLinkedInViralPost03',))
row = c.fetchone()
nodes = json.loads(row[0])

print("Node credentials:")
for n in nodes:
    if 'openAiApi' in n.get('credentials', {}):
        cred = n['credentials']['openAiApi']
        print(f"{n['name']}: {cred.get('name')}")

conn.close()
