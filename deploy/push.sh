#!/usr/bin/env bash
# Copy the project to the VPS from your local machine (run locally).
#   bash deploy/push.sh
# Excludes local-only artifacts; the server keeps its own .env and prod.db.
set -euo pipefail

SERVER="${SERVER:-root@46.101.75.18}"
APP_DIR="${APP_DIR:-/opt/mathcards}"

ssh "$SERVER" "mkdir -p $APP_DIR"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude 'prisma/*.db' \
  --exclude 'prisma/*.db-journal' \
  --exclude .env \
  ./ "$SERVER:$APP_DIR/"

echo "Pushed to $SERVER:$APP_DIR"
echo "Next: ssh $SERVER 'sudo bash $APP_DIR/deploy/server-setup.sh'   # first time"
echo "      ssh $SERVER 'sudo bash $APP_DIR/deploy/update.sh'         # updates"
