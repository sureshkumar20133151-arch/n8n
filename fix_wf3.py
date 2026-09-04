import sqlite3, json

db_path = r'C:\Users\Suresh\.n8n\database.sqlite'
workflow_id = 'BwuaqxRdwzwIIHFl'

conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute('SELECT connections FROM workflow_entity WHERE id=?', (workflow_id,))
row = c.fetchone()
if row:
    connections = json.loads(row[0])
    
    # Add connection from Webhook to AI Agent
    if "Webhook" not in connections:
        connections["Webhook"] = {"main": [[]]}
    
    # Check if connection already exists
    exists = False
    for conn_target in connections["Webhook"]["main"][0]:
        if conn_target.get("node") == "AI Agent":
            exists = True
            break
            
    if not exists:
        connections["Webhook"]["main"][0].append({
            "node": "AI Agent",
            "type": "main",
            "index": 0
        })
        
    c.execute('UPDATE workflow_entity SET connections=? WHERE id=?', (json.dumps(connections), workflow_id))
    conn.commit()
    print("Successfully connected Webhook to AI Agent!")
else:
    print("Workflow not found!")

conn.close()
