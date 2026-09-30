#!/bin/sh
# Single-container demo entrypoint: brings up MariaDB, syncs the Prisma
# schema + seed data against it, then starts the Care Finder API (which also
# serves the built frontend - see FRONTEND_DIST_PATH in src/main.ts).
#
# This is a demo/all-in-one setup, not a production deployment: MariaDB and
# the app share one container and one process tree, with no supervisor
# restarting either half if it dies. Good enough for "spin it up and show
# someone", not for anything that needs to stay up unattended.
set -e

DB_NAME="${MYSQL_DATABASE:-care_finder}"
DB_USER="${MYSQL_USER:-carefinder}"
DB_PASS="${MYSQL_PASSWORD:-carefinder}"
DATA_DIR=/var/lib/mysql

if [ ! -d "$DATA_DIR/mysql" ]; then
  echo "[entrypoint] First run - initializing MariaDB data directory at $DATA_DIR..."
  mariadb-install-db --user=root --datadir="$DATA_DIR" --auth-root-authentication-method=socket >/dev/null
fi

echo "[entrypoint] Starting MariaDB..."
if command -v mysqld_safe >/dev/null 2>&1; then
  mysqld_safe --datadir="$DATA_DIR" --user=root &
else
  mariadbd --datadir="$DATA_DIR" --user=root &
fi

echo "[entrypoint] Waiting for MariaDB to accept connections..."
tries=0
until mysqladmin ping -uroot --silent >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 60 ]; then
    echo "[entrypoint] MariaDB did not come up within 60s - giving up. Check the log lines above for the actual startup error." >&2
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] Ensuring database and app user exist..."
mysql -uroot <<-SQL
  CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
  CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
  GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
  FLUSH PRIVILEGES;
SQL

cd /app/backend

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Seeding roles + demo accounts..."
npx prisma db seed

if [ "${SEED_CAMBODIA_HOSPITALS:-false}" = "true" ]; then
  echo "[entrypoint] SEED_CAMBODIA_HOSPITALS=true - importing hospitals from OpenStreetMap (needs internet, can take a while)..."
  npm run seed:cambodia-hospitals || echo "[entrypoint] Cambodia hospital import failed/skipped - continuing without it."
fi

echo "[entrypoint] Starting Care Finder (API + web app) on :${PORT:-3001}..."
exec node dist/main.js
