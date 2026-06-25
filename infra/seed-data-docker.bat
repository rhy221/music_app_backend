@echo off
chcp 65001 >nul
echo Seeding data into Docker containers...
powershell -ExecutionPolicy Bypass -File "%~dp0seed-data.ps1" -Mode docker
pause
