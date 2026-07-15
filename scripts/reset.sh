#!/bin/bash

# ServerPilot - Reset everything (nuclear option)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "💣 ServerPilot - FULL RESET"
echo "⚠️  This will delete all data!"
echo ""

read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled"
    exit 1
fi

# Navigate to project root
cd "$PROJECT_DIR"

# 1. Stop containers with volumes
echo ""
echo "📦 Stopping and removing containers with volumes..."
if command -v podman &> /dev/null; then
    cd docker
    podman compose down -v --remove-orphans
    cd ..
    echo "✅ Containers and volumes removed with Podman"
elif command -v docker &> /dev/null; then
    cd docker
    docker compose down -v --remove-orphans
    cd ..
    echo "✅ Containers and volumes removed with Docker"
else
    echo "❌ Neither Docker nor Podman found!"
    exit 1
fi

# 2. Stop any running Node processes
echo ""
echo "🔌 Stopping Node.js processes..."
pkill -f "ts-node.*serverpilot" 2>/dev/null || true
pkill -f "node.*serverpilot" 2>/dev/null || true
echo "✅ Node processes stopped"

# 3. Remove node_modules
echo ""
echo "🗑️  Removing node_modules..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
echo "✅ node_modules removed"

# 4. Remove database files
echo ""
echo "🗄️  Removing database files..."
rm -f prisma/dev.db
rm -f prisma/dev.db-journal
rm -f prisma/dev.db-wal
echo "✅ Database files removed"

# 5. Clean build artifacts
echo ""
echo "🧹 Cleaning build artifacts..."
rm -rf dist
rm -rf apps/*/dist
rm -rf packages/*/dist
echo "✅ Build artifacts removed"

# 6. Remove seed marker
rm -f ".seeded"

echo ""
echo "=========================================="
echo "  Full reset complete!"
echo ""
echo "  Run ./scripts/start.sh to start fresh"
echo "=========================================="
