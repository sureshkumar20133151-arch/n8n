# 🛰️ Reddit Freelance Web Development Lead Monitor & Auto-Pitcher

A dedicated autonomous **n8n workflow** that monitors top Reddit freelance communities in real-time for clients looking to hire website developers, enforces strict **Budget Mentioned** and **Today Only** filters, analyzes project requirements with AI, logs leads to **Google Sheets**, and delivers high-converting outreach pitches straight to your phone via **Gmail**, **Telegram**, and **Discord**.

---

## 🌟 What's New & Included

1. **1-Click Automatic Google Sheet Creator & Initializer**:
   - Built directly into the workflow: click **`1-Click: Create New Google Sheet`**!
   - Calls the Google Sheets REST API using your existing `googleSheetsOAuth2Api` credentials.
   - Automatically:
     1. Creates a new Google Spreadsheet named **`Reddit Freelance Leads - Web Development`**.
     2. Sets the active tab name to **`Reddit Leads`**.
     3. Pre-populates Row 1 with all **12 column headers**.
     4. Freezes Row 1 for clear scrolling.
     5. Outputs the direct URL to open your new sheet immediately!

2. **Google Sheet Columns & Schema**:
   | Column Header | Description | Example Data |
   | :--- | :--- | :--- |
   | **Date** | Timestamp lead was published | `2026-10-25 10:30` |
   | **Subreddit** | Target community | `r/forhire` |
   | **Post Title** | Full original Reddit title | `[HIRING] Fullstack Next.js Developer ($1500)` |
   | **Client** | Reddit Username | `/u/tech_founder_99` |
   | **Budget** | Detected Budget or Rate | `$1,500` or `$45/hr` |
   | **Project Type** | Classified by Gemini AI | `Next.js SaaS MVP` |
   | **Tech Stack** | Detected technologies | `React, Next.js, Tailwind, Supabase` |
   | **Urgency** | Project timeline | `Urgent (2 weeks)` |
   | **Client Problem** | 1-Sentence summary | `Needs SaaS dashboard and responsive landing page` |
   | **Custom Pitch** | 3-sentence DM proposal | Tailored proposal ready to paste into Reddit DM |
   | **Reddit URL** | Direct link to Reddit post | `https://reddit.com/r/forhire/comments/...` |
   | **Status** | Tracking status | `New Lead` |

3. **Direct Gmail Alert with Rich HTML Dossier**:
   - Sleek responsive email with budget badge, client info, proposal quote box, and 1-click apply button.
   - Pre-linked to your existing `gmailOAuth2` credential (`sureshkumar20133151@gmail.com`).

4. **Expanded to 8 Top Freelance Subreddits**:
   - `r/forhire`, `r/hiring`, `r/jobbit`, `r/hireaprogrammer`, `r/remotejobs`, `r/freelance_forhire`, `r/webdev`, `r/DesignJobs`.

5. **Strict "Budget Mention" Requirement**:
   - Requires explicit compensation: detects `$`, `€`, `£`, `USD`, `EUR`, `GBP`, `/hr`, `per hour`, `budget: ...`, `rate: ...`.
   - **Rejects unpaid, equity-only, or revenue-share postings**.

6. **"Today Only" Filter (Last 24 Hours)**:
   - Posts published earlier than 24 hours ago are filtered out.

7. **Cross-Run State Deduplication**:
   - Uses n8n's `$getWorkflowStaticData` to remember seen post IDs. You will **never receive duplicate notifications**.

---

## 📐 Workflow Architecture

```
[1-Click: Create New Google Sheet]
               │
[Create & Name Google Sheet (API)] ──► Automatically creates sheet with 12 headers & frozen row
               │
[Sheet Created Confirmation]


[Schedule Trigger (15 Mins)]
               │
[Expanded Subreddits List (8 Subreddits)]
               │
[Fetch Reddit RSS Feeds (HTTP Request)]
               │
[Parse Reddit XML Posts (Code)]
               │
[Filter: [HIRING] + WebDev + Budget + Today Only (Code)]
               │
[Deduplicate Across Scheduled Runs (Static Data)]
               │
[AI Lead Analyzer & Pitch Drafter (Gemini)]
               │
[Format Lead Alert Card (Code)]
               │
[Is Actionable Gig? (Filter)]
   ┌───────────┼─────────────┬─────────────────┐
   ▼           ▼             ▼                 ▼
[Gmail Alert] [Telegram]  [Discord]  [Save to Google Sheet]
```

---

## 🚀 How to Create Your Sheet & Run the Workflow

### Step 1: Create the New Google Sheet (1-Click in n8n)
1. Import [`REDDIT_FREELANCE_LEAD_MONITOR.json`](./REDDIT_FREELANCE_LEAD_MONITOR.json) into n8n.
2. Locate the node **`1-Click: Create New Google Sheet`** (at the top left).
3. Click **Test step** on that node.
4. It will immediately execute **`Create & Name Google Sheet (API)`** using your existing `googleSheetsOAuth2Api` credentials.
5. In the output, you will see your brand new `spreadsheetUrl` and `spreadsheetId`!

### Step 2: Set the Document in the Logger Node
1. Open node **`Save Lead to Google Sheet`**.
2. Select the newly created spreadsheet: **`Reddit Freelance Leads - Web Development`**.

### Step 3: Test & Activate
1. Click **Test workflow** (via `Manual Test Trigger`).
2. Verify that leads are extracted, logged into the Google Sheet, and the email arrives in Gmail.
3. Toggle the workflow **Active** to monitor Reddit autonomously every 15 minutes!
