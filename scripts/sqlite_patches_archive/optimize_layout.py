import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

# Clean layout positions
# Main horizontal flow (Y=300, center row)
# Text branch (Y=100, top row)  
# Image branch (Y=300, same as main, continues right)
# Video branch (Y=520, bottom row)
# No Pending Ideas (Y=450, below main early)

positions = {
    # === MAIN FLOW (Left to Right) ===
    "Schedule Trigger (10 AM IST)":  [200, 300],
    "When clicking 'Execute workflow'": [200, 300],  # same trigger spot
    "Get Pending Post Idea":          [450, 300],
    "Has Pending Ideas?":             [700, 300],
    "No Pending Ideas":               [700, 480],
    "Generate LinkedIn Post":         [950, 300],
    "Google Gemini Chat Model":       [950, 480],
    "Check Content Type":             [1200, 300],
    
    # === TEXT BRANCH (Top Row) ===
    "Prepare Final Post":             [1450, 100],
    "Post to LinkedIn":               [1450, 100],
    
    # === IMAGE BRANCH (Middle Row) ===
    "Generate AI Image":              [1450, 300],
    "Post to LinkedIn (Image)":       [1700, 300],
    
    # === VIDEO BRANCH (Bottom Row) ===
    "Download Video":                 [1450, 520],
    "Init Video Upload":              [1700, 520],
    "Upload Video":                   [1950, 520],
    "Extract ETag":                   [2200, 520],
    "Finalize Video Upload":          [2450, 520],
    "Wait for Processing":            [2700, 520],
    "Post to LinkedIn (Video)":       [2950, 520],
    
    # === MERGE POINT (All branches converge) ===
    "Restore Topic":                  [3200, 300],
    "Mark as Posted":                 [3450, 300],
    "Send Gmail Alert":               [3700, 300],
}

# Find trigger nodes - they might have slightly different names
trigger_names = []
for node in nodes:
    if 'Schedule' in node['name'] or 'Trigger' in node['name']:
        trigger_names.append(node['name'])

for node in nodes:
    name = node['name']
    if name in positions:
        node['position'] = positions[name]
    # Handle trigger nodes that might have different exact names
    elif 'Schedule' in name and 'Trigger' in name:
        node['position'] = [200, 200]
    elif 'Execute' in name and 'clicking' in name:
        node['position'] = [200, 380]

print("Nodes found and repositioned:")
for node in nodes:
    print(f"  {node['name']:40s} -> {node['position']}")

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print('\nWorkflow layout optimized!')
