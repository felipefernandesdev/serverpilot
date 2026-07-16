#!/bin/bash
# ServerPilot - Start all services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Detect container runtime
CMD="docker"
if command -v podman &>/dev/null; then
  CMD="podman"
fi

echo "Starting ServerPilot with $CMD..."
echo ""

# 1. Start infrastructure containers
echo "[1/7] Starting Docker containers..."
cd docker
$CMD compose up -d
cd ..
echo "  OK"

# 2. Wait for PostgreSQL
echo "[2/7] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if $CMD exec serverpilot-postgres pg_isready -U postgres &>/dev/null; then
    echo "  PostgreSQL ready"
    break
  fi
  sleep 1
done

# 3. Initialize PowerDNS schema (idempotent)
echo "[3/7] Initializing PowerDNS schema..."
$CMD exec -i serverpilot-postgres psql -U postgres -d serverpilot < docker/powerdns/schema.pgsql.sql 2>/dev/null && echo "  Schema OK" || echo "  Schema already exists (expected)"

# 4. Install deps + DB
echo "[4/7] Installing dependencies..."
npm install --silent 2>/dev/null

echo "[5/7] Setting up database..."
npm run db:seed 2>/dev/null
echo "  DB seeded"

# 5. Start dev servers in background
echo "[6/7] Starting dev servers..."
npx ts-node -r tsconfig-paths/register apps/server-hq/src/main.ts > /tmp/server-hq.log 2>&1 &
npx ts-node -r tsconfig-paths/register apps/site-panel/src/main.ts > /tmp/site-panel.log 2>&1 &
(cd apps/admin && npx next dev -p 3000 > /tmp/admin.log 2>&1) &
(cd apps/web && npx next dev -p 3003 > /tmp/web.log 2>&1) &

# Wait for APIs
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://127.0.0.1:3001/api/auth/login 2>/dev/null; then break; fi
  sleep 1
done
echo "  APIs ready"

# 6. Create DNS zones and nginx vhosts for seeded accounts
echo "[7/7] Provisioning seeded accounts..."
node -e "
const { DnsService, NginxService, DockerExecService } = require('@serverpilot/infra');
const dns = new DnsService();
const nginx = new NginxService(new DockerExecService());

async function main() {
  // client01.com
  const z1 = await dns.createZone('client01.com').catch(() => {});
  if (z1 !== false) {
    await dns.addRecord('client01.com', 'blog', 'A', '127.0.0.1');
    await dns.addRecord('client01.com', 'api', 'A', '127.0.0.1');
  }
  try { nginx.createVhost('client01', 'client01.com'); } catch {}

  // client02.com
  const z2 = await dns.createZone('client02.com').catch(() => {});
  if (z2 !== false) {
    await dns.addRecord('client02.com', 'www', 'A', '127.0.0.1');
    await dns.addRecord('client02.com', 'mail', 'A', '127.0.0.1');
  }
  try { nginx.createVhost('client02', 'client02.com'); } catch {}

  console.log('  Provisioning complete');
}
main();
" 2>/dev/null

echo ""
echo "=========================================="
echo "  ServerPilot is ready!"
echo ""
echo "  ┌──────────────────────────────────────┐"
echo "  │  Frontend URLs:                       │"
echo "  │  Admin (ServerHQ): localhost:3000     │"
echo "  │  Client (SitePanel): localhost:3003   │"
echo "  ├──────────────────────────────────────┤"
echo "  │  Backend APIs:                        │"
echo "  │  ServerHQ API: localhost:3001         │"
echo "  │  SitePanel API: localhost:3002        │"
echo "  ├──────────────────────────────────────┤"
echo "  │  Services:                            │"
echo "  │  Adminer (DB): localhost:8080         │"
echo "  │  Mailhog: localhost:8025              │"
echo "  │  SnappyMail: localhost:9001           │"
echo "  │  Nginx (sites): localhost:8082        │"
echo "  └──────────────────────────────────────┘"
echo ""
echo "  Admin:  admin@serverpilot.local / admin123"
echo "  Client: client01 / client123"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop"

wait
