@echo off
title Reddit Freelance Lead Forwarder (SoloDeveloper)
color 0A
cls
echo =================================================================
echo   REDDIT FREELANCE LEAD FORWARDER - SOLODEVELOPER ENGINE
echo =================================================================
echo.
echo Running local Reddit forwarder from your home IP...
echo Target: https://suresh-n8n-fhr6.onrender.com/webhook/reddit-lead-ingest
echo.
python scripts\reddit_local_forwarder\reddit_forwarder.py
pause
