import urllib.request
import os
import win32com.client
import sys

base_dir = r"c:\Users\Suresh\Documents\Antigravity\5. N8n"
icon_path = os.path.join(base_dir, "n8n-icon.ico")
bat_path = os.path.join(base_dir, "start-n8n.bat")

# 1. Download the n8n icon
print("Downloading n8n icon...")
icon_url = "https://raw.githubusercontent.com/n8n-io/n8n/master/packages/editor-ui/public/favicon.ico"
try:
    urllib.request.urlretrieve(icon_url, icon_path)
    print("Icon downloaded successfully.")
except Exception as e:
    print(f"Failed to download icon: {e}")
    sys.exit(1)

# 2. Update the .bat file to open the browser
print("Updating start-n8n.bat...")
bat_content = """@echo off
echo Starting n8n Workflow Automation...
cd /d "%~dp0"
start http://localhost:5678
node node_modules/n8n/bin/n8n start
pause
"""
with open(bat_path, "w") as f:
    f.write(bat_content)
print("Updated .bat file.")

# 3. Create the shortcut on the Desktop
print("Creating desktop shortcut...")
desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
shortcut_path = os.path.join(desktop, "n8n Server.lnk")

try:
    shell = win32com.client.Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(shortcut_path)
    shortcut.TargetPath = bat_path
    shortcut.WorkingDirectory = base_dir
    shortcut.IconLocation = icon_path
    shortcut.Description = "Start n8n Workflow Automation Server"
    shortcut.Save()
    print(f"Shortcut created at: {shortcut_path}")
    
    # Also remove the old shortcut if it exists
    old_shortcut = os.path.join(desktop, "start-n8n - Shortcut.lnk")
    if os.path.exists(old_shortcut):
        os.remove(old_shortcut)
        print("Removed old shortcut.")
        
except Exception as e:
    print(f"Failed to create shortcut: {e}")
