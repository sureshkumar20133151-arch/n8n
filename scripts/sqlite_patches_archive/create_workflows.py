import json
import sqlite3
import uuid
import datetime

now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
project_id = 'd4J85zBuzoKE4C0h'

# Workflow 1: Auto-Reply
wf1_id = 'WfWhatsAppReply01'
wf1_nodes = [
    {
        'id': 'node-webhook-inbound',
        'name': 'WhatsApp Inbound Webhook',
        'type': 'n8n-nodes-base.webhook',
        'typeVersion': 1,
        'position': [250, 300],
        'parameters': {
            'httpMethod': 'POST',
            'path': 'whatsapp-inbound',
            'responseMode': 'onReceived',
            'options': {}
        }
    },
    {
        'id': 'node-construct-reply',
        'name': 'Construct Auto Reply',
        'type': 'n8n-nodes-base.set',
        'typeVersion': 2,
        'position': [470, 300],
        'parameters': {
            'assignments': {
                'assignments': [
                    {'id': 'f1', 'name': 'phone', 'value': '={{ $json.body.from }}', 'type': 'string'},
                    {'id': 'f2', 'name': 'senderName', 'value': '={{ $json.body.senderName }}', 'type': 'string'},
                    {'id': 'f3', 'name': 'userMessage', 'value': '={{ $json.body.body }}', 'type': 'string'},
                    {'id': 'f4', 'name': 'replyMessage', 'value': '={{ "Hi " + ($json.body.senderName || "there") + "! Thank you for messaging us. We received your message: \\"" + ($json.body.body || "") + "\\". We will get back to you shortly!" }}', 'type': 'string'}
                ]
            },
            'options': {}
        }
    },
    {
        'id': 'node-send-reply',
        'name': 'Send WhatsApp Reply (Open-WA)',
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4.2,
        'position': [700, 300],
        'parameters': {
            'method': 'POST',
            'url': 'http://localhost:8080/api/send-message',
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': '{\n  "phone": "={{ $json.phone }}",\n  "message": "={{ $json.replyMessage }}"\n}',
            'options': {}
        }
    }
]

wf1_connections = {
    'WhatsApp Inbound Webhook': {
        'main': [[{'node': 'Construct Auto Reply', 'type': 'main', 'index': 0}]]
    },
    'Construct Auto Reply': {
        'main': [[{'node': 'Send WhatsApp Reply (Open-WA)', 'type': 'main', 'index': 0}]]
    }
}

# Workflow 2: Outbound Broadcast
wf2_id = 'WfWhatsAppOutbound02'
wf2_nodes = [
    {
        'id': 'node-webhook-outbound',
        'name': 'Send WhatsApp Campaign Webhook',
        'type': 'n8n-nodes-base.webhook',
        'typeVersion': 1,
        'position': [250, 300],
        'parameters': {
            'httpMethod': 'POST',
            'path': 'send-whatsapp-campaign',
            'responseMode': 'onReceived',
            'options': {}
        }
    },
    {
        'id': 'node-format-outbound',
        'name': 'Format Recipient & Message',
        'type': 'n8n-nodes-base.set',
        'typeVersion': 2,
        'position': [470, 300],
        'parameters': {
            'assignments': {
                'assignments': [
                    {'id': 'o1', 'name': 'phone', 'value': '={{ $json.body.phone }}', 'type': 'string'},
                    {'id': 'o2', 'name': 'message', 'value': '={{ $json.body.message }}', 'type': 'string'}
                ]
            },
            'options': {}
        }
    },
    {
        'id': 'node-send-outbound',
        'name': 'Send Outbound WhatsApp (Open-WA)',
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4.2,
        'position': [700, 300],
        'parameters': {
            'method': 'POST',
            'url': 'http://localhost:8080/api/send-message',
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': '{\n  "phone": "={{ $json.phone }}",\n  "message": "={{ $json.message }}"\n}',
            'options': {}
        }
    }
]

wf2_connections = {
    'Send WhatsApp Campaign Webhook': {
        'main': [[{'node': 'Format Recipient & Message', 'type': 'main', 'index': 0}]]
    },
    'Format Recipient & Message': {
        'main': [[{'node': 'Send Outbound WhatsApp (Open-WA)', 'type': 'main', 'index': 0}]]
    }
}

# Write JSON files to project folder
with open(r'c:\Users\Suresh\Documents\Antigravity\5. N8n\1_whatsapp_auto_reply_workflow.json', 'w') as f:
    json.dump({'name': 'WhatsApp Auto-Reply (Open-WA API)', 'nodes': wf1_nodes, 'connections': wf1_connections, 'active': True}, f, indent=2)

with open(r'c:\Users\Suresh\Documents\Antigravity\5. N8n\2_whatsapp_outbound_broadcast_workflow.json', 'w') as f:
    json.dump({'name': 'WhatsApp Outbound Broadcast (Open-WA API)', 'nodes': wf2_nodes, 'connections': wf2_connections, 'active': True}, f, indent=2)

# Insert into database
conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
cursor = conn.cursor()

# Remove existing if any
cursor.execute('DELETE FROM shared_workflow WHERE workflowId IN (?, ?)', (wf1_id, wf2_id))
cursor.execute('DELETE FROM workflow_entity WHERE id IN (?, ?)', (wf1_id, wf2_id))

# Insert WF 1
cursor.execute('''
INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, pinData, versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt, isArchived, versionCounter, description)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (wf1_id, '1. WhatsApp Auto-Reply (Open-WA API)', 1, json.dumps(wf1_nodes), json.dumps(wf1_connections), '{}', None, None, str(uuid.uuid4()), 1, '{}', None, now, now, 0, 1, 'Auto-reply to incoming WhatsApp messages using Open-WA API'))

cursor.execute('INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
               (wf1_id, project_id, 'workflow:owner', now, now))

# Insert WF 2
cursor.execute('''
INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, pinData, versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt, isArchived, versionCounter, description)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (wf2_id, '2. WhatsApp Outbound Broadcast (Open-WA API)', 1, json.dumps(wf2_nodes), json.dumps(wf2_connections), '{}', None, None, str(uuid.uuid4()), 1, '{}', None, now, now, 0, 1, 'Send outbound WhatsApp messages and campaigns via Open-WA API'))

cursor.execute('INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
               (wf2_id, project_id, 'workflow:owner', now, now))

conn.commit()
conn.close()
print('Workflows created and imported successfully!')
