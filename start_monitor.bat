@echo off
title HP Smart Tank 589 Status Monitor
echo =========================================================
echo    HP Smart Tank 589 - Status Monitor and Dashboard
echo =========================================================
echo Starting local monitor server...
cd /d "%~dp0"

start "" http://localhost:8089
python server.py

pause
