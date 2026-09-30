# Care Finder - single-container demo

One container bundles the Vue frontend, the NestJS + Fastify API, and a
MariaDB database. Good for spinning up a working demo quickly on any machine
with Docker; **not** a production deployment (see "What this trades away"
below).

## Build

From the repo root (`D:\codes\care-finder`):

```bash
docker build -t care-finder-demo .
```

Optionally pass a Stripe test publishable key so the hospital subscription
checkout flow works in the demo (it's a no-op otherwise):

```bash
docker build --build-arg VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... -t care-finder-demo .
```

## Run

```bash
docker run -p 3001:3001 -v care-finder-data:/var/lib/mysql --name care-finder-demo care-finder-demo
```

Open **http://localhost:3001**. First boot takes a bit longer (MariaDB
initializes, migrations run, demo data seeds); watch the container logs for
`Starting Care Finder (API + web app) on :3001`.

The `-v care-finder-data:/var/lib/mysql` volume persists the database across
container restarts - `docker run` (same volume name) picks up where you left
off. Drop `-v ...` (or use a throwaway volume name) for a clean database every
time.

To pass a real Stripe *secret* key (server-side) or an SMTP server for actual
outbound email, add `-e STRIPE_SECRET_KEY=... -e MAIL_HOST=...` etc. — see
`backend/.env.example` for the full list; anything not overridden falls back
to the demo defaults baked into the Dockerfile (see below).

## Demo logins

Seeded automatically on first boot (`prisma/seed.ts`), password `password123`
for all:

| Role | Email |
|---|---|
| Patient | `patient@carefinder.test` |
| Hospital | `hospital@carefinder.test` |
| Doctor | `doctor@carefinder.test` |

The hospital account owns a seeded demo hospital ("Care Finder Demo
Hospital") with the doctor account attached to it, so appointments/ratings/
etc. have something to point at out of the box.

## Optional: real Cambodia hospital data

The seed above is minimal (one demo hospital). To additionally import real
hospitals/clinics in Cambodia from OpenStreetMap (`prisma/seed-cambodia-hospitals.ts`
— needs outbound internet access from the container, and can take a couple of
minutes):

```bash
docker run -p 3001:3001 -v care-finder-data:/var/lib/mysql \
  -e SEED_CAMBODIA_HOSPITALS=true \
  care-finder-demo
```

This only runs on first boot alongside the rest of the seed step (it's not
re-run on restarts). Each imported facility gets a placeholder owner account
(no usable login) — it's for browsing/searching demo data, not for logging in
as one of those hospitals.

## What this trades away (demo-only shortcuts)

- **MariaDB runs inside the app container**, started by `docker/entrypoint.sh`
  with no supervisor watching either process — if MariaDB crashes, the API
  keeps running but every DB call starts failing; there's no auto-restart.
  A real deployment should run the database as its own managed service.
- **Demo secrets are baked into the Dockerfile** (`JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, the `carefinder`/`carefinder` DB credentials) —
  fine for a local demo, not for anything internet-facing. Override them with
  `-e` at `docker run` time if that matters for your use case.
- **CSP is disabled** for the bundled frontend (see the `FRONTEND_DIST_PATH`
  branch in `backend/src/main.ts`) so Helmet's default policy doesn't fight
  the SPA it's now also serving.
- **Emails just log to stdout** by default (`MAIL_HOST` unset) instead of
  sending — set `MAIL_HOST`/`MAIL_PORT`/etc. via `-e` to actually send mail
  (password reset, appointment reminders) from the demo.
- **Single Node process, single MariaDB process, no horizontal scaling** —
  this image is deliberately not what `backend/`'s normal (non-bundled)
  deployment looks like; that one expects an external MySQL/MariaDB and the
  frontend served separately (see the root `CORS_ORIGIN`/`ROOT_DOMAIN`
  handling in `backend/src/common/utils/cors-origin.util.ts`), which is the
  shape a real deployment should take instead of this image.
