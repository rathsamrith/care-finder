# Laravel → NestJS + Fastify Migration Roadmap

Status: **All planned API modules are built.** Every resource from the
original Laravel `routes/api.php` now has a NestJS equivalent under
`nest-api/src/modules/`, on top of the Auth module and core infra (Prisma,
file storage, JWT/RBAC, WebSocket gateway). `npx tsc --noEmit` and
`npx nest build` both pass clean across the whole app. **Not yet done:**
running this against a real database (no MySQL instance was available while
building — see "Verifying against a real database" below), seeding
permissions (only roles are seeded — see RBAC section), and the Blade admin
panel (deleted, no replacement built — see Scope below). Laravel itself was
removed from `backend/` at the user's explicit request, ahead of the original
phased plan (which would have kept it in place until the Nest app reached
parity) — there is no working reference implementation left to diff new
behavior against. Recovering the original Laravel source (e.g. to double-check
a business rule that had to be reconstructed from memory/inventory rather than
read directly) is possible via git history even after this is committed:
`git log --all --diff-filter=D -- 'backend/app/**'` to find the removal
commit, then `git show <commit>~1:backend/app/Http/Controllers/API/V1/HospitalController.php`
(etc.) to read any file as it stood right before deletion.

Scope: this migration covers only the JSON API (`routes/api.php`, consumed by
`../frontend`). The Blade admin panel (`routes/web.php`) had no NestJS
replacement built and is now gone; revisit if the admin panel is still
needed — either port it too or keep a standalone Laravel deployment for it
pointed at the same database.

## What's already built

