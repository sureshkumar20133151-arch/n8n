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
        # Fix all expressions to use correct node references
        node['parameters']['columns'] = {
            "mappingMode": "defineBelow",
            "value": {
                "Topic": "={{ $('Restore Topic').item.json.topic }}",
                "Status": "Posted",
                "Posted Date": "={{ $now.format('dd-MM-yyyy') }}",
                "Generated Post": "={{ $('Restore Topic').item.json.generatedPost || $('Generate LinkedIn Post').item.json.text }}",
                "Post Link": "={{ 'https://www.linkedin.com/feed/update/' + $('Restore Topic').item.json.urn }}"
            },
            "matchingColumns": ["Topic"],
            "schema": [
                {"id": "Topic", "displayName": "Topic", "type": "string", "canBeUsedToMatch": True},
                {"id": "Category", "displayName": "Category", "type": "string", "canBeUsedToMatch": True},
                {"id": "Target Audience", "displayName": "Target Audience", "type": "string", "canBeUsedToMatch": True},
                {"id": "Tone", "displayName": "Tone", "type": "string", "canBeUsedToMatch": True},
                {"id": "Content Type", "displayName": "Content Type", "type": "string", "canBeUsedToMatch": True},
                {"id": "Status", "displayName": "Status", "type": "string", "canBeUsedToMatch": True},
                {"id": "Posted Date", "displayName": "Posted Date", "type": "string", "canBeUsedToMatch": True},
                {"id": "Generated Post", "displayName": "Generated Post", "type": "string", "canBeUsedToMatch": True},
                {"id": "Post Link", "displayName": "Post Link", "type": "string", "canBeUsedToMatch": True},
                {"id": "Video Link", "displayName": "Video Link", "type": "string", "canBeUsedToMatch": True}
            ]
        }
        print("Fixed Mark as Posted node expressions")

    # Also fix Restore Topic to capture data from ALL branches
    if node['name'] == 'Restore Topic':
        node['parameters'] = {
            "assignments": {
                "assignments": [
                    {
                        "id": "topic",
                        "name": "topic",
                        "value": "={{ $('Get Pending Post Idea').item.json.Topic }}",
                        "type": "string"
                    },
                    {
                        "id": "urn",
                        "name": "urn",
                        "value": "={{ $json.urn || $json.id || '' }}",
                        "type": "string"
                    },
                    {
                        "id": "generatedPost",
                        "name": "generatedPost",
                        "value": "={{ $('Generate LinkedIn Post').item.json.text }}",
                        "type": "string"
                    }
                ]
            }
        }
        print("Fixed Restore Topic node expressions")

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print('All node references fixed!')
