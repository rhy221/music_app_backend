@echo off
setlocal enabledelayedexpansion

echo === Music App - Load Images into Minikube ===
echo.

minikube status --format="{{.Host}}" 2>nul | findstr /c:"Running" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Minikube is not running.
    echo Run k8s\scripts\setup-minikube.bat first.
    exit /b 1
)

:: Docker-compose builds images as "infra-*", k8s expects "music-app/*"
:: Tag them first, then load into minikube

for %%s in (gateway user-service catalog-service playlist-service streaming-service search-service upload-service notification-service library-service recommend-service) do (
    echo [..] Tagging infra-%%s -^> music-app/%%s:latest ...
    docker tag infra-%%s:latest music-app/%%s:latest
    if errorlevel 1 (
        echo FAILED: could not tag infra-%%s
        exit /b 1
    )
    echo [..] Loading music-app/%%s:latest into minikube ...
    minikube image load music-app/%%s:latest
    if errorlevel 1 (
        echo FAILED: could not load %%s
        exit /b 1
    )
    echo [OK] %%s
)

echo.
echo === All 10 images loaded into Minikube ===
echo.
