# Appointment Booking API

A small NestJS + PostgreSQL (Prisma) API for booking fixed, pre-seeded appointment slots.
It guarantees **at most one active booking per slot even under concurrent requests**, supports idempotent
cancellation, broadcasts real-time Socket.IO events, and ships an OpenAPI spec with Swagger UI.

| | |
|---|---|
| Stack | TypeScript, NestJS 11, PostgreSQL, Prisma 6, Socket.IO 4, `@nestjs/swagger` (Swagger UI) |
| Endpoints | `GET /slots`, `POST /bookings`, `DELETE /bookings/{bookingId}` |
| Docs | `GET /docs` (Swagger UI), `GET /openapi.json` (OpenAPI 3.0 spec) |
| Real-time | Socket.IO, default namespace `/`, path `/socket.io`, events `slot.booked` / `slot.released` |
| Tests | Jest + Supertest end-to-end tests over real HTTP against a real PostgreSQL test database |

---

## 1. Requirements

- Node.js **20+** (developed on Node 24) and npm
- PostgreSQL **14+**, either your own server or the optional `docker-compose.yml` (Postgres 16)

## 2. Install

```bash
npm install          # also runs `prisma generate` via @prisma/client's postinstall
npx prisma generate  # only needed if your npm skipped install scripts
```

## 3. Environment variables

| Variable | Used by | Example |
|---|---|---|
| `DATABASE_URL` | app, migrations, seed | `postgresql://booking:booking@localhost:5433/booking?schema=public` |
| `PORT` | app (default `3000`) | `3000` |

```bash
cp .env.example .env              # development database
cp .env.test.example .env.test    # test database (see section 6)
```

The example values match `docker-compose.yml`. They are placeholders, not secrets.

## 4. Database

Start PostgreSQL. With Docker (optional), this creates both `booking` and `booking_test`:

```bash
docker compose up -d
# or, without the compose plugin:
docker run -d --name booking-postgres -p 5433:5432 \
  -e POSTGRES_USER=booking -e POSTGRES_PASSWORD=booking -e POSTGRES_DB=booking \
  -v "$PWD/docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql:ro" postgres:16-alpine
```

Using your own PostgreSQL instead: create two databases (e.g. `booking` and `booking_test`) and point the two env files at them.

Apply migrations and seed:

```bash
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # prisma db seed, idempotent upsert of 8 fixed slots (ids 11111111-1111-4111-8111-11111111111{1..8})
```

## 5. Run

```bash
npm run start:dev          # watch mode
# or
npm run build && npm start # compiled (node dist/main.js)
```

- API: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/openapi.json>

Quick check:

```bash
curl -s localhost:3000/slots
curl -s -X POST localhost:3000/bookings -H 'Content-Type: application/json' \
  -d '{"slotId":"11111111-1111-4111-8111-111111111111","customerName":"Alex Morgan","customerEmail":"alex@example.com"}'
curl -s -X DELETE localhost:3000/bookings/<bookingId>
```

## 6. Tests

The tests are end-to-end: each one boots the real Nest app on a random port and sends real HTTP requests
(Supertest) to it, backed by a **real PostgreSQL** database. Nothing is mocked.

**Test database setup**

1. Create a dedicated database whose name contains `test` (Docker setup above already creates `booking_test`).
2. `cp .env.test.example .env.test` and adjust `DATABASE_URL` if needed.
3. Run:

```bash
npm test
```

`npm test` loads `.env.test`. Jest's global setup (`test/global-setup.ts`) refuses to run if the database name
does not contain `test`, then runs `prisma migrate deploy`. Before **every** test the tables are truncated and the
8 fixed slots are re-inserted (`test/helpers.ts`), so runs are repeatable and independent of order or previous runs.
Tests run in band (`--runInBand`) because they share one database.

**What is covered** (29 tests in `test/bookings.e2e-spec.ts`):

