import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

gmail_node = {
    "id": "Send_Gmail",
    "name": "Send Gmail Alert",
    "type": "n8n-nodes-base.gmail",
    "typeVersion": 2.1,
    "position": [1360, 200],
    "parameters": {
        "operation": "send",
        "sendTo": "suresh@example.com", 
        "subject": "={{ '✅ LinkedIn Post Published: ' + $('Get Pending Post Idea').item.json.Topic }}",
        "message": "={{ 'Your automated LinkedIn post was just published!\\n\\nTopic: ' + $('Get Pending Post Idea').item.json.Topic + '\\nCategory: ' + $('Get Pending Post Idea').item.json.Category + '\\n\\nView your post here:\\nhttps://www.linkedin.com/feed/update/' + $('Post to LinkedIn').item.json.urn }}",
        "appendAttribution": False
    }
}

for node in nodes:
    if node['name'] == 'Generate LinkedIn Post':
        text = node['parameters'].get('text', '')
        text = text.replace('❌ No hashtags (added separately)', '✅ Add 3-5 highly relevant hashtags at the bottom of the post')
        node['parameters']['text'] = text
    
    if node['name'] == 'Mark as Posted':
        # Add Post Link to schema and values
        node['parameters']['columns']['value']['Post Link'] = "={{ 'https://www.linkedin.com/feed/update/' + $('Post to LinkedIn').item.json.urn }}"
        node['parameters']['columns']['schema'].append(
            {"id": "Post Link", "displayName": "Post Link", "type": "string", "canBeUsedToMatch": True}
        )

# Add Gmail Node
nodes.append(gmail_node)

# Connect Mark as Posted -> Gmail Node
if 'Mark as Posted' not in connections:
    connections['Mark as Posted'] = {"main": [[]]}
if len(connections['Mark as Posted']['main']) == 0:
    connections['Mark as Posted']['main'].append([])

connections['Mark as Posted']['main'][0] = [
    {
        "node": "Send Gmail Alert",
        "type": "main",
        "index": 0
    }
]

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?', (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('Workflow updated: Gmail Node, Post Link, and Hashtags added!')
