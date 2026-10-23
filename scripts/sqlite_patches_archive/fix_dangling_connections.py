import sqlite3
import json

db_path = 'C:/Users/Suresh/.n8n/database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

workflows = cursor.execute('SELECT id, name, nodes, connections FROM workflow_entity').fetchall()

for wf_id, wf_name, nodes_json, conn_json in workflows:
    if not nodes_json or not conn_json:
        continue
    nodes = json.loads(nodes_json)
    connections = json.loads(conn_json)
    
    node_names = set(n.get('name') for n in nodes)
    conn_keys = list(connections.keys())
    
    removed_keys = []
    for key in conn_keys:
        if key not in node_names:
            del connections[key]
            removed_keys.append(key)
            
    # Clean up targets as well
    cleaned_connections = {}
    for src_node, outputs in connections.items():
        if src_node not in node_names:
            continue
        cleaned_outputs = {}
        for output_type, output_list in outputs.items():
            cleaned_output_list = []
            for item_list in output_list:
                cleaned_items = [item for item in item_list if item.get('node') in node_names]
                cleaned_output_list.append(cleaned_items)
            cleaned_outputs[output_type] = cleaned_output_list
        cleaned_connections[src_node] = cleaned_outputs
        
    if removed_keys:
        print(f"Workflow '{wf_name}' ({wf_id}): Removed invalid connection keys -> {removed_keys}")
        cursor.execute(
            'UPDATE workflow_entity SET connections = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?',
            (json.dumps(cleaned_connections), wf_id)
        )

conn.commit()
conn.close()

print("Database connections cleaned successfully!")
