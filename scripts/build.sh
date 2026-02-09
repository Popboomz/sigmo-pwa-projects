#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "=== Starting build process ==="

# Clean up any stale lock files that might cause build failures
echo "Cleaning up stale Next.js lock files..."
find .next -name "lock" -type f -delete 2>/dev/null || true
rm -rf .next/cache 2>/dev/null || true

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel=info --reporter=append-only

echo "Building the project..."
npx next build

echo "=== Build completed successfully! ==="
