#!/bin/bash

# ServerPilot - Reset everything (nuclear option)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "FULL RESET - This will delete all data!"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then echo "Cancelled"; exit 1; fi

cd "$PROJECT_DIR"

echo "  Stopping containers..."
CMD="docker"
if command -v podman &>/dev/null; then CMD="podman"; fi
cd docker && $CMD compose down -v --remove-orphans && cd ..

echo "  Stopping Node.js..."
pkill -f "ts-node.*serverpilot" 2>/dev/null || true

echo "  Removing node_modules..."
rm -rf node_modules apps/*/node_modules packages/*/node_modules

echo "  Removing database..."
rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal

echo "  Removing build artifacts..."
rm -rf apps/*/.next apps/*/dist packages/*/dist

echo ""
echo "Reset complete. Run ./scripts/start.sh to start fresh"