- **Required #1:** booking returns `201` and the slot disappears from `GET /slots`.
- **Required #2:** two overlapping requests for the same slot, fired together with `Promise.all` and no await in between, yield exactly one `201` and one `409 SLOT_UNAVAILABLE`, with exactly one active booking in the DB. An extra test runs 20 parallel requests with identical customer data: one `201`, nineteen `409`s.
- **Required #3:** cancel returns `200`, the slot is available again, and a new booking succeeds.
- Idempotent repeated cancel, with the row unchanged in the DB.
- Cancelling an old cancelled booking does not affect a newer active booking.
- Validation (`400`) for missing, invalid, and non-string fields, blank-after-trim names, malformed JSON, and non-object bodies. Trimming is persisted.
- `404 SLOT_NOT_FOUND` and `404 BOOKING_NOT_FOUND`.
- Slot ordering by `startsAt` then `id`, and `{"slots":[]}` when nothing is available.
- Socket.IO: exactly one `slot.booked` / `slot.released` with no customer data, no events for rejected requests or repeated cancels, and exactly one `slot.booked` per race.
- `/openapi.json` operations and status codes, and `/docs` availability.

I also verified that the concurrency tests are meaningful: after manually dropping the partial unique index in the
test DB, the race tests failed (20 of 20 requests got `201`). After restoring it, they pass.

## 7. API summary

Full details, schemas and examples are in Swagger UI (`/docs`). No endpoint requires authentication.
All bodies are JSON, ids are UUID strings, and timestamps are ISO 8601 in UTC.

| Method & path | Success | Errors |
|---|---|---|
| `GET /slots` | `200 {"slots":[{id,startsAt,endsAt}]}`, available only, sorted by `startsAt`, then `id` | `500 INTERNAL_ERROR` |
| `POST /bookings` `{slotId,customerName,customerEmail}` | `201 {"booking":{id,slotId,customerName,customerEmail,status:"active"}}` | `400 VALIDATION_ERROR`, `404 SLOT_NOT_FOUND`, `409 SLOT_UNAVAILABLE`, `500 INTERNAL_ERROR` |
| `DELETE /bookings/{bookingId}` | `200 {"booking":{...,status:"cancelled"}}`, idempotent | `400 VALIDATION_ERROR`, `404 BOOKING_NOT_FOUND`, `500 INTERNAL_ERROR` |

Error format: `{"error":{"code":"SLOT_UNAVAILABLE","message":"This slot already has an active booking."}}`.
Unexpected errors are logged server-side and returned as a generic `500 INTERNAL_ERROR`. Stack traces and database
details are never sent to clients. Unknown routes return `404 NOT_FOUND` in the same format.

## 8. Socket.IO (real-time events)

- Same server and port as the HTTP API, default namespace `/`, path `/socket.io`. No auth, no rooms, no client-sent events.
- Each event is emitted **once, only after the database change has committed successfully**.
- No events are sent for rejected requests (400/404/409) or for repeated cancels. Payloads never include customer data.

| Event | When | Payload |
|---|---|---|
| `slot.booked` | a booking was created | `{"slotId":"<uuid>","bookingId":"<uuid>","available":false}` |
| `slot.released` | an active booking was cancelled | `{"slotId":"<uuid>","bookingId":"<uuid>","available":true}` |

Delivery is best effort: no persistence, replay, or exactly-once guarantees, as the spec allows.

### Testing it without a UI

Terminal 1: `npm run start:dev`

Terminal 2 (headless listener built on `socket.io-client`):

```bash
npm run socket:listen                         # defaults to http://localhost:3000
# npm run socket:listen -- http://host:port
```

Terminal 3: trigger events:

