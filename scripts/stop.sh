#!/bin/bash
# ServerPilot - Stop all services
set +e

echo "Stopping ServerPilot..."

# 1. Stop Node.js processes
echo "  Stopping dev servers..."
kill -9 $(pgrep -f "server-hq|site-panel" 2>/dev/null) 2>/dev/null
kill -9 $(pgrep -f "next dev.*apps/admin|next dev.*apps/web" 2>/dev/null) 2>/dev/null
sleep 1
echo "  Dev servers stopped"

# 2. Stop containers by name
echo "  Stopping containers..."
CONTAINERS="serverpilot-postgres serverpilot-redis serverpilot-mailhog serverpilot-adminer serverpilot-nginx serverpilot-mariadb serverpilot-postfix serverpilot-dovecot serverpilot-snappymail serverpilot-powerdns"
for c in $CONTAINERS; do
  podman stop "$c" 2>/dev/null && echo "  Stopped $c" || true
done

# 3. Remove containers
echo "  Removing containers..."
for c in $CONTAINERS; do
  podman rm "$c" 2>/dev/null || true
done

echo ""
echo "  All services stopped"
