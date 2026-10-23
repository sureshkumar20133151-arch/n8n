import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

# 1. Remove the unused 'Prepare Final Post' node completely from nodes list if present
nodes = [n for n in nodes if n['name'] != 'Prepare Final Post']

# 2. Scour all nodes and replace any reference to 'Prepare Final Post' with 'Generate LinkedIn Post'
for node in nodes:
    node_str = json.dumps(node)
    if 'Prepare Final Post' in node_str:
        print(f"Fixing references in node: {node['name']}")
        node_json_str = json.dumps(node)
        node_json_str = node_json_str.replace("$('Prepare Final Post')", "$('Generate LinkedIn Post')")
        node_json_str = node_json_str.replace("$('Prepare Final Post').item.json.finalPost", "$('Generate LinkedIn Post').item.json.text")
        node_json_str = node_json_str.replace("Prepare Final Post", "Generate LinkedIn Post")
        fixed_node = json.loads(node_json_str)
        node.clear()
        node.update(fixed_node)

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print("Cleaned all references to 'Prepare Final Post' successfully!")
