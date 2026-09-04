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
    if n['name'] == 'Check Content Type':
        n['parameters']['value1'] = "={{ ($('Get Pending Post Idea').first().json['Content Type'] || '').trim() }}"
        print("Updated Check Content Type value1 expression to: ={{ ($('Get Pending Post Idea').first().json['Content Type'] || '').trim() }}")

cursor.execute('UPDATE workflow_entity SET nodes = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("Database updated successfully!")
