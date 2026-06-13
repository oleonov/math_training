# Node 20 container — runs the app regardless of the host OS (the VPS is an old
# Ubuntu 16.04 where modern Node can't be installed natively).
FROM node:20-bookworm-slim

WORKDIR /app

# OpenSSL is required by the Prisma query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

RUN chmod +x deploy/docker-entrypoint.sh
CMD ["./deploy/docker-entrypoint.sh"]
