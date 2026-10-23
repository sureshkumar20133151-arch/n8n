import urllib.request
import json

api_url = "https://suresh-n8n-fhr6.onrender.com/api/v1/workflows"
api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOGYwY2JkZC00N2IwLTQxZWMtODdkNy1iZTkxYTE3NDU2MTQiLCJpc3MiOiJuOG4iLCJqdGkiOiI5ZTY5OTVhZS04NmEwLTRiZTAtODZkYi1mYzg2ZWIyYjUxZDAiLCJpYXQiOjE3OTIwMDA3NjcsImV4cCI6MTc5OTgxNjQwMCwiYXVkIjoicHVibGljLWFwaSJ9.8FxRZpHPXGYEfsGcyXJNrtfAEugQYCB0I9Dm3vZ6SWM"

headers = {
    "X-N8N-API-KEY": api_key,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

req = urllib.request.Request(api_url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("API Connection SUCCESS!")
        print(f"Existing workflows on cloud: {len(data.get('data', []))}")
except Exception as e:
    print(f"API Connection Error: {e}")
