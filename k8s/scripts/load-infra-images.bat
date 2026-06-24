@echo off
setlocal

echo === Music App - Load Infrastructure Images into Minikube ===
echo.

minikube status --format="{{.Host}}" 2>nul | findstr /c:"Running" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Minikube is not running.
    exit /b 1
)

for %%i in (
    "postgres:16-alpine"
    "mongo:7"
    "neo4j:5-community"
    "elasticsearch:8.17.0"
    "redis:7-alpine"
    "minio/minio:latest"
    "rabbitmq:3.13-management-alpine"
    "prom/prometheus:v3.4.1"
    "grafana/grafana:11.6.0"
    "docker.elastic.co/logstash/logstash:8.17.0"
    "docker.elastic.co/kibana/kibana:8.17.0"
    "jaegertracing/all-in-one:latest"
    "busybox:latest"
    "curlimages/curl:latest"
    "minio/mc:latest"
) do (
    echo [..] Loading %%~i ...
    minikube image load %%~i
    if errorlevel 1 ( echo [!!] Failed: %%~i - skipping )
    echo [OK] %%~i
)

echo.
echo === Infrastructure images loaded ===
echo.
