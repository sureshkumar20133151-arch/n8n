import sqlite3, json, datetime

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

wf_id = 'WfLinkedInScheduled04'
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

c.execute('SELECT nodes, connections FROM workflow_entity WHERE id=?', (wf_id,))
row = c.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

# Extract LinkedIn Credential ID & Person ID
li_credentials = None
li_person = None
for node in nodes:
    if node['name'] == 'Post to LinkedIn':
        li_credentials = node.get('credentials')
        li_person = node['parameters'].get('person')
        break

# We need the person URN. The 'person' parameter is usually exactly the URN.
# If not, let's assume it is.

download_video = {
    "id": "Download_Video",
    "name": "Download Video",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [800, 500],
    "parameters": {
        "url": "={{ 'https://drive.google.com/uc?export=download&id=' + $('Get Pending Post Idea').item.json['Video Link'].match(/d\\/([a-zA-Z0-9_-]+)/)[1] }}",
        "options": {
            "response": {
                "response": {
                    "responseFormat": "file",
                    "outputPropertyName": "data"
                }
            },
            "redirect": {
                "redirect": {
                    "followRedirects": True
                }
            }
        }
    }
}

init_video = {
    "id": "Init_Video_Upload",
    "name": "Init Video Upload",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [1000, 500],
    "parameters": {
        "method": "POST",
        "url": "https://api.linkedin.com/rest/videos?action=initializeUpload",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "linkedInOAuth2Api",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "LinkedIn-Version", "value": "202401"},
                {"name": "X-RestLi-Protocol-Version", "value": "2.0.0"}
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"initializeUploadRequest\": {\n    \"owner\": \"" + li_person + "\",\n    \"fileSizeBytes\": {{ $binary.data.fileSize }},\n    \"uploadCaptions\": false,\n    \"uploadThumbnail\": false\n  }\n}"
    },
    "credentials": li_credentials
}

upload_video = {
    "id": "Upload_Video",
    "name": "Upload Video",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [1200, 500],
    "parameters": {
        "method": "PUT",
        "url": "={{ $json.value.uploadInstructions[0].uploadUrl }}",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Content-Type", "value": "application/octet-stream"}
            ]
        },
        "sendBody": True,
        "specifyBody": "json", # Will be overridden by binary data
        "options": {
            "response": {
                "response": {
                    "fullResponse": True
                }
            }
        }
    }
}
# Manually add the binary property settings since specifyBody above is just a placeholder
upload_video["parameters"]["sendBody"] = True
upload_video["parameters"]["contentType"] = "raw"
upload_video["parameters"]["sendBinaryData"] = True
upload_video["parameters"]["binaryPropertyName"] = "data"


extract_etag = {
    "id": "Extract_ETag",
    "name": "Extract ETag",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1400, 500],
    "parameters": {
        "jsCode": "return {\n  json: {\n    eTag: $input.item.json.headers.etag\n  }\n};"
    }
}

finalize_upload = {
    "id": "Finalize_Video",
    "name": "Finalize Video Upload",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [1600, 500],
    "parameters": {
        "method": "POST",
        "url": "https://api.linkedin.com/rest/videos?action=finalizeUpload",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "linkedInOAuth2Api",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "LinkedIn-Version", "value": "202401"},
                {"name": "X-RestLi-Protocol-Version", "value": "2.0.0"}
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"finalizeUploadRequest\": {\n    \"video\": \"{{ $('Init Video Upload').item.json.value.video }}\",\n    \"uploadToken\": \"\",\n    \"uploadedPartIds\": [\n      \"{{ $json.eTag }}\"\n    ]\n  }\n}"
    },
    "credentials": li_credentials
}

wait_node = {
    "id": "Wait_Node",
    "name": "Wait for Processing",
    "type": "n8n-nodes-base.wait",
    "typeVersion": 1.1,
    "position": [1800, 500],
    "parameters": {
        "amount": 10,
        "unit": "seconds"
    }
}

post_video = {
    "id": "Post_Video",
    "name": "Post to LinkedIn (Video)",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [2000, 500],
    "parameters": {
        "method": "POST",
        "url": "https://api.linkedin.com/rest/posts",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "linkedInOAuth2Api",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "LinkedIn-Version", "value": "202401"},
                {"name": "X-RestLi-Protocol-Version", "value": "2.0.0"},
                {"name": "X-RestLi-Method", "value": "create"}
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"author\": \"" + li_person + "\",\n  \"commentary\": \"{{ $('Generate LinkedIn Post').item.json.text }}\",\n  \"visibility\": \"PUBLIC\",\n  \"distribution\": {\n    \"feedDistribution\": \"MAIN_FEED\",\n    \"targetEntities\": [],\n    \"thirdPartyDistributionChannels\": []\n  },\n  \"content\": {\n    \"media\": {\n      \"id\": \"{{ $('Init Video Upload').item.json.value.video }}\"\n    }\n  },\n  \"lifecycleState\": \"PUBLISHED\",\n  \"isReshareDisabledByAuthor\": false\n}"
    },
    "credentials": li_credentials
}

nodes.extend([download_video, init_video, upload_video, extract_etag, finalize_upload, wait_node, post_video])

# Add routing from Switch Content Type (output 3 and 4 -> Video branches)
if 'Check Content Type' in connections:
    connections['Check Content Type']['main'][3] = [{"node": "Download Video", "type": "main", "index": 0}]
    connections['Check Content Type']['main'][4] = [{"node": "Download Video", "type": "main", "index": 0}]

# Chain video nodes
connections['Download Video'] = {"main": [[{"node": "Init Video Upload", "type": "main", "index": 0}]]}
connections['Init Video Upload'] = {"main": [[{"node": "Upload Video", "type": "main", "index": 0}]]}
connections['Upload Video'] = {"main": [[{"node": "Extract ETag", "type": "main", "index": 0}]]}
connections['Extract ETag'] = {"main": [[{"node": "Finalize Video Upload", "type": "main", "index": 0}]]}
connections['Finalize Video Upload'] = {"main": [[{"node": "Wait for Processing", "type": "main", "index": 0}]]}
connections['Wait for Processing'] = {"main": [[{"node": "Post to LinkedIn (Video)", "type": "main", "index": 0}]]}
connections['Post to LinkedIn (Video)'] = {"main": [[{"node": "Restore Topic", "type": "main", "index": 0}]]}

c.execute('UPDATE workflow_entity SET nodes=?, connections=?, updatedAt=? WHERE id=?', (json.dumps(nodes), json.dumps(connections), now, wf_id))
conn.commit()
conn.close()
print('Video upload logic injected successfully!')
