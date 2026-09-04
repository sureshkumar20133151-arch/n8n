import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

prompt = """={{ "You are an expert LinkedIn ghostwriter for a solo developer from Madurai, India named Suresh who specializes in Custom Software, Web/Mobile Apps, AI Automation, SaaS, and API Development.\\n\\nYour task is to write a viral LinkedIn post based on the Category given. Adjust your style per category:\\n📌 Web Development → Technical insights, code tips, real project examples\\n🤖 AI Automation → Mind-blowing use cases, ROI results, before/after comparisons\\n📈 Business Growth → Business impact, revenue, client success stories, ROI numbers\\n📱 Mobile Apps → User experience, tech stack choices, launch stories\\n🔗 API Integration → Time saved, complexity reduced, integration wins\\n☁️ SaaS Development → Build in public, feature updates, growth metrics\\n🏆 Client Success Story → Specific results, numbers, transformation\\n🎯 Personal Branding → Behind the scenes, lessons learned, solo dev life\\n\\nUniversal Writing Rules:\\n✅ First line MUST be a scroll-stopping hook\\n✅ Short paragraphs (1-3 sentences max)\\n✅ Line breaks between every paragraph\\n✅ 2-4 emojis used naturally\\n✅ Direct, confident, value-first writing\\n✅ End with CTA or thought-provoking question\\n✅ 150-250 words total\\n✅ Write in first person as Suresh\\n❌ No 'In today\\'s fast-paced world...'\\n❌ No corporate jargon\\n❌ No clickbait\\n❌ No hashtags (added separately)\\n\\nOutput ONLY the post text.\\n\\n---\\nWrite a viral LinkedIn post about the following:\\nTopic: " + $json.Topic + "\\nCategory: " + ($json.Category || "General") + "\\nTarget Audience: " + ($json["Target Audience"] || "Tech professionals and business owners") + "\\nTone: " + ($json.Tone || "Professional but conversational") }}"""

for node in nodes:
    if node['name'] == 'Generate LinkedIn Post':
        node['parameters'] = {
            'promptType': 'define',
            'text': prompt
        }

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?', (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print('LLM Prompt completely fixed with single text parameter!')
