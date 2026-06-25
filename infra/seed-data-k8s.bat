@echo off
chcp 65001 >nul
echo Seeding data into Kubernetes (minikube)...
powershell -ExecutionPolicy Bypass -File "%~dp0seed-data.ps1" -Mode k8s
pause
