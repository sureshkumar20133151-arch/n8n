import sqlite3, json

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

# Get the encryption key to understand credential format
import os

# Read the n8n config file
config_path = r'C:\Users\Suresh\.n8n\config'
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        print("Config content (first 100 chars):", f.read()[:100])

# Check what the credential data looks like (encrypted)
c.execute('SELECT id, name, type, data FROM credentials_entity WHERE type = ?', ('openAiApi',))
rows = c.fetchall()
for r in rows:
    print(f"\nCredential: {r[1]} (ID: {r[0]})")
    print(f"Type: {r[2]}")
    data = r[3]
    print(f"Data length: {len(data)} chars")
    print(f"Data starts with: {data[:80]}...")
    # Check if it looks like JSON or encrypted
    try:
        d = json.loads(data)
        print(f"Data is plain JSON with keys: {list(d.keys())}")
        # Check for base URL
        if 'url' in d:
            print(f"  Base URL: {d['url']}")
        if 'apiKey' in d:
            key = d['apiKey']
            print(f"  API Key prefix: {key[:15]}...")
    except:
        print("Data is encrypted (cannot read directly)")

conn.close()
