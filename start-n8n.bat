@echo off
title n8n Workflow Automation Server
cd /d "C:\Users\Suresh\Documents\Antigravity\5. N8n"
echo ========================================================
echo   Starting n8n Workflow Automation Server...
echo ========================================================
echo.
echo Waiting for n8n server to launch on port 5678...
start "" /b powershell -NoProfile -Command "do { Start-Sleep -Seconds 2 } until (Test-NetConnection -ComputerName localhost -Port 5678 -WarningAction SilentlyContinue).TcpTestSucceeded; Start-Process 'http://localhost:5678'"
"C:\Program Files\nodejs\node.exe" node_modules\n8n\bin\n8n start
pause
