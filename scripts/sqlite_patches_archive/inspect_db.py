import sqlite3

conn = sqlite3.connect(r'C:\Users\Suresh\.n8n\database.sqlite')
c = conn.cursor()

# Check all tables
print("=== ALL TABLES ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
for t in tables:
    print(t[0])

# Check project tables
print("\n=== PROJECT RELATED TABLES ===")
for t in tables:
    name = t[0]
    if 'project' in name.lower() or 'folder' in name.lower() or 'owner' in name.lower() or 'shared' in name.lower():
        print(name)
        c.execute(f'SELECT * FROM "{name}" LIMIT 5')
        rows = c.fetchall()
        for r in rows:
            print("  ", r)

conn.close()
