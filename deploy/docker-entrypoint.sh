#!/bin/sh
# Container entrypoint: sync the SQLite schema, ensure cards + default user exist
# (idempotent upserts), then start the server.
set -e

npx prisma db push --skip-generate
npx prisma db seed

exec npm run start