```bash
# book (prints booking id) -> listener shows slot.booked
curl -s -X POST localhost:3000/bookings -H 'Content-Type: application/json' \
  -d '{"slotId":"11111111-1111-4111-8111-111111111112","customerName":"Alex","customerEmail":"alex@example.com"}'

# cancel -> listener shows slot.released; run it again -> 200, and no new event
curl -s -X DELETE localhost:3000/bookings/<bookingId>

# race 10 concurrent requests for one slot -> one 201, nine 409, and a single slot.booked
npm run demo:concurrent -- 11111111-1111-4111-8111-111111111111 10
```

## 8b. Optional frontend (`frontend/`)

The challenge does not require a UI. The graded part is the API above. A small **Next.js 15 + Tailwind CSS 4**
client is included only as a demonstration of consuming the API and the real-time events. It lives in its own
folder with its own `package.json` and does not change the backend.

```bash
# with the API running on :3000
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev                  # http://localhost:3001
```

- Arabic, RTL UI: available slots grouped by day, a booking form, "my bookings" with cancel, and a live Socket.IO event feed.
- REST calls go through a Next.js rewrite (`/api/*` → API), so the backend needs no CORS configuration.
  Socket.IO connects directly to the API, and the gateway already allows cross-origin connections.
- Real-time behavior: `slot.booked` removes the slot instantly, and `slot.released` re-fetches the list and highlights the slot.
  If someone books the slot you're filling in, the form warns you and disables submit. A `409` shows a clear message and refreshes the list.
  After a reconnect the list is re-fetched, because missed events aren't replayed.
- There is no "list bookings" endpoint and no auth, so bookings made in this browser are remembered in `localStorage` to allow cancelling.
- Try it: open two browser windows and book or cancel in one. The other updates live.

## 9. Design decisions

### Preventing double booking

The guarantee lives **in the database**, not in application code:

```sql
CREATE UNIQUE INDEX "Booking_one_active_per_slot" ON "Booking"("slotId") WHERE "status" = 'active';
```

`POST /bookings` does **not** check availability and then insert, because that read-then-write pattern is racy.
It simply `INSERT`s. When two transactions insert an active booking for the same slot at the same time,
PostgreSQL's unique index lets exactly one commit. The other gets a unique violation, which Prisma surfaces
as `P2002` and the service maps to `409 SLOT_UNAVAILABLE`.

Why this approach:

- **Correct under any concurrency**, including multiple app instances, because the source of truth is one index.
- **No explicit locks, SERIALIZABLE retries, or long transactions.** The request is a single short `INSERT`.
- **Cancelled bookings are excluded by the partial `WHERE`**, so a slot can be re-booked after cancellation
  while its history (old cancelled rows) remains queryable by id.

Alternatives considered:

- `SELECT ... FOR UPDATE` on the slot row inside a transaction also works, but needs a transaction and lock around every booking.
- A `bookedBy` column on `Slot` updated with `UPDATE ... WHERE bookedBy IS NULL` also works, but denormalizes state.
- SERIALIZABLE isolation also works, but needs retry logic.

A pre-check `findUnique` on the slot exists only to return a clear `404 SLOT_NOT_FOUND`. Slots are never deleted,
so it doesn't race with anything. A foreign-key violation (`P2003`) is still mapped to `404` defensively.

### Cancellation

`UPDATE "Booking" SET status='cancelled', cancelledAt=now() WHERE id=$1 AND status='active'` (Prisma `updateMany`).
The conditional update is atomic: under concurrent cancels only one statement matches the row, so the state change
and the `slot.released` event happen exactly once. A repeat cancel matches zero rows and returns the stored booking
unchanged with no event. Only the addressed row is touched, so cancelling an old cancelled booking can never affect a
newer active booking for the same slot.

### Data model

