# Getting started

This guide gets the platform running on your machine.

## Prerequisites

- **Node.js 20 or newer** and **npm**
- **PostgreSQL 14+** running locally or reachable by connection string
- Optionally a **Mailtrap** account if you want to exercise real e-mail delivery
  (the API runs fine without it and logs e-mails instead)

## Choosing where data lives: local or Supabase

One variable selects the database **and** the file storage together, so the two
cannot end up pointing at different environments by accident:

```
# api/.env
DATA_SOURCE=local       # local Postgres + uploads on disk
DATA_SOURCE=supabase    # Supabase Postgres + Supabase Storage
```

| | `DATA_SOURCE=local` | `DATA_SOURCE=supabase` |
| --- | --- | --- |
| Database | `LOCAL_DATABASE_URL` | `SUPABASE_DATABASE_URL` (+ `SUPABASE_DIRECT_URL` for migrations) |
| Uploads | `api/uploads` and `api/storage/private` | Supabase Storage buckets |

Both the API and the Prisma CLI honour the switch — the `db:*` scripts route
through it, so `npm run db:deploy` always targets the database you selected. The
API prints the resolved target at boot:

```
Data source: local — database localhost:5432/ppia
Storage: local disk — public …/api/uploads, private …/api/storage/private
```

`STORAGE_DRIVER` only needs setting to break the pairing deliberately (for
example a local database with the real buckets). An explicit `DATABASE_URL`
always wins, so a host that injects one — Render, Fly, Heroku — keeps working
without `DATA_SOURCE` at all.

### Local Postgres, no Docker

```bash
brew install postgresql@16
brew services start postgresql@16
createdb ppia
```

A Homebrew install creates a role named after your macOS user with no password,
so in `api/.env`:

```
DATA_SOURCE=local
LOCAL_DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/ppia?schema=public
```

Then create the schema:

```bash
cd api && npm run db:deploy && npm run db:generate && cd ..
npm run dev
```

### Local Postgres via Docker (optional)

If you would rather not install Postgres on the host, the repository ships a
container. It publishes port **5433** so it cannot clash with an existing
Postgres on 5432:

```bash
docker compose -f docker-compose.dev.yml up -d
# in api/.env:
# LOCAL_DATABASE_URL=postgresql://ppia:ppia_local_dev@localhost:5433/ppia?schema=public
```

Stop it with `docker compose -f docker-compose.dev.yml down` (add `-v` to delete
the data as well).

### Where local uploads go

- Public images → `api/uploads/`, served at `http://localhost:4000/uploads/<file>`.
- Registration documents → `api/storage/private/`, deliberately **outside** the
  statically served directory. They are readable only through a short-lived
  signed link that the admin-gated `GET /api/members/:id/document` endpoint
  mints, which the API serves from `GET /api/private-files/...`.
- Both directories are gitignored. The private one holds members' personal
  documents, so it must never be committed.

The API prints which driver is active and where files land on boot:

```
Storage: local disk — public …/api/uploads, private …/api/storage/private
```

Leaving `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` empty is enough to select
the local driver; `STORAGE_DRIVER` only needs setting to override that guess.

## 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs the root workspace, then `api/`, then `web/`.

## 2. Configure the API

```bash
cp api/.env.example api/.env
```

Open `api/.env` and set, at minimum:

- `DATA_SOURCE` — `local` or `supabase`; selects the database and storage
  together (see [Choosing where data lives](#choosing-where-data-lives-local-or-supabase))
- `LOCAL_DATABASE_URL` — your local PostgreSQL connection string, when
  `DATA_SOURCE=local`
- `JWT_SECRET` — any long random string for local use

Every variable is documented in [Configuration](configuration.md). Leaving the
Mailtrap variables empty is fine locally — the API will log outbound e-mails to the
console rather than sending them.

## 3. Configure the web app

`web/.env.local` already contains:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

That points the browser client at your local API. No further change is needed for
local development.

## 4. Create the database schema

```bash
cd api
npm run db:deploy
npm run db:generate
cd ..
```

This replays the committed migrations in `api/prisma/migrations` against the
database `DATA_SOURCE` selects, and generates the Prisma client. Use
`npm run db:migrate` only while authoring a new migration locally, and
`npm run db:studio` to browse and edit data in a GUI.

## 5. Run the apps

```bash
npm run dev
```

This starts both processes concurrently:

- **API** on `http://localhost:4000` (health check at `/health`)
- **Web** on `http://localhost:3001`

You can also run them separately with `npm run dev:api` and `npm run dev:web`.

## 6. Create your first admin

Registration always creates a `MEMBER` account with `PENDING` membership status, so
the very first admin has to be promoted manually.

1. Register through the web app at `/register`, or create a user in Prisma Studio.
2. Open Prisma Studio (`cd api && npx prisma studio`), find your row in the `User`
   table, and set:
   - `role` to `SUPER_ADMIN`
   - `membershipStatus` to `APPROVED`
3. Sign in again. The admin dashboard is reachable at `/dashboard/admin`.

From there you can approve other members and grant the `BOARD` role through the UI.

## Seed scripts (optional)

The API ships helper scripts for content scaffolding (see `api/package.json`):

```bash
cd api
npm run db:seed-home     # seed homepage landing sections
npm run db:seed-pages    # seed standard pages
```

These are convenience scripts for content, not required to run the app.

## Troubleshooting

- **The web app loads but every request fails** — confirm the API is running on
  port 4000 and that `NEXT_PUBLIC_API_URL` matches.
- **CORS errors in the browser** — add your frontend origin to `CORS_ORIGINS` in
  `api/.env`. `localhost:3000` and `localhost:3001` are always allowed.
- **`prisma migrate` cannot connect** — check `DATABASE_URL` and that PostgreSQL is
  accepting connections.
- **401 right after signing in** — the JWT is stored in the browser; clearing site
  data or a changed `JWT_SECRET` invalidates existing tokens.
