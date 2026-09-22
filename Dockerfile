# Care Finder - single-container demo image.
#
# Bundles the built Vue frontend, the NestJS + Fastify API, and a MariaDB
# server into one container, for spinning up a fully working demo with a
# single `docker run` - no external database or separate frontend host
# needed. This trades production best practices (one process per container,
# managed/external database, etc.) for "one command, it just works" - see
# docker/README.md for what that means and how to run it.
#
# Build from the repo root:
#   docker build -t care-finder-demo .
# Run:
#   docker run -p 3001:3001 -v care-finder-data:/var/lib/mysql care-finder-demo

# ---------------------------------------------------------------------------
# Stage 1: build the frontend (Vue 3 + Vite)
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

# Force a real build talking to the bundled API, regardless of whatever
# VITE_APP_MODE the repo's own frontend/.env happens to have checked in
# (that file is for local frontend-only dev against mock data) - see
# frontend/.env.example for what these mean. .env.production.local has the
# highest precedence in Vite's env file loading, so it wins over both
# frontend/.env and any frontend/.env.production.
RUN printf 'VITE_APP_MODE=prod\nVITE_API_URL=/v1\n' > .env.production.local

ARG VITE_STRIPE_PUBLISHABLE_KEY=
RUN if [ -n "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then \
      printf 'VITE_STRIPE_PUBLISHABLE_KEY=%s\n' "$VITE_STRIPE_PUBLISHABLE_KEY" >> .env.production.local; \
    fi

# Skips vue-tsc type-checking (the repo's own `npm run build` gates on it) -
# a pre-existing type error elsewhere in an actively-changing UI shouldn't be
# able to block producing a demo image.
RUN npx vite build

# ---------------------------------------------------------------------------
# Stage 2: build the backend (NestJS + Prisma)
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-build
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

# patches/ must be present before `npm ci` - patch-package runs as a
# postinstall hook (see package.json).
COPY backend/package.json backend/package-lock.json ./
COPY backend/patches ./patches
RUN npm ci

COPY backend/ .
RUN npx prisma generate
RUN npx nest build

# ---------------------------------------------------------------------------
# Stage 3: runtime - Node (API + web app) and MariaDB in one container
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      mariadb-server openssl curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/mysql /var/run/mysqld

WORKDIR /app/backend

# Full node_modules (including dev deps like ts-node/prisma CLI) is copied
# on purpose: prisma/seed.ts runs via ts-node at container startup, and
# keeping this image simple mattered more than trimming its size for a demo
# bundle.
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/tsconfig.json ./tsconfig.json
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma

COPY --from=frontend-build /app/frontend/dist /app/frontend-dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production \
    PORT=3001 \
    FRONTEND_DIST_PATH=/app/frontend-dist \
    STORAGE_ROOT=/app/backend/storage/uploads \
    STORAGE_PUBLIC_URL=http://localhost:3001/uploads \
    DATABASE_URL="mysql://carefinder:carefinder@127.0.0.1:3306/care_finder" \
    MYSQL_DATABASE=care_finder \
    MYSQL_USER=carefinder \
    MYSQL_PASSWORD=carefinder \
    JWT_ACCESS_SECRET=demo-access-secret-change-me \
    JWT_ACCESS_TTL=15m \
    JWT_REFRESH_SECRET=demo-refresh-secret-change-me \
    JWT_REFRESH_TTL=30d \
    CORS_ORIGIN=http://localhost:3001 \
    APP_URL=http://localhost:3001 \
    MAIL_HOST= \
    DISABLE_REMINDERS=false

EXPOSE 3001
VOLUME ["/var/lib/mysql"]

ENTRYPOINT ["/entrypoint.sh"]
