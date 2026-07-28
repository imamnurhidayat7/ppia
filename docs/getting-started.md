# Getting started

This guide gets the platform running on your machine.

## Prerequisites

- **Node.js 20 or newer** and **npm**
- **PostgreSQL 14+** running locally or reachable by connection string
- Optionally a **Mailtrap** account if you want to exercise real e-mail delivery
  (the API runs fine without it and logs e-mails instead)

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

- `DATABASE_URL` — your PostgreSQL connection string
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
npx prisma migrate dev
cd ..
```

This applies the migrations in `api/prisma/migrations` and generates the Prisma
client. Use `npx prisma studio` to browse and edit data in a GUI.

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
