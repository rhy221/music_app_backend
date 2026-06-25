@echo off
setlocal

set "REPO_ROOT=%~dp0..\.."
for %%i in ("%REPO_ROOT%") do set "REPO_ROOT=%%~fi"

echo === Music App - Build Docker Images ===
echo Repo root: %REPO_ROOT%
echo.

:: Build on host Docker (faster network), then use load-images.bat to copy to minikube
echo.

:: ------------------------------------------------------------------
:: 2. Build all service images
:: ------------------------------------------------------------------

:: Gateway (self-contained context)
echo [..] Building music-app/gateway:latest ...
docker build -t music-app/gateway:latest -f "%REPO_ROOT%\services\gateway\Dockerfile" "%REPO_ROOT%\services\gateway"
if errorlevel 1 ( echo FAILED: gateway & exit /b 1 )
echo [OK] gateway

:: Java services (need repo root for gradlew, libs/, services/)
for %%s in (user-service catalog-service playlist-service library-service) do (
    echo [..] Building music-app/%%s:latest ...
    docker build -t "music-app/%%s:latest" -f "%REPO_ROOT%\services\%%s\Dockerfile" "%REPO_ROOT%"
    if errorlevel 1 ( echo FAILED: %%s & exit /b 1 )
    echo [OK] %%s
)

:: Go services (need repo root for go.work, libs/, services/)
for %%s in (streaming-service upload-service) do (
    echo [..] Building music-app/%%s:latest ...
    docker build -t "music-app/%%s:latest" -f "%REPO_ROOT%\services\%%s\Dockerfile" "%REPO_ROOT%"
    if errorlevel 1 ( echo FAILED: %%s & exit /b 1 )
    echo [OK] %%s
)

:: Node services (need repo root for package.json, pnpm-lock.yaml, libs/, services/)
for %%s in (search-service notification-service) do (
    echo [..] Building music-app/%%s:latest ...
    docker build -t "music-app/%%s:latest" -f "%REPO_ROOT%\services\%%s\Dockerfile" "%REPO_ROOT%"
    if errorlevel 1 ( echo FAILED: %%s & exit /b 1 )
    echo [OK] %%s
)

:: Python service (needs repo root for libs/events/python/)
echo [..] Building music-app/recommend-service:latest ...
docker build -t music-app/recommend-service:latest -f "%REPO_ROOT%\services\recommend-service\Dockerfile" "%REPO_ROOT%"
if errorlevel 1 ( echo FAILED: recommend-service & exit /b 1 )
echo [OK] recommend-service

echo.
echo === All 10 images built successfully ===
docker images --filter "reference=music-app/*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo.
