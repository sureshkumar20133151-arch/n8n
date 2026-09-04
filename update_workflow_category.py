import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])

# Update the LLM Chain prompt and the Set node
for node in nodes:
    if node['name'] == 'Generate LinkedIn Post':
        node['parameters']['prompt'] = "={{ \"Write a LinkedIn post for the following:\\n\\nTopic: \" + $json.Topic + \"\\nCategory: \" + ($json.Category || 'General') + \"\\nTarget Audience: \" + ($json['Target Audience'] || 'Tech professionals and business owners') + \"\\nTone: \" + ($json.Tone || 'Professional but conversational') }}"
        node['parameters']['messages']['messageValues'][0]['message'] = """You are an expert LinkedIn ghostwriter for a solo developer from Madurai, India named Suresh who specializes in Custom Software, Web/Mobile Apps, AI Automation, SaaS, and API Development.

Your task is to write a viral LinkedIn post based on the Category given. Adjust your style per category:

📌 Web Development → Technical insights, code tips, real project examples
🤖 AI Automation → Mind-blowing use cases, ROI results, before/after comparisons  
📈 Business Growth → Business impact, revenue, client success stories, ROI numbers
📱 Mobile Apps → User experience, tech stack choices, launch stories
🔗 API Integration → Time saved, complexity reduced, integration wins
☁️ SaaS Development → Build in public, feature updates, growth metrics
🏆 Client Success Story → Specific results, numbers, transformation
🎯 Personal Branding → Behind the scenes, lessons learned, solo dev life

Universal Writing Rules:
✅ First line MUST be a scroll-stopping hook
✅ Short paragraphs (1-3 sentences max)
✅ Line breaks between every paragraph
✅ 2-4 emojis used naturally
✅ Direct, confident, value-first writing
✅ End with CTA or thought-provoking question
✅ 150-250 words total
✅ Write in first person as Suresh

❌ No "In today's fast-paced world..."
❌ No corporate jargon
❌ No clickbait
❌ No hashtags (added separately)

Output ONLY the post text."""

    if node['name'] == 'Prepare Final Post':
        # Update hashtags based on category
        node['parameters']['assignments']['assignments'][0]['value'] = "={{ ($json.text || $json.output || '').trim() + '\\n\\n' + ({'Web Development': '#WebDevelopment #FullStack #Programming #SoftwareDevelopment #JavaScript', 'AI Automation': '#AIAutomation #n8n #AI #Automation #NoCode #WorkflowAutomation', 'Business Growth': '#BusinessGrowth #Entrepreneurship #SaaS #Startup #Revenue', 'Mobile Apps': '#MobileApp #AppDevelopment #iOS #Android #ReactNative', 'API Integration': '#APIIntegration #SoftwareArchitecture #Backend #TechSolutions', 'SaaS Development': '#SaaS #ProductDevelopment #BuildInPublic #Startup', 'Client Success Story': '#ClientSuccess #CaseStudy #Results #SoftwareDevelopment', 'Personal Branding': '#SoloDeveloper #PersonalBranding #TechCareer #Developer'}[$('Get Pending Post Idea').item.json.Category] || '#SoftwareDevelopment #AI #Automation #Tech #Madurai #SoloDeveloper') }}"

    if node['name'] == 'Get Pending Post Idea':
        # Update to read Category column too
        node['parameters']['options']['returnFirstMatch'] = True

    if node['name'] == 'Mark as Posted':
        # Update matching to use Topic column
        node['parameters']['columns']['value']['Status'] = 'Posted'
        node['parameters']['columns']['value']['Posted Date'] = "={{ $now.format('dd-MM-yyyy') }}"
        node['parameters']['columns']['value']['Generated Post'] = "={{ $('Prepare Final Post').item.json.finalPost }}"

c.execute('UPDATE workflow_entity SET nodes=?, updatedAt=? WHERE id=?',
          (json.dumps(nodes), now, wf_id))
conn.commit()
conn.close()
print("Workflow updated with Category support!")
print("Now update your Google Sheet to add 'Category' column between Topic and Target Audience")
