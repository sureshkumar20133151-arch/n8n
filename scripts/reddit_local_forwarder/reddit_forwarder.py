#!/usr/bin/env python3
"""
Reddit Local Forwarder for SoloDeveloper Lead Engine
Fetches live freelance client posts from Reddit (using residential unblocked IP)
and forwards them to your Render cloud n8n automation webhook.
"""

import urllib.request
import urllib.error
import json
import re
import time
import sys
from datetime import datetime

# Configure Windows terminal encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Cloud n8n Webhook Endpoint
WEBHOOK_URL = "https://suresh-n8n-fhr6.onrender.com/webhook/reddit-lead-ingest"

# Target Freelance Subreddits
SUBREDDIT_FEED = "https://www.reddit.com/r/forhire+hiring+jobbit+hireaprogrammer+freelance_forhire/new.rss"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/atom+xml,application/xml,text/xml"
}

def fetch_and_forward():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now_str}] 🔍 Scanning Reddit for live freelance developer leads...")

    try:
        req = urllib.request.Request(SUBREDDIT_FEED, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read().decode("utf-8")
    except Exception as e:
        print(f"[{now_str}] ❌ Error fetching Reddit feed: {e}")
        return 0

    entry_regex = re.compile(r"<entry>([\s\S]*?)</entry>", re.IGNORECASE)
    entries = entry_regex.findall(xml_data)

    leads = []
    for block in entries:
        title_m = re.search(r"<title>([^<]+)</title>", block, re.IGNORECASE)
        raw_title = title_m.group(1) if title_m else ""
        title = raw_title.replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'").strip()

        # Reject [FOR HIRE]
        if re.search(r"\[for\s*hire\]|^for\s*hire", title, re.IGNORECASE):
            continue

        # Must be hiring
        if not re.search(r"\[hiring\]|^hiring", title, re.IGNORECASE):
            continue

        id_m = re.search(r"<id>([^<]+)</id>", block, re.IGNORECASE)
        link_m = re.search(r'<link[^>]+href=["\']([^"\']+)["\']', block, re.IGNORECASE)
        author_m = re.search(r"<author>[\s\S]*?<name>([^<]+)</name>", block, re.IGNORECASE)
        pub_m = re.search(r"<published>([^<]+)</published>", block, re.IGNORECASE)
        cat_m = re.search(r'<category[^>]+term="([^"]+)"', block, re.IGNORECASE)
        content_m = re.search(r"<content[^>]*>([\s\S]*?)</content>", block, re.IGNORECASE)

        raw_content = content_m.group(1) if content_m else ""
        clean_content = re.sub(r"<[^>]+>", " ", raw_content)
        clean_content = clean_content.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'")
        clean_content = re.sub(r"\s+", " ", clean_content).strip()

        leads.append({
            "id": id_m.group(1) if id_m else ("reddit_" + str(time.time())),
            "title": title,
            "link": link_m.group(1) if link_m else "https://reddit.com",
            "author": author_m.group(1) if author_m else "/u/client",
            "subreddit": "r/" + (cat_m.group(1) if cat_m else "forhire"),
            "published": pub_m.group(1) if pub_m else datetime.utcnow().isoformat(),
            "content": clean_content
        })

    if not leads:
        print(f"[{now_str}] ℹ️ No new [HIRING] posts found in this check.")
        return 0

    print(f"[{now_str}] 🎯 Found {len(leads)} active [HIRING] post(s) on Reddit!")
    for idx, l in enumerate(leads[:3], 1):
        print(f"   {idx}. {l['subreddit']}: {l['title'][:70]}...")

    # Forward to cloud n8n
    payload = json.dumps({"source": "Local Reddit Forwarder", "posts": leads}).encode("utf-8")
    post_req = urllib.request.Request(WEBHOOK_URL, data=payload, headers={"Content-Type": "application/json", "User-Agent": "RedditForwarder/1.0"}, method="POST")

    try:
        with urllib.request.urlopen(post_req, timeout=30) as p_resp:
            print(f"[{now_str}] 🚀 Successfully forwarded {len(leads)} post(s) to cloud n8n!")
            print(f"   Response: {p_resp.read().decode('utf-8')}")
            print(f"   Gemini is analyzing requirements, generating pitches, and updating your Google Sheet!\n")
            return len(leads)
    except Exception as e:
        print(f"[{now_str}] ❌ Webhook error forwarding to cloud: {e}")
        return 0

def main():
    print("=" * 65)
    print("🚀 REDDIT FREELANCE LEAD FORWARDER (LOCAL HOME RUNNER)")
    print("Target: https://suresh-n8n-fhr6.onrender.com/webhook/reddit-lead-ingest")
    print("Google Sheet: solo dev lead gen -> 'Reddit' tab")
    print("=" * 65 + "\n")

    # Run once immediately
    fetch_and_forward()

    # Check if user wants one-off or background loop
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        return

    print("🔄 Running continuously every 15 minutes. Press Ctrl+C to stop.\n")
    while True:
        try:
            time.sleep(15 * 60)
            fetch_and_forward()
        except KeyboardInterrupt:
            print("\n🛑 Lead forwarder stopped by user.")
            break

if __name__ == "__main__":
    main()
