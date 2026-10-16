@echo off
title WhatsApp Gemini AI Assistant


echo =======================================================
echo          WhatsApp Gemini AI Assistant Starter
echo =======================================================
echo.

cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies...
    cmd /c npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Check .env
if not exist ".env" (
    echo [WARNING] .env file not found! Copying from .env.example...
    copy .env.example .env
    echo.
    echo Please open the .env file and paste your GEMINI_API_KEY!
    echo.
    notepad .env
)

echo [INFO] Launching WhatsApp Gemini Assistant...
echo [INFO] Opening clean QR Code in your browser for easy scanning...
echo.
cmd /c npm start

pause
