import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()
c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', ('WfLinkedInViralPost03',))
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    print("=== NODES ===")
    for n in nodes:
        print(f"  Name: {n['name']}")
        print(f"  Type: {n['type']} (v{n.get('typeVersion', 1)})")
        print(f"  ID: {n.get('id')}")
        print(f"  Position: {n.get('position')}")
        print()
    print("=== CONNECTIONS ===")
    print(json.dumps(connections, indent=2))
else:
    print("Workflow not found!")

# Also check installed community nodes
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
print("\n=== TABLES ===")
for t in tables:
    if 'community' in t.lower() or 'installed' in t.lower():
        print(f"  {t}")
        c.execute(f'SELECT * FROM "{t}"')
        print(f"  Data: {c.fetchall()}")

conn.close()
