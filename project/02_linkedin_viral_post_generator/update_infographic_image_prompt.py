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

infographic_url = "={{ 'https://image.pollinations.ai/prompt/' + encodeURIComponent('High quality professional LinkedIn infographic poster and visual breakdown about: ' + $('Get Pending Post Idea').first().json['Topic'] + '. Sleek infographic layout with bold headline text, step-by-step process flowchart, modern dark navy and vibrant cyan background, crisp vector icons, professional business graphic design, 4k ultra detailed, vector art masterpiece') + '?width=1200&height=1200&model=flux&nologo=true&enhance=true&seed=' + $now.timestamp }}"

for n in nodes:
    if n['name'] == 'Generate AI Image':
        n['parameters']['url'] = infographic_url
        print("Updated Generate AI Image prompt to Infographic Storytelling Engine!")

cursor.execute('UPDATE workflow_entity SET nodes = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("Database updated with Infographic Storytelling image generator!")
