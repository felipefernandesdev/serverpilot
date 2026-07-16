#!/bin/bash

# ServerPilot - Stop all services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "Stopping ServerPilot..."

# 1. Stop Node.js processes
echo "  Stopping dev servers..."
pkill -f "ts-node.*server-hq" 2>/dev/null || true
pkill -f "ts-node.*site-panel" 2>/dev/null || true
pkill -f "next dev.*apps/admin" 2>/dev/null || true
pkill -f "next dev.*apps/web" 2>/dev/null || true
sleep 1

# 2. Stop containers
echo "  Stopping containers..."
CMD="docker"
if command -v podman &>/dev/null; then CMD="podman"; fi
cd docker && $CMD compose down && cd ..

echo ""
echo "  All services stopped"
