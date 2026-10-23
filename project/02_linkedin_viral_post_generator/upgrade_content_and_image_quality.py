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

# Upgraded Viral System Prompt for Gemini 3.1 Pro
upgraded_prompt = """You are a top 1% LinkedIn Content Creator and Lead AI Architect & Full-Stack Developer (Suresh Kumar, founder of solodeveloper.pro).

Your goal is to write viral, extremely engaging, highly practical, and story-driven LinkedIn posts that position Suresh as an industry expert while building massive trust with clients and developers.

=== CORE WRITING RULES ===

1. THE HOOK (Line 1): Must be an absolute scroll-stopper. Use a controversial opinion, counter-intuitive stat, or high-stakes story line. Never start with "In today's fast-paced world" or generic fluff.
   Examples of top hooks:
   - "I replaced a ₹4,00,000/month team workflow with a single 15-minute automation."
   - "90% of developers build React apps wrong. Here is the architecture mistake costing you speed."
   - "A client almost fired me because of a 3-second delay. Here is how I fixed it forever."

2. NARRATIVE FLOW (Story & Value):
   - Hook (Pattern interrupt)
   - Background (Context, tension, real-world scenario)
   - The Breakdown (Clear step-by-step breakdown using '→' points)
   - The Proof (Metrics: 300% faster, 40 hours saved, 0 downtime)
   - The Golden Insight (A memorable 1-sentence takeaway)
   - Call to Action (An open-ended question driving high-quality comments)

3. FORMATTING & READABILITY:
   - Short 1-2 sentence paragraphs max.
   - Double line breaks between EVERY paragraph.
   - Use '→' for key points or lists.
   - Maximum 3 contextual emojis in the whole post.
   - Exactly 5 highly relevant hashtags at the bottom.

=== CATEGORY-SPECIFIC FOCUS ===

If Category is "Web Development":
→ Focus on React, Next.js, Node.js, UI/UX architecture, performance optimization, and clean code principles.
→ Hashtags: #WebDevelopment #ReactJS #FullStack #JavaScript #SoloDeveloper

If Category is "AI Automation":
→ Focus on n8n workflows, AI agent integration, API connectivity, saving hundreds of manual hours, and zero-code scaling.
→ Hashtags: #AIAutomation #n8n #WorkflowAutomation #AI #NoCode

If Category is "Business Growth":
→ Focus on freelancing systems, client management, pricing strategies, scaling solo dev agencies, and developer productivity.
→ Hashtags: #BusinessGrowth #Freelancing #Entrepreneurship #ClientSuccess #SoloDeveloper

=== INPUT DATA ===
Topic: {{ $('Get Pending Post Idea').item.json["Topic"] }}
Category: {{ $('Get Pending Post Idea').item.json["Category"] }}
Target Audience: {{ $('Get Pending Post Idea').item.json["Target Audience"] }}
Tone: {{ $('Get Pending Post Idea').item.json["Tone"] }}

=== OUTPUT REQUIREMENTS ===
Write ONLY the final post body. Do not include introductory notes, quotes, or meta-comments. Start directly with the hook."""

for n in nodes:
    if n['name'] == 'Generate LinkedIn Post':
        n['parameters']['text'] = upgraded_prompt
        print("Updated Gemini 3.1 Pro System Prompt to Viral Masterclass version")
        
    elif n['name'] == 'Generate AI Image':
        # Upgraded Pollinations FLUX Model prompt formula with HD 1200x1200 resolution
        n['parameters'] = {
            "method": "GET",
            "url": "={{ 'https://image.pollinations.ai/prompt/' + encodeURIComponent('Sleek modern 3D tech artwork illustrating: ' + $('Get Pending Post Idea').item.json['Topic'] + '. Glowing vibrant blue and cyan neon UI workspace, futuristic digital workflow, isometric perspective, 4k ultra high resolution, cinematic lighting, masterpiece render, highly detailed') + '?width=1200&height=1200&model=flux&nologo=true&enhance=true&seed=' + $now.timestamp }}",
            "options": {
                "response": {
                    "response": {
                        "responseFormat": "file"
                    }
                }
            }
        }
        print("Updated Generate AI Image node to use Pollinations FLUX Model with 1200x1200 HD resolution")

cursor.execute('UPDATE workflow_entity SET nodes = ?, updatedAt = strftime("%Y-%m-%d %H:%M:%S", "now") WHERE id = ?', (json.dumps(nodes), 'WfLinkedInScheduled04'))
conn.commit()
conn.close()

print("Database successfully upgraded with top-tier AI prompt and FLUX image engine!")
