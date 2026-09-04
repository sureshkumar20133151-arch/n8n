import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# 1. Create the Set node
set_node = {
    "id": "Set_Topic",
    "name": "Restore Topic",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.2,
    "position": [960, 200],
    "parameters": {
        "assignments": {
            "assignments": [
                {
                    "id": "assignment1",
                    "name": "Topic",
                    "value": "={{ $('Get Pending Post Idea').item.json.Topic }}",
                    "type": "string"
                }
            ]
        },
        "options": {}
    }
}

# 2. Update Mark as Posted position to make room
for node in nodes:
    if node['name'] == 'Mark as Posted':
        node['position'] = [1160, 200]
        # ensure matching column is Topic
        if 'columns' not in node['parameters']:
            node['parameters']['columns'] = {}
        node['parameters']['columns']['matchingColumns'] = ['Topic']
        node['parameters']['columns']['mappingMode'] = 'defineBelow'

# 3. Add node
nodes.append(set_node)

# 4. Update connections
# Disconnect "Post to LinkedIn" from "Mark as Posted"
# Connect "Post to LinkedIn" -> "Restore Topic"
# Connect "Restore Topic" -> "Mark as Posted"

if 'Post to LinkedIn' in connections and 'main' in connections['Post to LinkedIn'] and len(connections['Post to LinkedIn']['main']) > 0:
    connections['Post to LinkedIn']['main'][0] = [
        {
            "node": "Restore Topic",
            "type": "main",
            "index": 0
        }
    ]

connections['Restore Topic'] = {
    "main": [
        [
            {
                "node": "Mark as Posted",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?', (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('Graph fixed with Restore Topic node!')