- `Slot(id uuid, startsAt timestamptz, endsAt timestamptz)` with `CHECK ("endsAt" > "startsAt")` and an index on `(startsAt, id)` matching the list ordering.
- `Booking(id uuid, slotId uuid → Slot, customerName, customerEmail, status enum(active|cancelled), createdAt, cancelledAt)`.
- Bookings are never deleted (soft state change), which keeps cancelled bookings reachable and gives an audit trail.
- "Available" is derived (`no active booking`), not stored, so there's no second source of truth to keep in sync.
- The CHECK constraint and partial index are not expressible in `schema.prisma`, so they are written by hand in the
  migration SQL and documented in the schema comments. `prisma migrate diff` shows no drift.

### Code organization

Feature modules at a scale that fits the task: no extra repository or use-case layers for three endpoints.

```
src/
  main.ts, app.module.ts, app.setup.ts   # app.setup is shared by main and tests (pipes, filter, Swagger, WS adapter)
  common/      api-error.ts (spec error codes), api-exception.filter.ts, validation.ts, error-response.dto.ts
  prisma/      PrismaService (global module)
  slots/       controller + service + DTOs
  bookings/    controller + service + DTOs   <- concurrency & cancellation logic
  realtime/    SlotEventsGateway (broadcast-only Socket.IO gateway)
prisma/        schema.prisma, migrations/, seed.ts, seed-data.ts
test/          e2e tests, helpers, global setup
scripts/       socket-listen.ts, concurrent-booking.ts
frontend/      optional Next.js + Tailwind demo client (separate package, see 8b)
```

- **Validation:** `class-validator` DTOs plus a global `ValidationPipe` (`whitelist`, `transform`) whose errors map to
  `400 VALIDATION_ERROR`. Name and email are trimmed with `@Transform` before validation. Non-object JSON bodies
  are rejected explicitly, and malformed JSON from the body parser is mapped to `VALIDATION_ERROR` by the exception filter.
- **OpenAPI:** generated from the same DTO classes the validator uses, so the docs and the implementation can't drift
  on field names, types, or required fields. Every operation documents all status codes with examples, and `security: []`
  states that no auth is needed.

## 10. Possible improvements

- Add a `GET /bookings/{id}` endpoint. The spec forbids extra routes, but cancelled bookings are already retrievable by id at the DB level.
- Add structured logging with request ids and a health check endpoint.
- Add the Socket.IO Redis adapter so events reach clients across multiple instances.
- Use a transactional outbox if events ever need durable, guaranteed delivery.
- Add rate limiting, and normalize emails (lowercasing) if the business wants case-insensitive matching.
- Add a Prisma config file (`prisma.config.ts`) before upgrading to Prisma 7, and CI running the e2e suite against a Postgres service container.

## 11. Actual time spent and incomplete parts

- **Actual time:** about **1 hour** (roughly 12:00 to 12:50), covering implementation, tests, documentation, code review,
  and the optional frontend. Implementation was AI-assisted (Cursor). I reviewed the code, ran the tests, and verified the behavior manually myself.
- **Incomplete parts:** none. All requirements are implemented and tested: 29 passing e2e tests against a real
  PostgreSQL database, including the concurrent-requests test.
- **Known limitations:**
  - Socket.IO events have no durable delivery or replay, which the spec allows. The frontend re-fetches slots on reconnect.
  - `customerEmail` is stored as entered after trimming only. It is not lowercased.
  - The optional frontend (not required) keeps the user's bookings in `localStorage`, because there is no "list bookings"
    endpoint and no authentication.
  - Prisma 6 prints a deprecation warning about the `package.json#prisma` config. It doesn't affect anything.

## 12. AI disclosure

I used an AI coding assistant (Cursor) to scaffold the project and draft code, tests, and documentation.
I reviewed every file, and I understand the key design decisions and can explain them: the partial unique index for
concurrency, the conditional-update cancel, and emitting events after commit. I verified the behavior by:

- running the e2e suite against a real PostgreSQL database, repeatedly;
- manually testing every endpoint and error case with `curl`;
- running the concurrent-booking script with the Socket.IO listener;
- dropping the partial unique index to confirm that the concurrency tests catch a double booking, then restoring it.
