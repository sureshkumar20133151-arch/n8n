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

# In the current connection structure:
# output index 0 -> Post to LinkedIn (Text)
# output index 1 -> Generate AI Image
# output index 2 -> Generate AI Image
# output index 3 -> Download Video
# output index 4 -> Download Video

# Reorder rules so specific composite matches are evaluated FIRST:
# Rule 0: "Text & Image"  -> output 2 (Generate AI Image)
# Rule 1: "Text & Video"  -> output 4 (Download Video)
# Rule 2: "Image"         -> output 1 (Generate AI Image)
# Rule 3: "Video"         -> output 3 (Download Video)
# Rule 4: "Text"          -> output 0 (Post to LinkedIn Text)

for n in nodes:
    if n['name'] == 'Check Content Type':
        n['parameters'] = {
            "dataType": "string",
            "value1": "={{ ($('Get Pending Post Idea').first().json['Content Type'] || '').trim() }}",
            "rules": {
                "rules": [
                    {
                        "operation": "equal",
                        "value2": "Text & Image"
                    },
                    {
                        "operation": "equal",
                        "value2": "Text & Video"
                    },
                    {
                        "operation": "equal",
                        "value2": "Image"
                    },
                    {
                        "operation": "equal",
                        "value2": "Video"
                    },
                    {
                        "operation": "equal",
                        "value2": "Text"
                    }
                ]
            },
            "fallbackOutput": 4
        }
        print("Reordered rules on Check Content Type: Text & Image first!")

# Update connections for Check Content Type to match new rule indexes:
# Output 0 (Rule 0: "Text & Image") -> Generate AI Image
# Output 1 (Rule 1: "Text & Video") -> Download Video
# Output 2 (Rule 2: "Image")        -> Generate AI Image
# Output 3 (Rule 3: "Video")        -> Download Video
# Output 4 (Rule 4: "Text")         -> Post to LinkedIn

connections['Check Content Type'] = {
    "main": [
        [
            {
                "node": "Generate AI Image",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Download Video",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Generate AI Image",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Download Video",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Post to LinkedIn",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

cursor.execute('UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), json.dumps(connections), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("Workflow WfLinkedInScheduled04 updated with reordered switch rules successfully!")
