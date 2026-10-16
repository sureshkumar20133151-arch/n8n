# 🤖 WhatsApp Gemini AI Assistant

An intelligent, multi-turn AI Assistant on WhatsApp powered by the official **Google Gemini API** (supporting `gemini-2.5-flash` and `gemini-1.5-flash`).

Supports **Text Chat**, **Image / Photo Analysis (Multimodal Vision)**, and **Per-Chat Context Memory**.

---

## 🚀 Quick Setup Guide

### Step 1: Get a Free Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.
3. Copy your key.

### Step 2: Configure your `.env` File
1. Open the `.env` file in this folder:
   ```env
   GEMINI_API_KEY=AIzaSy...YourKeyHere
   ```
2. (Optional) Customize other settings:
   - `GEMINI_MODEL`: `gemini-2.5-flash` (recommended for speed and intelligence)
   - `AUTO_REPLY_DM`: `true` (replies automatically to all 1-on-1 chats) or `false` (requires `!ai`)
   - `TRIGGER_PREFIX`: `!ai` (command prefix in groups or when auto-reply is off)
   - `SYSTEM_INSTRUCTION`: Change how the AI speaks and behaves.

### Step 3: Start the Assistant
Double-click `start-bot.bat` or run in terminal:
```cmd
npm start
```

### Step 4: Link WhatsApp
1. A QR code will display in your terminal window.
2. Open **WhatsApp** on your mobile phone:
   - **Android**: Tap the 3 dots menu `⋮` > **Linked devices** > **Link a device**.
   - **iPhone**: Go to **Settings** > **Linked Devices** > **Link a Device**.
3. Scan the terminal QR code.
4. You're connected! The bot stays logged in automatically (saved in `.wwebjs_auth/`).

---

## 💡 How to Use

| Action | How to do it |
| :--- | :--- |
| **Ask questions** | Send any text message in personal chat, or type `!ai <question>` |
| **Analyze Images** | Send a photo with a caption like *"What is this?"* or *"Summarize this document"* |
| **Group Chats** | Add your WhatsApp number to a group, then type `!ai <question>` |
| **Clear Memory** | Type `!reset` or `/reset` to start a fresh conversation context |
| **Help Guide** | Type `!help` |

---

## 🛠️ Project Structure

- `index.js` — Core WhatsApp client connection, QR generation, message router, and media handling.
- `geminiService.js` — Google Gemini API client with conversational memory and vision support.
- `.env` — API keys and configuration parameters.
- `start-bot.bat` — One-click Windows starter script.
