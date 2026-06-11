#!/bin/sh
set -e
SECRET="${JWT_SECRET_KEY:-change-me-in-production-min-32-chars}"
K=$(printf '%s' "$SECRET" | base64 | tr '+/' '-_' | tr -d '=\n')
JWKS="{\"keys\":[{\"kty\":\"oct\",\"alg\":\"HS256\",\"use\":\"sig\",\"k\":\"$K\"}]}"

printf '%s' "$JWKS" > /tmp/jwks.json

# Handler script: each connection gets its own process via nc -lk -e
cat > /tmp/serve_jwks.sh << 'EOF'
#!/bin/sh
# Drain the incoming HTTP request headers
while IFS= read -r line; do
  stripped=$(printf '%s' "$line" | tr -d '\r')
  [ -z "$stripped" ] && break
done
printf "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
cat /tmp/jwks.json
EOF
chmod +x /tmp/serve_jwks.sh

# -lk keeps nc in persistent listen mode, forking a new process per connection
nc -lk -p 8088 -e /tmp/serve_jwks.sh &

sleep 1
exec krakend "$@"
