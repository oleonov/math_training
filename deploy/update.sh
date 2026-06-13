#!/usr/bin/env bash
# Routine redeploy on the VPS (run as root, after pushing new code).
#   sudo bash /opt/mathcards/deploy/update.sh
# Does NOT re-seed — it never touches existing user data.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mathcards}"
cd "$APP_DIR"

npm ci --include=dev
npx prisma generate
npx prisma db push          # applies additive schema changes without data loss
npm run build
systemctl restart mathcards

echo "Redeployed. Logs: journalctl -u mathcards -f"
