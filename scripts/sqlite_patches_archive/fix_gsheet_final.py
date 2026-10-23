import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

for node in nodes:
    if node['name'] == 'Mark as Posted':
        node['parameters']['columns'] = {
            "mappingMode": "defineBelow",
            "value": {
                "Topic": "={{ $('Get Pending Post Idea').item.json.Topic }}",
                "Status": "Posted",
                "Posted Date": "={{ $now.format('dd-MM-yyyy') }}",
                "Generated Post": "={{ $('Prepare Final Post').item.json.finalPost }}"
            },
            "matchingColumns": [
                "Topic"
            ],
            "schema": [
                {"id": "Topic", "displayName": "Topic", "type": "string", "canBeUsedToMatch": True},
                {"id": "Category", "displayName": "Category", "type": "string", "canBeUsedToMatch": True},
                {"id": "Target Audience", "displayName": "Target Audience", "type": "string", "canBeUsedToMatch": True},
                {"id": "Tone", "displayName": "Tone", "type": "string", "canBeUsedToMatch": True},
                {"id": "Status", "displayName": "Status", "type": "string", "canBeUsedToMatch": True},
                {"id": "Posted Date", "displayName": "Posted Date", "type": "string", "canBeUsedToMatch": True},
                {"id": "Generated Post", "displayName": "Generated Post", "type": "string", "canBeUsedToMatch": True}
            ]
        }

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print('Mark as Posted fixed permanently!')
