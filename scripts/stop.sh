#!/bin/bash

# ServerPilot - Stop all services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🛑 ServerPilot - Stopping all services..."
echo ""

# Navigate to project root
cd "$PROJECT_DIR"

# 1. Stop infrastructure containers
echo "📦 Stopping infrastructure containers..."
if command -v podman &> /dev/null; then
    cd docker
    podman compose down
    cd ..
    echo "✅ Containers stopped with Podman"
elif command -v docker &> /dev/null; then
    cd docker
    docker compose down
    cd ..
    echo "✅ Containers stopped with Docker"
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

# 3. Clean up
echo ""
echo "🧹 Cleaning up..."
rm -f ".seeded"

echo ""
echo "=========================================="
echo "  All services stopped!"
echo "=========================================="
