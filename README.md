# PPIA Auckland

Website and membership platform for **PPIA Auckland** — Perhimpunan Pelajar Indonesia Auckland (the Indonesian Students' Association in Auckland, New Zealand).

The project is a monorepo with two applications:

| App | Path | Stack |
| --- | --- | --- |
| **Web** | [`web/`](web) | Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript |
| **API** | [`api/`](api) | Express, Prisma, PostgreSQL, TypeScript |

It powers three things:

1. **Public site** — homepage, events, articles, research corner, About/Contact pages, and the student election (PEMIRA). Content is editable through a CMS and supports an English/Indonesian language toggle for visitors.
2. **Member dashboard** — a signed-in area where approved members browse content, register for events, manage their profile and member card, and vote in elections.
3. **Admin dashboard** — role-gated tooling to manage content, members, media, comments, newsletters, analytics, elections, and site configuration.

## Quick start

Prerequisites: **Node.js 20+**, **npm**, and a **PostgreSQL 14+** database.

A single variable decides where data lives — `DATA_SOURCE=local` uses a local
Postgres with uploads on disk, `DATA_SOURCE=supabase` uses Supabase for both. See
[Choosing where data lives](docs/getting-started.md#choosing-where-data-lives-local-or-supabase).

```bash
# 1. Install dependencies for the root, api, and web
npm run install:all

# 2. Configure the API
cp api/.env.example api/.env
#    then edit api/.env — at minimum set DATABASE_URL and JWT_SECRET

# 3. Configure the web app (defaults to the local API)
#    web/.env.local already points at http://localhost:4000

# 3b. Optional: start a local Postgres (no Supabase account needed)
docker compose -f docker-compose.dev.yml up -d

# 4. Apply the committed database migrations
cd api && npm run db:deploy && npm run db:generate && cd ..

# 5. Run both apps together (API on :4000, web on :3001)
npm run dev
```

Open the web app at **http://localhost:3001**. The API listens on **http://localhost:4000** with a health check at `/health`.

> The first account you create through `/register` starts as a `MEMBER` with `PENDING` status. Promote an account to `SUPER_ADMIN` directly in the database (or via `npx prisma studio`) to reach the admin dashboard.

## Repository layout

```
LandingPage/
├── api/                 # Express + Prisma backend
│   ├── prisma/          # schema.prisma, migrations, seed scripts
│   └── src/
│       ├── controllers/ # request handlers (26 modules)
│       ├── routes/      # Express routers, mounted under /api
│       ├── middleware/  # auth, rate limiting, security headers
│       └── lib/         # prisma client, mailer, helpers
├── web/                 # Next.js frontend
│   └── src/
│       ├── app/         # App Router pages (public + /dashboard)
│       ├── components/  # UI kit, dashboard shell, sections
│       └── lib/         # API client, contexts, utilities
├── docs/                # Full documentation (start at docs/README.md)
└── package.json         # workspace scripts (dev, build, start)
```

## Common scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run install:all` | Install root, API, and web dependencies |
| `npm run dev` | Run API and web together in watch mode |
| `npm run build` | Build the web app for production (CI also builds the API separately) |
| `npm run start` | Start both apps in production mode |

Inside `api/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled API |
| `npm run typecheck` | Type-check API and test sources without emitting files |
| `npm test` | Run API unit tests once |
| `npm run db:deploy` | Apply committed migrations to the selected database |
| `npm run db:status` | Show migration state of the selected database |
| `npm run db:migrate` | Create/develop migrations locally (`prisma migrate dev`) |
| `npm run db:studio` | Open Prisma Studio |

Inside `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3001 |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check the Next.js app without emitting files |
| `npm run lint` | Run ESLint |
| `npm test` | Run web unit tests once |

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- [Getting started](docs/getting-started.md) — prerequisites, local setup, first admin account
- [Architecture](docs/architecture.md) — how the pieces fit together
- [Configuration](docs/configuration.md) — every environment variable
- [Data model](docs/data-model.md) — Prisma models, roles, membership lifecycle
- [API reference](docs/api-reference.md) — endpoints grouped by resource
- [Frontend guide](docs/frontend.md) — dashboard, roles, design system, theming, i18n
- [Deployment](docs/deployment.md) — production checklist

## License

Private project for PPIA Auckland. Not licensed for public reuse.
