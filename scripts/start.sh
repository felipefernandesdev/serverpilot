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

# 7. Start ServerHQ in background
echo ""
echo "🚀 Starting ServerHQ on http://localhost:3001..."
npm run dev --workspace=apps/server-hq &
SERVER_HQ_PID=$!

# 8. Start SitePanel in background
echo "🚀 Starting SitePanel on http://localhost:3002..."
PORT=3002 npm run dev --workspace=apps/site-panel &
SITE_PANEL_PID=$!

echo ""
echo "=========================================="
echo "  ServerPilot is ready!"
echo ""
echo "  ServerHQ API:  http://localhost:3001/api"
echo "  SitePanel API: http://localhost:3002/api"
echo "  Adminer (DB):  http://localhost:8080"
echo "  Mailhog:       http://localhost:8025"
echo ""
echo "  ServerHQ Login (Admin):"
echo "  Email:    admin@serverpilot.local"
echo "  Password: admin123"
echo ""
echo "  SitePanel Login (Account):"
echo "  Username: <account-username>"
echo "  Password: <account-password>"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait $SERVER_HQ_PID $SITE_PANEL_PID
