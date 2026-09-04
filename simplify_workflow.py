import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# Nodes to REMOVE (all image/video related)
remove_names = [
    'Check Content Type',
    'Generate Image Prompt',
    'Generate AI Image',
    'Post to LinkedIn (Image)',
    'Download Video',
    'Init Video Upload',
    'Upload Video',
    'Extract ETag',
    'Finalize Video Upload',
    'Wait for Processing',
    'Post to LinkedIn (Video)',
    'Prepare Final Post',
]

# Remove nodes
before = len(nodes)
nodes = [n for n in nodes if n['name'] not in remove_names]
after = len(nodes)
print(f"Removed {before - after} nodes (kept {after})")

# Remove connections for deleted nodes
for name in remove_names:
    if name in connections:
        del connections[name]

# Rewire: Generate LinkedIn Post → Post to LinkedIn (direct)
connections['Generate LinkedIn Post'] = {
    "main": [
        [{"node": "Post to LinkedIn", "type": "main", "index": 0}]
    ]
}

# Post to LinkedIn → Restore Topic
connections['Post to LinkedIn'] = {
    "main": [
        [{"node": "Restore Topic", "type": "main", "index": 0}]
    ]
}

# Clean layout - simple straight line
positions = {
    "Schedule Trigger (10 AM IST)": [200, 300],
    "Get Pending Post Idea":        [450, 300],
    "Has Pending Ideas?":           [700, 300],
    "No Pending Ideas":             [700, 480],
    "Generate LinkedIn Post":       [950, 300],
    "Google Gemini Chat Model":     [950, 480],
    "Post to LinkedIn":             [1200, 300],
    "Restore Topic":                [1450, 300],
    "Mark as Posted":               [1700, 300],
    "Send Gmail Alert":             [1950, 300],
}

for node in nodes:
    if node['name'] in positions:
        node['position'] = positions[node['name']]
    elif 'Execute' in node.get('name', '') and 'clicking' in node.get('name', ''):
        node['position'] = [200, 420]

# Print remaining nodes
print("\nRemaining nodes:")
for n in nodes:
    print(f"  {n['name']}")

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?',
          (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('\nWorkflow simplified to text-only! Clean and simple.')
