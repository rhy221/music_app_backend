@echo off
echo === Music App - Port Forward All Services ===
echo.
echo Starting port-forwards (press Ctrl+C to stop all)...
echo.
echo   Gateway:        http://localhost:8080
echo   Notification:   http://localhost:8087  (Socket.IO)
echo   MinIO:          http://localhost:9000  (storage)
echo   Grafana:        http://localhost:3001
echo   Jaeger:         http://localhost:16686
echo   Prometheus:     http://localhost:9090
echo   RabbitMQ:       http://localhost:15672
echo   Neo4j:          http://localhost:7474
echo.

start /b kubectl port-forward -n music-app svc/gateway 8080:8080
start /b kubectl port-forward -n music-app svc/notification-service 8087:8087
start /b kubectl port-forward -n music-app svc/minio 9000:9000
start /b kubectl port-forward -n music-app svc/grafana 3001:3000
start /b kubectl port-forward -n music-app svc/jaeger 16686:16686
start /b kubectl port-forward -n music-app svc/prometheus 9090:9090
start /b kubectl port-forward -n music-app svc/rabbitmq 15672:15672
start /b kubectl port-forward -n music-app svc/neo4j 7474:7474

echo All port-forwards started. Press any key to stop all...
pause >nul
taskkill /f /im kubectl.exe >nul 2>&1
echo Stopped.
