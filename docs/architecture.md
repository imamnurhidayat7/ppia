# Architecture

## Overview

```
┌─────────────────────────────┐         JSON / REST          ┌──────────────────────────────┐
│           web/               │  ───────────────────────▶   │            api/                │
│  Next.js 16 · React 19       │   Authorization: Bearer JWT  │  Express · TypeScript          │
│  App Router · Tailwind v4    │  ◀───────────────────────   │                                │
│                              │                              │  Prisma ORM                    │
│  Axios client (lib/api.ts)   │                              │        │                       │
└─────────────────────────────┘                              │        ▼                       │
                                                             │   PostgreSQL                    │
                                                             └──────────────────────────────┘
```

Two independent applications in one repository:

- **`web/`** renders the public site and both dashboards. It is a client of the API;
  it holds no database credentials. All data access goes through a single Axios
  client, `web/src/lib/api.ts`.
- **`api/`** is a stateless Express service. It owns the database through Prisma and
  exposes everything under `/api`.

There is no server-to-server coupling beyond HTTP, so the two can be deployed and
scaled separately.

## Backend (`api/`)

```
api/src/
├── index.ts          # app bootstrap: security headers, CORS, static uploads, routes
├── routes/           # one Express Router per resource, mounted under /api
├── controllers/      # request handlers (26 modules); business logic lives here
├── middleware/
│   ├── auth.ts             # authenticate (verify JWT) + authorize(...roles)
│   ├── rate-limit.ts       # request throttling keyed by client IP
│   └── security-headers.ts # security headers on every response
└── lib/
    ├── prisma.ts     # shared PrismaClient instance
    ├── mailer.ts     # transactional e-mail via the Mailtrap HTTP API
    ├── auth.ts       # token + password helpers
    ├── user-select.ts# safe field selections (never leak password hashes)
    ├── electionState.ts # derives PEMIRA phase from timestamps
    └── ics.ts        # calendar (.ics) generation for events
```

### Request flow

1. `securityHeaders` runs first, so even error responses and static files carry
   security headers.
2. CORS is evaluated against an allow-list (`FRONTEND_URL`, `CORS_ORIGINS`, and the
   two localhost dev ports).
3. Body parsers run, then the route is matched.
4. Protected routes pass through `authenticate` (verifies the `Bearer` JWT and
   attaches `req.user`) and, where required, `authorize('SUPER_ADMIN', ...)` which
   checks the role.
5. The controller runs, using Prisma for data access, and returns JSON.

### Authentication & authorization

- **Stateless JWT.** On login the API signs a token containing the user id and role.
  The browser stores it and sends it as `Authorization: Bearer <token>` on every
  request. There is no server-side session store.
- **Two layers of role enforcement.** Many admin routes are gated at the router with
  `authorize(...)`, and controllers also re-check the role and ownership. Content
  routes (articles, events, research, media, comments, tags, pages) allow
  `SUPER_ADMIN` and `BOARD`; everything else (members, divisions, registrations,
  newsletter, elections, audit logs, search, settings) is `SUPER_ADMIN` only.
- **Membership status.** A user's `membershipStatus` (`PENDING` / `APPROVED` /
  `REJECTED`) gates access to member features independently of role.

See [API reference](api-reference.md) for the per-endpoint requirements and
[Data model](data-model.md#roles) for the role definitions.

### Uploads

Files are written under `api/uploads` and served statically at `/uploads` with
`X-Content-Type-Options: nosniff`; PDFs are sent with `Content-Disposition:
attachment` so a document cannot render inline on the API origin. Upload endpoints
live under `/api/upload`.

### E-mail

Transactional mail (verification, password reset, membership approval) goes through
the Mailtrap HTTP API in `lib/mailer.ts`. With no token configured the API logs the
message instead of sending it, so local development needs no mail credentials.

## Frontend (`web/`)

```
web/src/
├── app/
│   ├── (public routes)   # /, about, activities, contact, opportunities, pemira, legal
│   ├── dashboard/        # member dashboard (+ /dashboard/admin for admins)
│   ├── login, register, forgot-password, reset-password, verify-email
│   └── layout.tsx        # root providers (theme, language, auth, toast)
├── components/
│   ├── dashboard/        # shell, nav config, page kit, KPI cards, charts
│   ├── ui/               # reusable primitives (Button, Modal, Table, Badge…)
│   ├── sections/         # public homepage sections
│   ├── admin/, builder/, blocks/  # CMS editors and block renderers
│   └── pemira/           # election UI (ballot, results, timeline)
└── lib/
    ├── api.ts            # Axios client — the single source of API calls
    ├── auth-context.tsx  # current user, login/logout, session hydration
    ├── theme-context.tsx # light / dark / system theme
    ├── language-context.tsx # public-site EN/ID toggle
    └── utils.ts          # cn(), date/number formatting (en-NZ), helpers
```

- **App Router.** Pages are React Server/Client components. Dashboard pages are
  client components that fetch through the Axios client.
- **One chrome for the dashboard.** `DashboardShell` provides the top navigation,
  command palette (⌘K), notifications, theme toggle, and user menu. Navigation is
  generated from `components/dashboard/nav-config.ts`, filtered by role.
- **Design system.** Design tokens (brand colours, fonts, shadows) live in
  `app/globals.css` under a Tailwind v4 `@theme` block. Pages compose shared
  building blocks from `components/dashboard/page-kit.tsx` rather than restyling from
  scratch. See the [Frontend guide](frontend.md).
- **Theming.** Dark mode is class-based (`.dark` on `<html>`) with a Light/Dark/System
  toggle, applied before first paint to avoid a flash.
- **Internationalisation.** The *public* site supports an EN/ID toggle via
  `language-context` and `lib/translations.ts`. The *dashboard* UI is English only.

## Data & formatting conventions

- Dates and numbers in the dashboard are formatted with the `en-NZ` locale.
- API list responses follow `{ <resourceKey>, pagination: { page, limit, total, totalPages } }`.
- Prisma exposes some relations capitalised (`User`, `Division`, `Event`); the
  frontend accepts both capitalised and lowercase spellings defensively.

## Technology summary

| Concern | Choice |
| --- | --- |
| Frontend framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens), custom UI kit |
| Rich text / CMS | TipTap editor, craft.js + dnd-kit for the page builder |
| HTTP client | Axios |
| Backend framework | Express |
| ORM / database | Prisma / PostgreSQL |
| Auth | Custom JWT (`jsonwebtoken`, `bcryptjs`) |
| E-mail | Mailtrap HTTP API |
| Uploads | Multer (local disk under `api/uploads`) |
