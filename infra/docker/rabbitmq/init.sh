#!/bin/sh
# Create topic exchanges for all domain events.
# Runs once after RabbitMQ health check passes.

BASE="http://rabbitmq:15672/api/exchanges/music"
AUTH="music_admin:music_pass"
BODY='{"type":"topic","durable":true,"auto_delete":false,"internal":false,"arguments":{}}'

# Wait until the management HTTP API is reachable
until curl -sf -u "$AUTH" "http://rabbitmq:15672/api/overview" > /dev/null 2>&1; do
  echo "Waiting for RabbitMQ management API..."
  sleep 3
done

echo "RabbitMQ management API is ready. Creating exchanges..."

for exchange in events.upload events.catalog events.streaming events.user events.playlist; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$AUTH" \
    -X PUT "$BASE/$exchange" \
    -H "content-type: application/json" \
    -d "$BODY")

  if [ "$STATUS" = "201" ] || [ "$STATUS" = "204" ]; then
    echo "  ✓ Created exchange: $exchange"
  else
    echo "  ✗ Failed to create exchange: $exchange (HTTP $STATUS)"
    exit 1
  fi
done

echo "RabbitMQ initialization complete."
