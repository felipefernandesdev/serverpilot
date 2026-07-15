#!/bin/bash

# ServerPilot - Start all services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 ServerPilot - Starting all services..."
echo ""

# Navigate to project root
cd "$PROJECT_DIR"

# 1. Start infrastructure containers (PostgreSQL, Redis, Mailhog, Adminer)
echo "📦 Starting infrastructure containers..."
if command -v podman &> /dev/null; then
    cd docker
    podman compose up -d
    cd ..
    echo "✅ Containers started with Podman"
elif command -v docker &> /dev/null; then
    cd docker
    docker compose up -d
    cd ..
    echo "✅ Containers started with Docker"
else
    echo "❌ Neither Docker nor Podman found!"
    exit 1
fi

# 2. Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# 3. Install dependencies
echo ""
echo "📥 Installing npm dependencies..."
npm install

# 4. Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npm run db:generate

# 5. Push schema to database
echo ""
echo "🗄️  Pushing schema to database..."
npm run db:push

# 6. Seed database (optional, first time only)
if [ ! -f ".seeded" ]; then
    echo ""
    echo "🌱 Seeding database with initial data..."
    npm run db:seed
    touch ".seeded"
    echo "✅ Database seeded"
fi

# 7. Start ServerHQ API in background
echo ""
echo "🚀 Starting ServerHQ API on http://localhost:3001..."
npm run dev --workspace=apps/server-hq &
SERVER_HQ_PID=$!

# 8. Start SitePanel API in background
echo "🚀 Starting SitePanel API on http://localhost:3002..."
PORT=3002 npm run dev --workspace=apps/site-panel &
SITE_PANEL_PID=$!

# 9. Start Admin Frontend in background
echo "🚀 Starting Admin Frontend on http://localhost:3000..."
npm run dev --workspace=apps/admin &
ADMIN_PID=$!

# 10. Start Web Frontend in background
echo "🚀 Starting Web Frontend on http://localhost:3003..."
npm run dev --workspace=apps/web &
WEB_PID=$!

echo ""
echo "=========================================="
echo "  ServerPilot is ready!"
echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │  Frontend URLs:                      │"
echo "  │  Admin (ServerHQ): localhost:3000    │"
echo "  │  Client (SitePanel): localhost:3003  │"
echo "  ├─────────────────────────────────────┤"
echo "  │  Backend APIs:                       │"
echo "  │  ServerHQ API: localhost:3001        │"
echo "  │  SitePanel API: localhost:3002       │"
echo "  ├─────────────────────────────────────┤"
echo "  │  Services:                           │"
echo "  │  Adminer (DB): localhost:8080        │"
echo "  │  Mailhog: localhost:8025             │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "  Admin Login:"
echo "    Email:    admin@serverpilot.local"
echo "    Password: admin123"
echo ""
echo "  Client Login:"
echo "    Username: client01"
echo "    Password: client123"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all processes
wait $SERVER_HQ_PID $SITE_PANEL_PID $ADMIN_PID $WEB_PID