- **Scaffold**: `nest-api/` — NestJS + Fastify, TypeScript, Prisma, ESLint/Prettier configs.
- **Prisma schema**: `nest-api/prisma/schema.prisma` — all API-relevant tables modeled, with the structural improvements below.
- **Prisma seed**: `nest-api/prisma/seed.ts` — seeds the four roles (`admin`, `hospital`, `doctor`, `user`). Run via `npx prisma db seed` (or automatically after `prisma migrate dev`). Permissions are **not** seeded (see RBAC section).
- **Core infra**: `PrismaModule`, `FileStorageModule` (normalized local-disk uploads), `WebsocketModule` (Socket.IO gateway, replacing Pusher), `AuthModule` (JWT access+refresh, RBAC guards/decorators), `BigIntInterceptor` (`src/common/interceptors/`, global — Fastify can't serialize `bigint`, this handles every Prisma id/FK automatically so no module needs to stringify them itself).
- **Every feature module** under `nest-api/src/modules/` — see the route table below for the full list and exact paths. All of it compiles and builds clean (`npx tsc --noEmit -p tsconfig.json`, `npx nest build`).

## Schema improvements vs. the original Laravel migrations

These are applied in `nest-api/prisma/schema.prisma`. Column/table names still
`@map`/`@@map` to the exact original MySQL names, so migrating data off the
current database is a straight copy — no data transformation needed.

| Change | Why |
|---|---|
| Real FK constraint on `appointments.room_id` | Was a bare `bigint` with no DB-level FK despite the app treating it as a relation. |
| Direct `user_id` FKs for roles/permissions instead of spatie's polymorphic `model_id`/`model_type` | Only `User` is roleable/permissionable in this app — the morph was unused complexity. |
| One shared `AppointmentStatus` enum reused across `status`/`hospital_status`/`doctor_status` | The original declared three independent inline MySQL enums with identical values. |
| Dropped `permissions.front_name` | Non-standard column, no reader found in the inventory. **Confirm before this ships** — restore trivially if something does depend on it. |
| Added `appointments.appointment_end` | Referenced in the Eloquent model's fillable but never defined in any migration. **Confirm with product** whether the feature is actually needed before backfilling; drop the field if not. |
| Added `subscribe_payments.payment_method` / `payment_type` | The controller already writes these keys; the migration never defined them, so they were silently dropped. Also fixes the controller's `payment_types` (plural) typo. |
| Indexes added on FKs and filtered columns (`appointments.appointment_date`, `hospitals.category_id`, etc.) | Mostly absent from the original migrations. |
| Excluded `mailsettings`, `frontusers` | Admin-only and dead/legacy respectively — out of scope for the API surface. |

## Auth model change

Sanctum's opaque, non-expiring bearer tokens are replaced with JWT access
(15m default) + refresh (30d default) tokens. **This forces a one-time
re-login for all existing users** — there is no token-format bridge. Logout is
currently a client-side no-op (stateless JWTs can't be server-revoked without
an extra denylist store); add one if immediate revocation becomes a
requirement before going live.

## RBAC model

Replaces the ad-hoc `$user->hasRole('x') || $user->hasRole('y')` branching
duplicated in nearly every Laravel API controller method with two decorators
(`nest-api/src/core/auth/decorators/`):

- `@Roles('admin', 'hospital')` — user needs at least one listed role.
- `@Permissions('Hospital create')` — formalizes the Admin panel's
  `role_or_permission:'{Entity} {action}'` middleware string convention. Built,
  but **not used by any of the modules below** — the `permissions` table isn't
  seeded (the original Laravel permission-string list lived in
  `database/seeders/`, which was never part of the API inventory this
  migration was built from, and is now gone along with the rest of Laravel).
  Every module uses `@Roles()` only, which is what the original API
  controllers actually enforced (`hasRole()` checks) — the Admin panel's
  finer-grained permission strings were never part of the API surface anyway.
  Seed `permissions` + wire `@Permissions()` in only if the app needs
  finer-than-role authorization later.

Both are enforced by `RolesGuard`, applied after `JwtAuthGuard`. Roles: `admin`,
`hospital`, `doctor`, `user` (seeded by `prisma/seed.ts`).

## Realtime: Pusher → WebSocket Gateway

`nest-api/src/core/websocket/notifications.gateway.ts` is a skeleton: JWT-
authenticated Socket.IO connection, per-user rooms (`user:{id}`), and three
typed emit helpers mapping 1:1 to the old Pusher events:

| Old (Pusher) | New (Socket.IO, namespace `/realtime`) |
|---|---|
| Channel `appointment-placed`, event `appointment-placed` | `emitAppointmentPlaced()` → event `appointment-placed` |
| Channel `appointment.{userId}` (never actually fired — see bug list) | `emitAppointmentStatusChanged()` → event `appointment-status-changed` |
| Channel `notification`, event `notify` | `emitNotification()` → event `notify` |

**Frontend follow-up required** (not built in this pass, `frontend/` is out of
scope here): swap `laravel-echo` + `pusher-js` for `socket.io-client`,
connecting to `/realtime` with `{ auth: { token: <jwt> } }`.

## Known bugs / drift — all fixed

| Bug | Fix |
|---|---|
| `ConfirmAppointment` event had a `BroadcastAs` (capital B) typo — never actually broadcast in production | Replaced entirely: `AppointmentsService` has an explicit `convergeStatus()` method called synchronously after every `hospitalStatus`/`doctorStatus` write, then emits via `NotificationsGateway` — no event/listener chain, no typo surface. See `src/modules/appointments/appointments.service.ts`. |
| `NotifyToHospital` listener's duplicate-notification check only compared the same value twice, so de-duplication only actually worked for one of the two notification types it created (hospital owner vs. doctor) | Fixed: `createAppointmentPlacedNotifications()` runs a separate `findFirst` scoped to each specific recipient's `userId` before each insert. |
| Stripe flow accepted raw card data server-side and hardcoded `pm_card_visa` — PCI-compliance issue, looks like leftover test code | Redesigned: `POST /subscription/checkout` creates a server-side PaymentIntent (amount from `SubscribePlan.price`, never client-supplied) and returns a `clientSecret` for Stripe.js/Elements to confirm client-side; `POST /subscription/confirm` verifies the intent actually succeeded (and that its metadata matches the caller) before recording a `SubscribePayment` row. No card data ever touches the server. See `src/modules/subscriptions/`. |
| `appointments.appointment_end` referenced in code, missing from schema | Added as a real column in the Prisma schema; **still needs product confirmation** that the feature is actually wanted (flagged, not verified) — see schema table above. |
| `subscribe_payments` missing `payment_method`/`payment_type` columns the controller wrote | Added as real columns in the Prisma schema (see table above). |
| `Room::apppointments()` method name typo | Fixed in Prisma (`Room.appointments`). |
| Laravel's `DoctorController::store` created a `User` + `Doctor` row as two separate un-transacted writes (could orphan a User on partial failure) | Fixed: `DoctorsService.create()` wraps both writes in `prisma.$transaction`. |
| Laravel's `DepartmentController` used `POST` for its update route instead of `PUT` | Fixed: `PUT /departments/:id` is a real PUT. |
| `AuthService.me()`/`updateProfile()` originally risked leaking the password hash (`serializeUser` only stripped it at the top level, not from nested `hospital`/`doctor` includes) — caught during this pass, not from the original inventory | Fixed: `serializeUser()` strips `password` before every response; modules that `include` a `User` relation (Appointments, Appointment Notifications) use a `SAFE_USER_SELECT` that excludes `password` at the query level instead of relying on serialization. |

## Route mapping: Laravel `routes/api.php` → NestJS (final)

All Nest routes are served under the global prefix `/v1` (set in `main.ts`),
matching Laravel's `Route::prefix('v1')`. "Auth" = requires `JwtAuthGuard`.
**Several resource path segments were renamed** from the Laravel originals for
consistency (kebab-case, clearer naming) — `frontend/` axios calls need to
target these new paths, not the old Laravel ones, when cutover happens.

| Resource | Module | Routes (method + path) | Notes |
|---|---|---|---|
| Auth | `core/auth/` | `POST /login`, `POST /register`, `POST /forget-password`, `POST /reset-password` (public); `POST /refresh-token` (new — JWT needs this, Sanctum didn't); `POST /logout`, `GET /me`, `GET /profile`, `PUT /update/profile`, `POST /profileUpload` (auth) | |
| Hospitals | `modules/hospitals/` | `GET /hospitals`, `POST /hospitals`, `GET /hospitals/:id`, `PUT /hospitals/:id`, `DELETE /hospitals/:id`, `POST /hospitals/:id/upload`, `POST /hospitals/:id/uploadCover` | |
| Doctors | `modules/doctors/` | `GET /doctors?hospitalId=`, `POST /doctors`, `GET /doctors/:id`, `PUT /doctors/:id`, `DELETE /doctors/:id` | |
| Categories | `modules/categories/` | `GET /categories`, `GET /categories/:id`, `POST /categories` (admin), `PUT /categories/:id` (admin), `DELETE /categories/:id` (admin) | Laravel had only `index`/`show` implemented — full CRUD completed here. |
| Departments | `modules/departments/` | `GET /departments?hospitalId=`, `GET /departments/:id`, `POST /departments`, `PUT /departments/:id`, `DELETE /departments/:id` | Laravel used `POST` for update — fixed to real `PUT`. |
| Rooms | `modules/rooms/` | `GET /rooms?hospitalId=`, `GET /rooms/:id`, `POST /rooms`, `PUT /rooms/:id`, `DELETE /rooms/:id` | |
| Hospital Services | `modules/hospital-services/` | `GET /hospital-services?hospitalId=`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id` | |
| Preview Images | `modules/preview-images/` | `GET /preview-images?hospitalId=`, `POST /preview-images` (multi-file), `PUT /preview-images/:id`, `DELETE /preview-images/:id` | Laravel's `index` was an unimplemented stub — completed here. |
| Hospital Promotions | `modules/hospital-promotions/` | `GET /hospital-promotions/public` (no auth — active promotions only), `GET /hospital-promotions?hospitalId=`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id` | Renamed from Laravel's bare `promotions`/`promotionlist`. |
| Appointments | `modules/appointments/` | `GET /appointments`, `POST /appointments`, `GET /appointments/:id`, `PUT /appointments/:id`, `PUT /appointments/:id/update-status`, `PUT /appointments/:id/cancel`, `DELETE /appointments/:id`, `GET /appointments/summary`, `GET /appointments/today`, `GET /appointments/calendar?month=&year=`, `GET /appointments/monthly` | Role-scoped visibility (admin/hospital/doctor/patient) centralized in the service. |
| Appointment Notifications | `modules/appointment-notifications/` | `GET /appointment-notifications`, `GET /appointment-notifications/unread`, `PUT /appointment-notifications/:id/mark-as-seen` | Renamed from `appointment-notify`. Always self-scoped, no admin override. |
| Rates | `modules/rates/` | `GET /rates?hospitalId=`, `POST /rates`, `GET /rates/:id`, `PUT /rates/:id`, `DELETE /rates/:id`, `GET /rates/recent`, `GET /rates/monthly`, `GET /rates/most-rated` | Renamed from `feedbacks`. |
| Rate Replies | `modules/rate-replies/` | `GET /rate-replies?rateId=`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` | Renamed from `feedback-reply`. Hospital-being-reviewed only. |
| Favourites | `modules/favourites/` | `GET /favourites`, `POST /favourites`, `DELETE /favourites/:id`, `DELETE /favourites/by-hospital/:hospitalId` | Always self-scoped. |
| Subscribe Plans | `modules/subscribe-plans/` | `GET /subscribe-plans`, `GET /:id` (auth); `POST`, `PUT /:id`, `DELETE /:id` (admin) | Laravel had only `index` — full admin CRUD completed here. |
| Subscriptions | `modules/subscriptions/` | `POST /subscription/checkout`, `POST /subscription/confirm` (hospital); `GET /subscription/list` (hospital, or admin with `?userId=`) | Renamed/redesigned from `subscription/payment` — see Stripe redesign above. |
| System Requests | `modules/system-requests/` | `GET /system-requests`, `GET /system-requests/categories`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` | |
| Posts | `modules/posts/` | `GET /posts`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id` | Laravel had only `index` — full CRUD completed here. |
| User Addresses | `modules/user-addresses/` | `GET /user-addresses`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` | Laravel had only `index` — full CRUD completed here, always self-scoped (no admin override, treated as personal data like Favourites). |

## What's left before this can go live

1. **Run against a real database.** No MySQL instance was available while
   building this — `npx prisma migrate dev` (or `db push` against an existing
   schema) and `npx prisma db seed` have not actually been executed. Do this
   first; it's the highest-risk unknown since the schema was hand-written
   against the migration inventory, not introspected from a live DB.
2. **Manually verify each module against the frontend or Postman** — there is
   no working Laravel reference left to diff against, and while every module
   was built by an agent following a shared spec + the Auth module's pattern,
   none of it has been exercised end-to-end yet (see the two confirmations
   flagged in the schema table: `appointment_end` and `permissions.front_name`).
3. **Frontend cutover**: point `frontend/`'s axios base URL at the Nest API,
   and swap `laravel-echo`/`pusher-js` for `socket.io-client` (see Realtime
   section) — connect to `/realtime` with `{ auth: { token: <jwt> } }`. Update
   any hardcoded old route paths per the rename column above.
4. **Blade admin panel** has no replacement — decide whether to port it into
   Nest or keep a standalone Laravel deployment against the same database.
5. **Mail** — `forgotPassword()` in the Auth module writes a reset token but
   does not send an email yet (no mail module was built in this pass); wire
   up `@nestjs-modules/mailer` or similar before password reset is usable
   end-to-end.
6. **Permissions seeding** — see RBAC section; only needed if role-level
   authorization (what's implemented now) turns out to be insufficient.

## Getting the Nest app running

```bash
cd backend/nest-api
cp .env.example .env    # fill in DATABASE_URL (and STRIPE_SECRET_KEY etc.) - see .env.example
npm install
npx prisma migrate dev  # creates the schema on a fresh DB and runs prisma/seed.ts (roles)
npm run start:dev       # listens on :3001 by default
```

If pointing at an *existing* MySQL database (e.g. one still holding the old
Laravel data) rather than a fresh one, use `npx prisma db push` instead of
`migrate dev` to sync the schema without Prisma's own migration history, then
run `npx prisma db seed` separately to seed roles.
