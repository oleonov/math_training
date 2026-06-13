#!/usr/bin/env bash
# Safe, additive deploy on the SHARED VPS (Ubuntu 16.04 + Docker + existing nginx
# sites). Run as root on the server, after the code is in /opt/mathcards:
#
#   ssh root@46.101.75.18 'bash /opt/mathcards/deploy/vps-deploy.sh'
#
# It never edits other vhosts; it only writes ONE new conf file and always runs
# `nginx -t` before reloading (aborting the reload if the test fails).
# Idempotent: safe to re-run for redeploys.
set -euo pipefail

DOMAIN="${DOMAIN:-math.pandorika-it.com}"
EMAIL="${EMAIL:-pomni.o.nas@gmail.com}"
APP_DIR="${APP_DIR:-/opt/mathcards}"
WEBROOT="/var/www/letsencrypt"
CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

cd "$APP_DIR/deploy"

echo "==> SESSION_SECRET (generated once into deploy/.env)"
if [ ! -f .env ] || ! grep -q '^SESSION_SECRET=' .env; then
  echo "SESSION_SECRET=$(openssl rand -hex 48)" > .env
  echo "   wrote deploy/.env"
fi

echo "==> build + start the container (Node 20), bound to 127.0.0.1:3000"
docker-compose up -d --build

echo "==> wait for the app to answer locally"
ok=""
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/login; then ok=1; echo "   app is up"; break; fi
  sleep 2
done
[ -n "$ok" ] || { echo "!! app did not come up; see: docker logs mathcards"; exit 1; }

mkdir -p "$WEBROOT"

if [ ! -f "$CERT" ]; then
  echo "==> install HTTP vhost (for ACME challenge), test, reload"
  cp "$APP_DIR/deploy/nginx-math-http.conf" "$CONF"
  nginx -t
  systemctl reload nginx
  echo "==> obtain Let's Encrypt cert (webroot, our domain only)"
  certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$EMAIL"
else
  echo "==> cert already present, skipping issuance"
fi

echo "==> install HTTPS vhost, test, reload"
cp "$APP_DIR/deploy/nginx-math-ssl.conf" "$CONF"
nginx -t
systemctl reload nginx

echo ""
echo "Done -> https://$DOMAIN  (login: Amelia / 12345)"
echo "Container logs: docker logs -f mathcards"
