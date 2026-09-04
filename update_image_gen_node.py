import sqlite3
import json

db_path = 'C:/Users/Suresh/.n8n/database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

row = cursor.execute('SELECT id, name, nodes FROM workflow_entity WHERE id = ?', ('WfLinkedInScheduled04',)).fetchone()
if not row:
    print("Workflow WfLinkedInScheduled04 not found!")
    exit(1)

nodes = json.loads(row[2])

for n in nodes:
    if n['name'] == 'Generate AI Image':
        n['parameters'] = {
            "method": "GET",
            "url": "={{ 'https://image.pollinations.ai/prompt/' + encodeURIComponent($('Get Pending Post Idea').item.json.Topic + ', professional, photorealistic, 8k resolution') + '?width=1024&height=1024&nologo=true' }}",
            "options": {
                "response": {
                    "response": {
                        "responseFormat": "file"
                    }
                }
            }
        }
        print("Updated Generate AI Image node to use Pollinations AI high-res image generator")
        
    elif n['name'] == 'Post to LinkedIn (Image)':
        n['parameters'] = {
            "person": "-XUVlhXDqX",
            "text": "={{ $('Generate LinkedIn Post').item.json.text }}",
            "shareMediaCategory": "IMAGE",
            "binaryData": True,
            "binaryPropertyName": "data",
            "additionalFields": {}
        }
        print("Updated Post to LinkedIn (Image) node binary data mapping")

cursor.execute('UPDATE workflow_entity SET nodes = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("Database updated successfully!")
