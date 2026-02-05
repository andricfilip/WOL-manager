#!/bin/sh
set -e

# Determine backend address
# If running in Docker network (development), use backend service name
# If running on production server, use BACKEND_HOST environment variable
if [ -n "$BACKEND_HOST" ] && [ "$BACKEND_HOST" != "localhost" ]; then
    BACKEND_ADDR="${BACKEND_HOST}:5000"
    echo "🌐 Production mode: Backend at ${BACKEND_ADDR}"
else
    BACKEND_ADDR="backend:5000"
    echo "🔧 Development mode: Backend at ${BACKEND_ADDR}"
fi

# Replace backend address in nginx config
sed "s/backend:5000/${BACKEND_ADDR}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✓ Nginx configuration ready"
cat /etc/nginx/nginx.conf | grep -A2 "upstream backend"

# Start nginx
exec nginx -g 'daemon off;'
