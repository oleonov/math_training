#!/usr/bin/env bash
# One-time server provisioning + first deploy. Run as root on the VPS, AFTER the
# code has been copied to /opt/mathcards (see deploy/push.sh).
#
#   sudo bash /opt/mathcards/deploy/server-setup.sh
#
# Idempotent: safe to re-run. For routine redeploys use deploy/update.sh instead.
set -euo pipefail

DOMAIN="${DOMAIN:-math.pandorika-it.com}"
EMAIL="${EMAIL:-pomni.o.nas@gmail.com}"   # used for Let's Encrypt registration
APP_DIR="${APP_DIR:-/opt/mathcards}"

echo "==> Node.js 20 (NodeSource) if needed"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> nginx + certbot"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> .env (generated once)"
if [ ! -f "$APP_DIR/.env" ]; then
  SECRET="$(openssl rand -hex 48)"
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=file:$APP_DIR/prisma/prod.db
SESSION_SECRET=$SECRET
NODE_ENV=production
PORT=3000
EOF
  echo "   wrote $APP_DIR/.env with a fresh SESSION_SECRET"
fi

echo "==> install deps + build (devDeps required for build/prisma)"
cd "$APP_DIR"
npm ci --include=dev
npx prisma generate
npx prisma db push
# Seed cards + default user only on the first run (idempotent upsert).
npx prisma db seed || true
npm run build

echo "==> systemd service"
cp "$APP_DIR/deploy/mathcards.service" /etc/systemd/system/mathcards.service
systemctl daemon-reload
systemctl enable mathcards
systemctl restart mathcards

echo "==> nginx site"
cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> firewall (rules are no-ops if ufw is inactive)"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true

echo "==> HTTPS via Let's Encrypt"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo ""
echo "Done. Open: https://$DOMAIN  (login: Amelia / 12345)"
echo "Logs: journalctl -u mathcards -f"
