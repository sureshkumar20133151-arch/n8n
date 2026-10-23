import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', ('WfLinkedInViralPost03',))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

print("NODES:")
for n in nodes:
    print(f"  {n['name']} -> type: {n['type']}")

print("\nCONNECTIONS:")
print(json.dumps(connections, indent=2))

conn.close()
