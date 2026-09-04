import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# Extract LinkedIn Credential ID
li_credentials = None
li_person = None
for node in nodes:
    if node['name'] == 'Post to LinkedIn':
        li_credentials = node.get('credentials')
        li_person = node['parameters'].get('person')
        break

# Create new nodes
switch_node = {
    "id": "Switch_ContentType",
    "name": "Check Content Type",
    "type": "n8n-nodes-base.switch",
    "typeVersion": 1,
    "position": [580, 200], # After Has Pending Ideas?
    "parameters": {
        "dataType": "string",
        "value1": "={{ $json[\"Content Type\"] }}",
        "rules": {
            "rules": [
                {"operation": "equal", "value2": "Text"},
                {"operation": "equal", "value2": "Image"},
                {"operation": "equal", "value2": "Text & Image"},
                {"operation": "equal", "value2": "Video"},
                {"operation": "equal", "value2": "Text & Video"}
            ]
        },
        "fallbackOutput": 0
    }
}

hf_node = {
    "id": "Generate_Image",
    "name": "Generate AI Image",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [800, 350],
    "parameters": {
        "method": "POST",
        "url": "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "Bearer YOUR_HUGGINGFACE_TOKEN"}
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={ \"inputs\": \"{{ $('Get Pending Post Idea').item.json.Topic }}, professional, photorealistic, 8k resolution, highly detailed\" }",
        "options": {
            "response": {
                "response": {
                    "responseFormat": "file",
                    "outputPropertyName": "data"
                }
            }
        }
    }
}

li_image_node = {
    "id": "Post_LinkedIn_Image",
    "name": "Post to LinkedIn (Image)",
    "type": "n8n-nodes-base.linkedIn",
    "typeVersion": 1,
    "position": [1000, 350],
    "parameters": {
        "person": li_person,
        "text": "={{ $('Generate LinkedIn Post').item.json.text }}",
        "shareMediaCategory": "IMAGE",
        "imageProperty": "data"
    }
}
if li_credentials:
    li_image_node['credentials'] = li_credentials

# Add nodes
nodes.extend([switch_node, hf_node, li_image_node])

# Re-route connections
# Old: Has Pending Ideas? (true) -> Generate LinkedIn Post -> Prepare Final Post (removed) -> Post to LinkedIn
# New: Has Pending Ideas? (true) -> Switch_ContentType
# Switch_ContentType -> 
#   output 0 (Text) -> Generate LinkedIn Post -> Post to LinkedIn -> Restore Topic
#   output 1 (Image) -> Generate LinkedIn Post -> Generate AI Image -> Post LinkedIn Image -> Restore Topic
#   output 2 (Text & Image) -> Generate LinkedIn Post -> Generate AI Image -> Post LinkedIn Image -> Restore Topic

# Find 'Has Pending Ideas?' and route it to 'Check Content Type' instead of 'Generate LinkedIn Post'
if 'Has Pending Ideas?' in connections and len(connections['Has Pending Ideas?']['main']) > 0:
    connections['Has Pending Ideas?']['main'][0] = [
        {"node": "Check Content Type", "type": "main", "index": 0}
    ]

# Setup Switch connections
connections['Check Content Type'] = {
    "main": [
        [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}], # Text
        [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}], # Image
        [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}], # Text & Image
        [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}], # Video (fallback to Text)
        [{"node": "Generate LinkedIn Post", "type": "main", "index": 0}], # Text & Video (fallback to Text)
    ]
}

# The problem with routing them all to 'Generate LinkedIn Post' is that after 'Generate LinkedIn Post', we need to branch AGAIN to Generate Image vs Normal Post.
# Actually, the Switch should be AFTER Generate LinkedIn Post!
# Because Generate LinkedIn Post generates the text for BOTH Text and Text & Image.
# Let's rewrite the logic: Has Pending Ideas? -> Generate LinkedIn Post -> Check Content Type -> 
#   Text -> Post to LinkedIn
#   Image -> Generate AI Image -> Post LinkedIn Image
#   Text & Image -> Generate AI Image -> Post LinkedIn Image

# Re-doing the connections logic:
# Has Pending Ideas -> Generate LinkedIn Post (already there)
# Generate LinkedIn Post -> Check Content Type
if 'Generate LinkedIn Post' in connections:
    connections['Generate LinkedIn Post']['main'][0] = [
        {"node": "Check Content Type", "type": "main", "index": 0}
    ]

# Switch_ContentType -> 
connections['Check Content Type'] = {
    "main": [
        [{"node": "Post to LinkedIn", "type": "main", "index": 0}], # 0: Text
        [{"node": "Generate AI Image", "type": "main", "index": 0}], # 1: Image
        [{"node": "Generate AI Image", "type": "main", "index": 0}], # 2: Text & Image
        [{"node": "Post to LinkedIn", "type": "main", "index": 0}], # 3: Video
        [{"node": "Post to LinkedIn", "type": "main", "index": 0}], # 4: Text & Video
    ]
}

# Generate AI Image -> Post LinkedIn Image
connections['Generate AI Image'] = {
    "main": [
        [{"node": "Post to LinkedIn (Image)", "type": "main", "index": 0}]
    ]
}

# Post LinkedIn Image -> Restore Topic
connections['Post to LinkedIn (Image)'] = {
    "main": [
        [{"node": "Restore Topic", "type": "main", "index": 0}]
    ]
}

# Adjust positions
for n in nodes:
    if n['name'] == 'Generate LinkedIn Post':
        n['position'] = [600, 200]
    elif n['name'] == 'Check Content Type':
        n['position'] = [800, 200]
    elif n['name'] == 'Post to LinkedIn':
        n['position'] = [1000, 100]
    elif n['name'] == 'Restore Topic':
        n['position'] = [1200, 200]
    elif n['name'] == 'Mark as Posted':
        n['position'] = [1400, 200]

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?', (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('Image branching logic added!')
