# Frontend guide

The web app is Next.js 16 (App Router) with React 19 and Tailwind CSS v4. This guide
covers how the dashboard is structured, how roles shape navigation, and the shared
design system pages are built from.

## Route map

```
/                      Public homepage (CMS-driven sections)
/about, /activities,   Public marketing pages
/contact, /opportunities
/pemira, /pemira/[id]  Public election pages
/login, /register      Auth
/forgot-password, /reset-password, /verify-email
/registration-pending  Shown after signup, before approval

/dashboard             Member dashboard home
/dashboard/articles    Browse articles (+ /[slug])
/dashboard/events      Browse events (+ /[slug])
/dashboard/research    Browse research (+ /[slug])
/dashboard/pemira      Member election view
/dashboard/profile     Profile, member card, event history

/dashboard/admin       Admin home
/dashboard/admin/*     Admin tools (see below)
```

## The dashboard shell

Every dashboard route is wrapped by `DashboardShell`
(`components/dashboard/dashboard-shell.tsx`), which provides:

- **Top navigation** generated from `nav-config.ts`, filtered by the signed-in role.
- **Command palette** (⌘K / Ctrl+K) for jumping to any page or searching content.
- **Notifications** derived from real data (pending members, recent comments,
  upcoming events, the viewer's own membership status).
- **Theme toggle** (light / dark / system).
- **User menu** with profile, an admin↔member view switch (for admins), and sign out.

`DashboardChrome` is a thin alias kept for backwards compatibility; new code uses
`DashboardShell`.

## Roles and navigation

Navigation is data-driven in `components/dashboard/nav-config.ts`. Each item declares
the roles allowed to see it, and the shell filters accordingly. The real role strings
are `MEMBER`, `BOARD`, `SUPER_ADMIN`.

- **Member nav:** Dashboard, Articles, Events, Research, PEMIRA, My profile.
- **Admin nav (BOARD + SUPER_ADMIN):** Dashboard, Analytics, and the Content group —
  Articles, Events, Research, Comments, Media, Tags — plus Site pages (Homepage,
  Pages).
- **Admin nav (SUPER_ADMIN only):** the Community group (Members, Divisions, Event
  registrations, PEMIRA) and the System group (Newsletter, Menus & theme, Search,
  Audit log, Settings).

Hiding a nav item is only cosmetic — the API enforces the same rules, so a `BOARD`
user who navigates directly to a SUPER_ADMIN page sees an "Access denied" screen and
no request succeeds.

## Design system

Design tokens live in `web/src/app/globals.css` inside a Tailwind v4 `@theme` block:
brand colours (navy `#0D1B33`, red `#E8231A`), the `primary`/`success`/`warning`/
`danger` colour ramps, slate neutrals, fonts, shadows, and radii.

Fonts are loaded with `next/font` (Inter for body, Poppins for display) and exposed as
`--font-inter` / `--font-poppins`; `--font-sans` and `--font-display` point at them so
body text and headings are consistent everywhere.

### Page building blocks

Dashboard pages compose shared primitives from
`components/dashboard/page-kit.tsx` instead of restyling markup. The main ones:

| Component | Use |
| --- | --- |
| `PageStack`, `PageHeading`, `PageHero` | Page scaffold and headers |
| `SectionCard`, `SectionHeading` | Card surfaces and section titles |
| `Toolbar`, `SearchField`, `FilterSelect`, `ResetFiltersButton` | Filter bars |
| `TableShell`, `Th`, `Td`, `Tr`, `RowActions`, `IconAction` | Data tables |
| `StatTile`, `StatTileRow` | Metric tiles that double as status filters |
| `KpiCard`, `KpiGrid` | KPI summaries (with sparkline) |
| `Sparkline`, `BarChart`, `DonutChart` | Dependency-free inline SVG charts |
| `EmptyBlock`, `LoadingRows`, `LoadingCards`, `PageLoading`, `ListPageSkeleton` | Empty and loading states |
| `AccessDenied` | Role-gated fallback |
| `Field`, `FormGrid`, `FormActions` | Forms |
| `DetailItem` | Label/value pairs on detail pages |

General-purpose primitives (Button, Modal, Table, Badge, Avatar, Input, Select,
Toggle, Pagination, etc.) live in `components/ui`.

## Theming (dark mode)

Dark mode is class-based: a `.dark` class on `<html>` toggles the palette. The choice
(Light / Dark / System) is stored in `localStorage` and applied by an inline script in
the root layout *before* first paint, so there is no flash. Components use Tailwind
`dark:` variants. See `lib/theme-context.tsx`.

## Internationalisation

Two separate concerns:

- **Public site:** supports an English/Indonesian toggle for visitors via
  `lib/language-context.tsx` and `lib/translations.ts`. Homepage and page content can
  carry Indonesian variants.
- **Dashboard UI:** English only. Dates and numbers use the `en-NZ` locale.

## Data access

All API calls go through the singleton Axios client in `web/src/lib/api.ts`. It:

- reads the JWT from `localStorage` and attaches it as a `Bearer` token,
- redirects to `/login` on a `401`,
- normalises errors into a consistent `{ success, message, status }` shape.

Auth state (current user, login/logout, hydration on load) is provided by
`lib/auth-context.tsx` via the `useAuth()` hook.

## Conventions for new dashboard pages

1. Wrap the page in `PageStack` and open with `PageHeading` (or `PageHero`).
2. Use `page-kit` primitives; do not hand-roll cards, tables, or empty states.
3. Gate the page by role: check `useAuth().user.role` and render `AccessDenied` when
   the role is not allowed. Do not rely on hidden nav alone.
4. Format dates/numbers with the `en-NZ` helpers in `lib/utils.ts`.
5. Keep UI copy in English, sentence case.
6. Support dark mode with `dark:` variants (the kit already does).
