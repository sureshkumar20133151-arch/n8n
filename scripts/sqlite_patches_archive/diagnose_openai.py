import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

# 1. Check available node types in n8n
print("=== CHECKING AVAILABLE LANGCHAIN/OPENAI NODE TYPES ===")
import os
n8n_dir = r'c:\Users\Suresh\Documents\Antigravity\5. N8n\node_modules'

# Check @n8n/n8n-nodes-langchain package
langchain_path = os.path.join(n8n_dir, '@n8n', 'n8n-nodes-langchain')
if os.path.exists(langchain_path):
    pkg_path = os.path.join(langchain_path, 'package.json')
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r') as f:
            pkg = json.load(f)
            print(f"Langchain package version: {pkg.get('version')}")
            # Check what nodes are available
            nodes_config = pkg.get('n8n', {}).get('nodes', [])
            openai_nodes = [n for n in nodes_config if 'openai' in str(n).lower() or 'openAi' in str(n)]
            print(f"OpenAI-related nodes in package: {openai_nodes}")
else:
    print("@n8n/n8n-nodes-langchain NOT FOUND!")

# 2. Check if there's a standalone OpenAI node
openai_base = os.path.join(n8n_dir, 'n8n-nodes-base')
if os.path.exists(openai_base):
    # Search for OpenAI node definitions
    for root, dirs, files in os.walk(openai_base):
        for f in files:
            if 'openai' in f.lower() and f.endswith('.js'):
                print(f"Found: {os.path.join(root, f)}")

# 3. Check credential type schema for openAiApi
print("\n=== CHECKING OPENAI CREDENTIAL TYPE ===")
# Find credential type definition
for root, dirs, files in os.walk(os.path.join(n8n_dir, '@n8n', 'n8n-nodes-langchain')):
    for f in files:
        if 'openai' in f.lower() and 'credential' in f.lower():
            filepath = os.path.join(root, f)
            print(f"Credential file: {filepath}")
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read()
                if 'baseUrl' in content or 'url' in content:
                    # Find the baseUrl field
                    idx = content.find('baseUrl')
                    if idx == -1:
                        idx = content.find('url')
                    print(f"  Contains URL field at position {idx}")
                    print(f"  Snippet: ...{content[max(0,idx-50):idx+100]}...")

# 4. Test NVIDIA API connectivity
print("\n=== TESTING NVIDIA API CONNECTIVITY ===")
import urllib.request
import urllib.error

try:
    req = urllib.request.Request(
        'https://integrate.api.nvidia.com/v1/models',
        headers={'Authorization': 'Bearer test', 'Content-Type': 'application/json'}
    )
    response = urllib.request.urlopen(req, timeout=10)
    print(f"NVIDIA API reachable: Status {response.status}")
except urllib.error.HTTPError as e:
    print(f"NVIDIA API reachable but returned: {e.code} {e.reason}")
    print("(401 = reachable, just needs valid key)")
except Exception as e:
    print(f"NVIDIA API ERROR: {e}")

# 5. Test OpenAI API connectivity
try:
    req = urllib.request.Request(
        'https://api.openai.com/v1/models',
        headers={'Authorization': 'Bearer test', 'Content-Type': 'application/json'}
    )
    response = urllib.request.urlopen(req, timeout=10)
    print(f"OpenAI API reachable: Status {response.status}")
except urllib.error.HTTPError as e:
    print(f"OpenAI API reachable but returned: {e.code} {e.reason}")
except Exception as e:
    print(f"OpenAI API ERROR: {e}")

conn.close()
print("\n=== DONE ===")
