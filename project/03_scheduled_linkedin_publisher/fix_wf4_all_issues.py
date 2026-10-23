import sqlite3
import json

db_path = 'C:/Users/Suresh/.n8n/database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

row = cursor.execute('SELECT id, name, nodes, connections FROM workflow_entity WHERE id = ?', ('WfLinkedInScheduled04',)).fetchone()
if not row:
    print("Workflow WfLinkedInScheduled04 not found!")
    exit(1)

nodes = json.loads(row[2])
connections = json.loads(row[3])

print(f"Updating workflow: {row[1]} ({row[0]})")

# 1. Update Nodes
for n in nodes:
    name = n.get('name')
    
    # Fix 3: Post to LinkedIn (Text) -> use generated post text
    if name == 'Post to LinkedIn':
        n['parameters']['text'] = "={{ $('Generate LinkedIn Post').item.json.text }}"
        print(" -> Updated Post to LinkedIn text parameter")
        
    # Fix 4: Mark as Posted -> use .text instead of .finalPost
    elif name == 'Mark as Posted':
        if 'columns' in n['parameters'] and 'value' in n['parameters']['columns']:
            n['parameters']['columns']['value']['Generated Post'] = "={{ $('Generate LinkedIn Post').item.json.text }}"
            print(" -> Updated Mark as Posted Generated Post parameter")
            
    # Fix 5: Send Gmail Alert -> safe message without crashing on missing node execution
    elif name == 'Send Gmail Alert':
        n['parameters']['message'] = "={{ 'Your automated LinkedIn post was just published successfully!\\n\\nTopic: ' + $('Get Pending Post Idea').item.json.Topic + '\\nCategory: ' + $('Get Pending Post Idea').item.json.Category + '\\n\\nCheck your LinkedIn feed to view the post!' }}"
        print(" -> Updated Send Gmail Alert message template")
        
    # Fix 6: Init Video Upload -> Add urn:li:person: prefix
    elif name == 'Init Video Upload':
        n['parameters']['jsonBody'] = "={\n  \"initializeUploadRequest\": {\n    \"owner\": \"urn:li:person:-XUVlhXDqX\",\n    \"fileSizeBytes\": {{ $binary.data.fileSize }},\n    \"uploadCaptions\": false,\n    \"uploadThumbnail\": false\n  }\n}"
        print(" -> Updated Init Video Upload owner URN")
        
    # Fix 6: Post to LinkedIn (Video) -> Add urn:li:person: prefix
    elif name == 'Post to LinkedIn (Video)':
        n['parameters']['jsonBody'] = "={\n  \"author\": \"urn:li:person:-XUVlhXDqX\",\n  \"commentary\": \"{{ $('Generate LinkedIn Post').item.json.text }}\",\n  \"visibility\": \"PUBLIC\",\n  \"distribution\": {\n    \"feedDistribution\": \"MAIN_FEED\",\n    \"targetEntities\": [],\n    \"thirdPartyDistributionChannels\": []\n  },\n  \"content\": {\n    \"media\": {\n      \"id\": \"{{ $('Init Video Upload').item.json.value.video }}\"\n    }\n  },\n  \"lifecycleState\": \"PUBLISHED\",\n  \"isReshareDisabledByAuthor\": false\n}"
        print(" -> Updated Post to LinkedIn (Video) author URN")
        
    # Fix 7: Upload Video -> specify binary body
    elif name == 'Upload Video':
        n['parameters']['sendBody'] = True
        n['parameters']['specifyBody'] = 'binary'
        n['parameters']['inputDataFieldName'] = 'data'
        if 'contentType' in n['parameters']:
            del n['parameters']['contentType']
        print(" -> Updated Upload Video binary body configuration")

# 2. Update Connections
# Fix 1: Connect Schedule Trigger -> Get Pending Post Idea
connections['Schedule Trigger (10 AM IST)'] = {
    "main": [
        [
            {
                "node": "Get Pending Post Idea",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
print(" -> Connected Schedule Trigger (10 AM IST) -> Get Pending Post Idea")

# Fix 2: Has Pending Ideas? (Output 0 TRUE) -> Generate LinkedIn Post -> Check Content Type
connections['Has Pending Ideas?'] = {
    "main": [
        [
            {
                "node": "Generate LinkedIn Post",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "No Pending Ideas",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
print(" -> Connected Has Pending Ideas? (TRUE) -> Generate LinkedIn Post")

connections['Generate LinkedIn Post'] = {
    "main": [
        [
            {
                "node": "Check Content Type",
                "type": "main",
                "index": 0
            }
        ]
    ],
    "ai_languageModel": connections.get('Generate LinkedIn Post', {}).get('ai_languageModel', [])
}
print(" -> Connected Generate LinkedIn Post -> Check Content Type")

# Save changes back to SQLite
cursor.execute('UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), json.dumps(connections), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("✅ Workflow WfLinkedInScheduled04 updated successfully in n8n database!")
