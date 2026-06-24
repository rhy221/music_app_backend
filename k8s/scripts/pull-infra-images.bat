@echo off

echo === Music App - Pull Infrastructure Images into Minikube ===
echo.

minikube status --format="{{.Host}}" 2>nul | findstr /c:"Running" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Minikube is not running.
    exit /b 1
)

echo [..] Switching Docker CLI to minikube daemon...
@for /f "tokens=*" %%i in ('minikube docker-env --shell cmd') do @%%i
echo [OK] Docker CLI now targets minikube.
echo.

echo [1/13] postgres:16-alpine
docker pull postgres:16-alpine

echo [2/13] redis:7-alpine
docker pull redis:7-alpine

echo [3/13] rabbitmq:3.13-management-alpine
docker pull rabbitmq:3.13-management-alpine

echo [4/13] mongo:7
docker pull mongo:7

echo [5/13] neo4j:5-community
docker pull neo4j:5-community

echo [6/13] elasticsearch:8.17.0
docker pull elasticsearch:8.17.0

echo [7/13] minio/minio:latest
docker pull minio/minio:latest

echo [8/13] prom/prometheus:v3.4.1
docker pull prom/prometheus:v3.4.1

echo [9/13] grafana/grafana:11.6.0
docker pull grafana/grafana:11.6.0

echo [10/13] jaegertracing/all-in-one:latest
docker pull jaegertracing/all-in-one:latest

echo [11/13] busybox:latest
docker pull busybox:latest

echo [12/13] curlimages/curl:latest
docker pull curlimages/curl:latest

echo [13/13] minio/mc:latest
docker pull minio/mc:latest

echo.
echo === Done ===
echo.
