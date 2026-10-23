$wshell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "n8n Server.lnk"

# Local paths
$baseDir = "C:\Users\Suresh\Documents\Antigravity\5. N8n"
$batPath = Join-Path $baseDir "start-n8n.bat"
$iconPath = Join-Path $baseDir "node_modules\n8n-editor-ui\dist\favicon.ico"

# 1. Update the .bat file to open the browser
$batContent = @"
@echo off
echo Starting n8n Workflow Automation...
cd /d "%~dp0"
start "" "http://localhost:5678"
node node_modules/n8n/bin/n8n start
pause
"@

Set-Content -Path $batPath -Value $batContent
Write-Host "Updated .bat file."

# 2. Create the shortcut
$shortcut = $wshell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $baseDir
$shortcut.IconLocation = $iconPath
$shortcut.Description = "Start n8n Workflow Automation Server"
$shortcut.Save()
Write-Host "Shortcut created at: $shortcutPath"

# 3. Remove old shortcut if it exists
$oldShortcut = Join-Path $desktop "start-n8n - Shortcut.lnk"
if (Test-Path $oldShortcut) {
    Remove-Item $oldShortcut -Force
    Write-Host "Removed old shortcut."
}
