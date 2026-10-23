import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# Find Gemini model credential reference
gemini_node_name = None
for node in nodes:
    if 'Gemini' in node['name'] and 'Chat' in node['name']:
        gemini_node_name = node['name']
        break

print(f"Found Gemini model node: {gemini_node_name}")

# Create a new LLM Chain node for generating image prompts
image_prompt_node = {
    "id": "Gen_Image_Prompt",
    "name": "Generate Image Prompt",
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.4,
    "position": [1350, 300],
    "parameters": {
        "text": """You are an expert AI image prompt engineer for FLUX.1-schnell model. Your job is to create ONE vivid, detailed image generation prompt for a LinkedIn post illustration.

=== STRICT RULES ===
1. Output ONLY the image prompt. Nothing else. No labels, no explanations.
2. The image must be a modern LinkedIn social media illustration.
3. NEVER include any text, letters, words, or watermarks in the image.
4. Always use blue and white color palette with soft gradients.
5. Style: minimal vector, 3D abstract objects, floating UI cards, clean workspace.
6. The image must visually represent the topic in a creative, metaphorical way.

=== TOPIC ===
{{ $('Get Pending Post Idea').item.json.Topic }}

=== CATEGORY ===
{{ $('Get Pending Post Idea').item.json.Category }}

=== EXAMPLE OUTPUT ===
A futuristic AI assistant robot collaborating with a business owner in a minimalist office, floating holographic dashboards showing automation workflows, glowing blue data streams connecting devices, 3D abstract geometric shapes, blue and white color palette, soft gradients, professional SaaS branding, premium startup aesthetic, clean negative space, no text, no watermark, centered composition, square 1080x1080, ultra detailed, high quality

Now generate a prompt for the given topic:"""
    }
}

# Add new node
nodes.append(image_prompt_node)

# Rewire connections:
# Before: Check Content Type -> (Image branches) -> Generate AI Image
# After:  Check Content Type -> (Image branches) -> Generate Image Prompt -> Generate AI Image

# Update Switch outputs 1 (Image) and 2 (Text & Image) to point to Generate Image Prompt
if 'Check Content Type' in connections:
    connections['Check Content Type']['main'][1] = [{"node": "Generate Image Prompt", "type": "main", "index": 0}]
    connections['Check Content Type']['main'][2] = [{"node": "Generate Image Prompt", "type": "main", "index": 0}]

# Connect Generate Image Prompt -> Generate AI Image
connections['Generate Image Prompt'] = {
    "main": [
        [{"node": "Generate AI Image", "type": "main", "index": 0}]
    ]
}

# Update Generate AI Image to use dynamic prompt from Gemini
for node in nodes:
    if node['name'] == 'Generate AI Image':
        node['parameters']['jsonBody'] = '={ "inputs": "{{ $json.text }}" }'
        node['position'] = [1600, 300]
        print(f"Updated Generate AI Image to use dynamic Gemini prompt")

    # Also connect the Gemini model to the new image prompt node
    if node['name'] == 'Generate Image Prompt':
        node['position'] = [1350, 300]

# Position cleanup
for node in nodes:
    if node['name'] == 'Post to LinkedIn (Image)':
        node['position'] = [1850, 300]

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?', 
          (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('Dynamic Gemini image prompt generation added successfully!')
