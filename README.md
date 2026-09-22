# Care-Finder

Find hospitals in Cambodia, book appointments, and check in when you arrive. Hospitals manage their profile, departments, services, doctors, queue and public website from one dashboard.

| Part | Stack |
| ---- | ----- |
| `backend/` | NestJS 10 + Fastify, Prisma 5 / MySQL, JWT auth, socket.io, nodemailer |
| `frontend/` | Vue 3 + TypeScript + Vite, Pinia, Tailwind + shadcn-vue, vue-i18n (English / Khmer) |

## Features

- **Discovery and booking** – search hospitals by province, see doctors, services and ratings, book and manage appointments.
- **Hospital dashboard** – profile (cover photo, hours, address, completeness checklist), departments, services, doctors with weekly schedules, rooms, promotions.
- **Appointment flow** – Pending → Confirmed → Arrived → Completed (plus Missing, Canceled, Rejected). Confirmation and reminder emails, calendar (.ics) download, no-show handling.
- **Check-in** – patients get a digital pass with a QR code and can check in from their phone (location-checked), at a reception desk, or at a **kiosk** tablet (`/kiosk`, paired with a device key). A live queue shows who is waiting.
- **Organizations** – one owner can run several hospitals (branches), invite Admins and Managers, and switch the active hospital.
- **Hospital websites** – each hospital can publish a themed site at `<slug>.<ROOT_DOMAIN>` (dev: `/?site=<slug>`), edited at `/hospital/site`.
- **Khmer and English** – all static text lives in `frontend/src/locales/en.json` and `km.json`; Khmer font is self-hosted.
- **Security** – rate limiting, request validation with whitelisting, helmet headers.

## Getting started

Requirements: Node 18+ and MySQL.

```sh
# Backend (http://localhost:3001, API under /v1)
cd backend
cp .env.example .env        # set DATABASE_URL, JWT secrets, etc.
npm install
npx prisma migrate dev
npm run prisma:seed         # sample data
npm run start:dev

# Frontend (http://localhost:5173)
cd frontend
npm install                 # or bun install
npm run dev
```

Optional data scripts (backend): `npm run seed:cambodia-hospitals` imports hospitals across Cambodia; `npm run provinces:fill` fills in missing provinces.

### Preview mode (no backend needed)

`npm run dev:preview` (or `npm run build:preview`) runs the frontend entirely on in-memory demo data from `frontend/src/mocks`. Any login works and signs in as `VITE_PREVIEW_ROLE` (`user`, `hospital`, `doctor`, `admin`). Demo hospital site: `/?site=demo-hospital`. The default mode (`prod`) talks to the real API at `VITE_API_URL`.

## Configuration

Copy `backend/.env.example` and `frontend/.env.example`; every variable is documented there. The main ones:

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `DATABASE_URL` | backend | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | backend | Token signing – use long random values |
| `CORS_ORIGIN`, `ROOT_DOMAIN` | backend | Allowed web origins and hospital-site domain |
| `APP_URL` | backend | Links in emails |
| `MAIL_*` | backend | SMTP; leave `MAIL_HOST` empty to log emails instead |
| `APP_UTC_OFFSET_MINUTES`, `APPOINTMENT_*`, `CHECKIN_*`, `NO_SHOW_GRACE_MINUTES` | backend | Appointment times, reminders and check-in rules (Cambodia = +420) |
| `TRUST_PROXY` | backend | Set behind a reverse proxy so rate limits see real client IPs |
| `VITE_API_URL` | frontend | API base URL |
| `VITE_APP_MODE` | frontend | `prod` or `preview` |
| `VITE_ROOT_DOMAIN`, `VITE_APP_URL` | frontend | Hospital-site subdomains and main-app links |

Never commit real secrets; `.env` files are for local use.

## Testing

```sh
cd backend && npm test            # jest
cd frontend && npm run test:unit  # vitest
cd frontend && npm run type-check
```

Deploying hospital sites needs a wildcard DNS record and TLS certificate for `*.<ROOT_DOMAIN>`, and an SPA fallback to `index.html` on the frontend host.

## Repository layout

```
backend/
  prisma/                schema, migrations, seed scripts
  src/core/              auth, access rules, mail, file storage, websocket
  src/modules/           hospitals, appointments, doctors, kiosks, organizations, sites, ...
frontend/
  src/views/             pages (web/, admin/, kiosk/, site/)
  src/components/        UI, hospital, appointment, check-in, site templates
  src/locales/           en.json, km.json
  src/mocks/             preview-mode demo data
pnc_vc2.postman_collection.json   Postman collection for the API
```

# Team member and Roles
| Firstname    | Lastname | Role         |
| ------------ | -------- |--------------|
| Rath   | SAMRITH    |Scrum master|
| Radit  | THY     |Devops Manager|
| Leysreng    | OL    |Code Quality|
|Phal   |HIM| UX Manager|
|Sreynang |RITH| Database Manager|
|Bour| KLAN| QA Manager|
