import sqlite3, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
wf_id = 'WfLinkedInScheduled04'
project_id = 'd4J85zBuzoKE4C0h'

# Add to shared_workflow so n8n can see it
c.execute('SELECT workflowId FROM shared_workflow WHERE workflowId=?', (wf_id,))
exists = c.fetchone()

if not exists:
    c.execute('''INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?)''', (
        wf_id, project_id, 'workflow:owner', now, now
    ))
    print(f"Added workflow {wf_id} to project {project_id}")
else:
    print("Already in shared_workflow!")

conn.commit()
conn.close()
print("Done!")
