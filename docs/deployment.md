# Deployment

The two apps deploy independently. The web app is a standard Next.js build; the API
is a compiled Node/Express service backed by PostgreSQL.

## Build

**API**

```bash
cd api
npm ci
npx prisma generate
npm run build        # tsc → dist/
npx prisma migrate deploy   # apply migrations to the production database
npm start            # runs node dist/index.js
```

**Web**

```bash
cd web
npm ci
npm run build        # next build
npm start            # next start (defaults to port 3001)
```

Point the web app at the deployed API by setting `NEXT_PUBLIC_API_URL` at build time.

## Production environment

Set these before starting the API (see [Configuration](configuration.md) for the full
list):

- `DATABASE_URL` — production PostgreSQL runtime URL (pooled is supported)
- `DIRECT_URL` — direct PostgreSQL URL for Prisma migrations
- `JWT_SECRET` — a fresh, long random string (different from dev/staging)
- `API_URL`, `FRONTEND_URL` — the real public URLs
- `CORS_ORIGINS` — any additional browser origins that call the API
- `TRUST_PROXY` — the number of proxies in front of the API (e.g. `1` behind nginx),
  so rate limiting sees real client IPs
- Mailtrap variables — set `MAILTRAP_USE_SANDBOX=false` and a verified `MAIL_FROM`
  domain once real delivery is required; otherwise mail is logged, not sent

For the web app:

- `NEXT_PUBLIC_API_URL` — the public API base URL

## Reverse proxy

A typical layout puts both apps behind one domain via nginx:

- `/api` and `/uploads` → the API (port 4000)
- everything else → the web app (port 3001)

When proxying, set `TRUST_PROXY` to match the number of proxy hops so the rate limiter
reads the correct client address.

## Persistent storage

Uploaded files are written to `api/uploads` on local disk and served from `/uploads`.
On a platform with an ephemeral filesystem, mount a persistent volume there or move
uploads to object storage; otherwise files are lost on redeploy.

## Pre-launch checklist

- [ ] `JWT_SECRET` is unique to production and kept secret
- [ ] `DATABASE_URL` points at the runtime database, `DIRECT_URL` points at its
      direct connection, and migrations are applied (`prisma migrate deploy`)
- [ ] `FRONTEND_URL` / `CORS_ORIGINS` list only the real origins
- [ ] `TRUST_PROXY` matches the proxy topology; `RATE_LIMIT_DISABLED` is not set
- [ ] Mail is configured (or intentionally left in log-only mode)
- [ ] `NEXT_PUBLIC_API_URL` in the web build points at the production API
- [ ] `api/uploads` is on persistent storage
- [ ] A first `SUPER_ADMIN` account exists (see
      [Getting started](getting-started.md#6-create-your-first-admin))
- [ ] `GET /health` returns `{ "status": "ok" }` from the deployed API

## Notes and limitations

- **CI runs on every push and pull request** to `main`, `master`, and `develop` via
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It checks both packages:
  the API job runs Prisma generation, typecheck, tests, and its production build; the
  web job runs typecheck, lint, tests, and `next build`. The web build uses an
  intentionally unreachable local API URL, so server-rendered public fetches exercise
  their documented empty-content fallback without external network or database access.
- **No Dockerfiles** are included; the build steps above assume a Node runtime.
- Scheduled-publish fields exist on content models, but confirm whether a scheduler is
  running in your environment before relying on timed publishing.
