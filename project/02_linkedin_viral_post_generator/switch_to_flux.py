import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

# The style prompt template for FLUX.1-schnell
style_suffix = (
    ", modern LinkedIn social media illustration, "
    "minimal vector style, blue and white color palette, "
    "professional SaaS branding, soft gradients, "
    "3D abstract objects, floating UI cards, clean workspace, "
    "technology theme, premium startup aesthetic, "
    "negative space, no text, no watermark, "
    "centered composition, square 1080x1080, "
    "ultra detailed, high quality"
)

for node in nodes:
    if node['name'] == 'Generate AI Image':
        # Switch model from SDXL to FLUX.1-schnell
        node['parameters']['url'] = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
        
        # Update prompt to use dynamic topic + professional style
        node['parameters']['sendBody'] = True
        node['parameters']['specifyBody'] = "json"
        node['parameters']['jsonBody'] = (
            '={ "inputs": "{{ $(' + "'Get Pending Post Idea'" + ').item.json.Topic }}' 
            + style_suffix 
            + '" }'
        )
        
        print(f"Updated node: {node['name']}")
        print(f"  Model: FLUX.1-schnell")
        print(f"  URL: {node['parameters']['url']}")

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print('\nFLUX.1-schnell model configured successfully!')
