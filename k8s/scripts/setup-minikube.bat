@echo off
setlocal enabledelayedexpansion

echo === Music App - Minikube Setup ===
echo.

:: ------------------------------------------------------------------
:: 1. Check prerequisites
:: ------------------------------------------------------------------
set "MISSING="
for %%c in (minikube kubectl helm docker) do (
    where %%c >nul 2>&1
    if errorlevel 1 set "MISSING=!MISSING! %%c"
)

if defined MISSING (
    echo ERROR: The following tools are not installed:%MISSING%
    echo.
    echo Install with winget:
    echo   winget install Kubernetes.minikube
    echo   winget install Kubernetes.kubectl
    echo   winget install Helm.Helm
    echo   winget install Docker.DockerDesktop
    exit /b 1
)

echo [OK] minikube, kubectl, helm, docker are installed.

:: ------------------------------------------------------------------
:: 2. Start minikube
:: ------------------------------------------------------------------
minikube status --format="{{.Host}}" 2>nul | findstr /c:"Running" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Minikube is already running.
) else (
    echo [..] Starting minikube (cpus=4, memory=7168, driver=docker^)...
    minikube start --cpus=4 --memory=7168 --driver=docker
    if errorlevel 1 (
        echo ERROR: Failed to start minikube
        exit /b 1
    )
    echo [OK] Minikube started.
)

:: ------------------------------------------------------------------
:: 3. Enable addons
:: ------------------------------------------------------------------
echo [..] Enabling minikube addons...
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard
echo [OK] Addons enabled: ingress, metrics-server, dashboard.

:: ------------------------------------------------------------------
:: 4. Configure Docker environment
:: ------------------------------------------------------------------
echo [..] Configuring Docker to use minikube's daemon...
@for /f "tokens=*" %%i in ('minikube docker-env --shell cmd') do @%%i
echo [OK] Docker environment configured.

:: ------------------------------------------------------------------
:: 5. Add music-app.local to hosts file
:: ------------------------------------------------------------------
for /f "tokens=*" %%i in ('minikube ip') do set "MINIKUBE_IP=%%i"

findstr /c:"music-app.local" C:\Windows\System32\drivers\etc\hosts >nul 2>&1
if %errorlevel%==0 (
    echo [OK] music-app.local already in hosts file.
) else (
    net session >nul 2>&1
    if %errorlevel%==0 (
        echo %MINIKUBE_IP% music-app.local>>C:\Windows\System32\drivers\etc\hosts
        echo [OK] Added '%MINIKUBE_IP% music-app.local' to hosts file.
    ) else (
        echo [!!] Need admin rights to update hosts file.
        echo      Run this script as Administrator, or manually add to hosts:
        echo      %MINIKUBE_IP% music-app.local
    )
)

:: ------------------------------------------------------------------
:: 6. Done
:: ------------------------------------------------------------------
echo.
echo === Minikube setup complete! ===
echo.
echo Minikube IP:  %MINIKUBE_IP%
echo Dashboard:    minikube dashboard
echo.
echo Next steps:
echo   1. Build images:  k8s\scripts\build-images.bat
echo   2. Deploy:        k8s\scripts\deploy.bat
echo.
