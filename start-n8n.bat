@echo off
title n8n Workflow Automation Server
cd /d "C:\Users\Suresh\Documents\Antigravity\5. N8n"
echo ========================================================
echo   Starting n8n Workflow Automation Server...
echo ========================================================
echo.
echo Launching browser in 5 seconds once n8n is ready...
start "" /b cmd /c "timeout /t 5 >nul && start http://localhost:5678"
"C:\Program Files\nodejs\node.exe" node_modules\n8n\bin\n8n start
pause
