#!/bin/bash
# ServerPilot - Start all services
set +e

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

# 0. Kill any existing dev servers
pkill -f "ts-node.*server-hq" 2>/dev/null
pkill -f "ts-node.*site-panel" 2>/dev/null
pkill -f "next dev.*apps/admin" 2>/dev/null
pkill -f "next dev.*apps/web" 2>/dev/null

# 1. Pre-pull all images (avoids compose hanging on pulls)
echo "[1/8] Pre-pulling container images..."
IMAGES=(
  "docker.io/postgres:16-alpine"
  "docker.io/redis:7-alpine"
  "docker.io/mailhog/mailhog:latest"
  "docker.io/adminer:latest"
  "docker.io/nginx:alpine"
  "docker.io/mariadb:lts"
  "docker.io/catatnight/postfix:latest"
  "docker.io/eilandert/dovecot:latest"
  "docker.io/djmaze/snappymail:latest"
  "docker.io/powerdns/pdns-auth-49:latest"
)
for img in "${IMAGES[@]}"; do
  name=$(echo "$img" | sed 's|docker.io/||')
  echo "  Pulling $name..."
  $CMD pull "$img" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "    OK"
  else
    echo "    WARN: pull failed, compose will try again"
  fi
done

# 2. Start infrastructure containers
echo "[2/8] Starting Docker containers..."
cd docker
$CMD compose up -d 2>&1
if [ $? -ne 0 ]; then
  echo "  WARN: compose up had issues, checking containers..."
fi
cd ..
echo "  Containers starting..."

# 3. Wait for PostgreSQL
echo "[3/8] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if $CMD exec serverpilot-postgres pg_isready -U serverpilot &>/dev/null; then
    echo "  PostgreSQL ready"
    break
  fi
  if [ $i -eq 30 ]; then echo "  WARN: PostgreSQL not ready after 30s"; fi
  sleep 1
done

# 4. Initialize PowerDNS schema (idempotent)
echo "[4/8] Initializing PowerDNS schema..."
$CMD exec -i serverpilot-postgres psql -U serverpilot -d serverpilot < docker/powerdns/schema.pgsql.sql 2>/dev/null
if [ $? -eq 0 ]; then
  echo "  Schema created"
else
  echo "  Schema already exists (expected on restart)"
fi

# 5. Install deps if needed
echo "[5/8] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install 2>&1 | tail -3
  echo "  OK"
else
  echo "  node_modules exists, skipping install"
fi

# 6. Setup database seed
echo "[6/8] Setting up database..."
npx prisma generate 2>/dev/null
npm run db:seed 2>/dev/null
echo "  DB seeded"

# 7. Start dev servers in background
echo "[7/8] Starting dev servers..."
npx ts-node -r tsconfig-paths/register apps/server-hq/src/main.ts > /tmp/server-hq.log 2>&1 &
echo "  server-hq (API Admin) starting..."
npx ts-node -r tsconfig-paths/register apps/site-panel/src/main.ts > /tmp/site-panel.log 2>&1 &
echo "  site-panel (API Client) starting..."
(cd apps/admin && npx next dev -p 3000 > /tmp/admin.log 2>&1) &
echo "  admin (Next.js) starting..."
(cd apps/web && npx next dev -p 3003 > /tmp/web.log 2>&1) &
echo "  web (Next.js) starting..."

# Wait for APIs
echo "  Waiting for APIs..."
for i in $(seq 1 60); do
  if curl -s -o /dev/null http://127.0.0.1:3001/api/auth/login 2>/dev/null; then
    echo "  APIs ready"
    break
  fi
  if [ $i -eq 60 ]; then echo "  WARN: APIs not ready after 60s"; fi
  sleep 1
done

# 8. Create DNS zones and nginx vhosts for seeded accounts
echo "[8/8] Provisioning seeded accounts..."
npx ts-node -r tsconfig-paths/register -e "
const { DnsService, NginxService, DockerExecService } = require('@serverpilot/infra');
const dns = new DnsService();
const nginx = new NginxService(new DockerExecService());

async function main() {
  // client01.com
  const z1 = await dns.createZone('client01.com').catch(() => false);
  if (z1) {
    await dns.addRecord('client01.com', 'blog', 'A', '127.0.0.1').catch(() => {});
    await dns.addRecord('client01.com', 'api', 'A', '127.0.0.1').catch(() => {});
    console.log('  client01.com zone + records created');
  }
  try { await nginx.createVhost('client01', 'client01.com'); console.log('  client01.com nginx vhost created'); } catch {}

  // client02.com
  const z2 = await dns.createZone('client02.com').catch(() => false);
  if (z2) {
    await dns.addRecord('client02.com', 'www', 'A', '127.0.0.1').catch(() => {});
    await dns.addRecord('client02.com', 'mail', 'A', '127.0.0.1').catch(() => {});
    console.log('  client02.com zone + records created');
  }
  try { await nginx.createVhost('client02', 'client02.com'); console.log('  client02.com nginx vhost created'); } catch {}

  console.log('  Provisioning complete');
}
main().catch(console.error);
" 2>&1

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
