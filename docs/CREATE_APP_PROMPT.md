# PROMPT RECREATE — PPIA Auckland (LandingPage)

> **Cara pakai:** Salin seluruh isi file ini (mulai dari `# ROLE & TUJUAN` sampai akhir) ke sesi AI/Claude baru, lalu minta AI tersebut membangun ulang aplikasi dari nol. Prompt ini sudah komprehensif — mencakup stack, arsitektur, data model, fitur publik, member dashboard, admin dashboard, CMS, PEMIRA, design system, deployment, dan perintah setup.

---

# ROLE & TUJUAN

Kamu adalah **full-stack engineer senior** yang ditugaskan membangun **PPIA Auckland Platform**  — sebuah monorepo berisi website publik + CMS + dashboard member + dashboard admin untuk **Perhimpunan Pelajar Indonesia Auckland** (asosiasi pelajar Indonesia di Auckland, Selandia Baru). Bangun sebagai aplikasi produksi yang siap di-deploy, bukan prototype. Gunakan best practice, type-safety end-to-end, dan gunakan semua fitur yang tercantum di bawah ini.

# NAMA & IDENTITAS

- **Nama aplikasi:** `ppia-auckland`
- **Organisasi:** PPIA Auckland — Perhimpunan Pelajar Indonesia Auckland
- **Domain default (dev):** API `http://localhost:4000`, Web `http://localhost:3001`
- **Email default:** `no-reply@ppiaauckland.org`
- **Tagline singkat:** "Indonesian Students' Association in Auckland, New Zealand"

# DELIVERABLE YANG DIHARAPKAN

Sebuah monorepo bernama `LandingPage/` dengan struktur:

```
LandingPage/
├── api/                 # Express + Prisma backend (TypeScript)
├── web/                 # Next.js 16 frontend (App Router, TypeScript)
├── docs/                # Dokumentasi (Markdown)
├── package.json         # Workspace root (concurrently scripts)
├── README.md
└── .gitignore
```

Semua kode harus dijalankan dengan `npm run dev` dari root dan membuka web di `http://localhost:3001` serta API di `http://localhost:4000`.

---

# 1. ARSITEKTUR TINGKAT TINGGI

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

**Prinsip kunci:**
- Dua aplikasi independen dalam satu repo. Tidak ada coupling server-to-server selain HTTP.
- `web/` **tidak pernah** pegang credential database — semua data lewat `web/src/lib/api.ts` (Axios singleton).
- `api/` stateless, Prisma jadi single-owner database.
- Backend pakai JWT (Bearer). Tidak ada session store di server.
- Authorization data (role, division, deletion, approval) di-refresh dari DB di setiap request, sehingga perubahan segera berlaku tanpa logout.

# 2. TECH STACK 

## Backend (`api/`)
- **Runtime:** Node.js 22+ (WAJIB, lihat catatan di bawah).
- **Framework:** Express 5 (`express@^5.2.1`).
- **Bahasa:** TypeScript 5 (`tsx` untuk dev, `tsc` untuk build).
- **ORM:** Prisma 5 (`@prisma/client`, `prisma`).
- **Database:** PostgreSQL 14+.
- **Auth:** `jsonwebtoken@^9.0.3`, `bcryptjs@^3.0.3`.
- **Upload:** `multer@^2.2.0`.
- **CORS:** `cors@^2.8.6`.
- **Env:** `dotenv@^17.4.2`.
- **Supabase (opsional):** `@supabase/supabase-js@^2.111.0` (untuk DATA_SOURCE=supabase).

**Catatan penting untuk jsdom dependency tree:**
- Jika sewaktu-waktu dependensi `isomorphic-dompurify` dipasang di web dan menarik `jsdom@27`, pin override `jsdom: "^26.1.0"` di `package.json` `overrides`. Versi 27 menarik `html-encoding-sniffer@6` → `@exodus/bytes` (ESM-only) yang gagal di Node < 22.12.
- Wajib `engines.node: ">=22.0.0"`.

## Frontend (`web/`)
- **Framework:** Next.js 16.2.12 (App Router) — BACA `node_modules/next/dist/docs/` dulu, banyak breaking changes dari training data.
- **UI:** React 19.2.4, React DOM 19.2.4.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss@^4`) dengan `@theme` di `globals.css`.
- **HTTP:** Axios 1.18.
- **Bahasa:** TypeScript 5.
- **Editor kaya (CMS):** TipTap (`@tiptap/react`, `@tiptap/starter-kit`, extension color/image/link/text-align/text-style/underline).
- **Page builder:** `@craftjs/core` + `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`.
- **Animasi:** `framer-motion@^12.42.2`.
- **Sanitasi HTML:** `isomorphic-dompurify@^2.28.0` (lihat catatan jsdom di atas).
- **Util:** `clsx`, `date-fns@^4`, `lucide-react@^1.25.0`, `qrcode.react@^4.2.0`, `react-day-picker@^10`, `sharp@^0.35.3`.

## Dev dependencies penting (web)
- `eslint@^9`, `eslint-config-next@16.2.10`.
- `tsx@4.23.0` (untuk test runner).
- `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`.
- `babel-plugin-react-compiler@^1.0.0`.
- `@next/bundle-analyzer@^16.2.10`.

# 3. SKEMA DATABASE (PRISMA)

File `api/prisma/schema.prisma`. Pakai generator `prisma-client-js`, datasource `postgresql`, env `DATABASE_URL` + `directUrl` env `DIRECT_URL`. Implementasikan **tepat** semua model di bawah ini.

## Model-model

### User
- Field: id (cuid), email (unique), password (bcrypt), username (unique), name, role (`SUPER_ADMIN|BOARD|MEMBER`, default MEMBER), position (`PRESIDENT|VICE_PRESIDENT|SECRETARY|TREASURER|COORDINATOR|MEMBER`), divisionId, avatar, personalEmail (unique), firstName, lastName, phone, studentId, university, universityEmail (unique), upi, degree (`BACHELOR|MASTER|DOCTORATE|NON_DEGREE`), major, graduationDate, funding (`LPDP|SELF_FUNDED|SCHOLARSHIP|OTHER`), loaCoe, consent, confirmation, bio, instagram, linkedIn, twitter, isVerified, memberCardUrl, resetToken + resetTokenExpiry, verificationToken + verificationExpiry, membershipStatus (`PENDING|APPROVED|REJECTED`, default APPROVED), approvedAt, approvedBy, rejectionReason, createdAt, updatedAt.
- Relasi: Article (author), AuditLog, Bookmark, Notification, Comment, Division (coordinator + division), Event (author), EventRegistration, Page (author), Research (mainAuthor), ResearchDownload, candidates, votes, electionsCreated.
- **Tidak pernah** return password lewat API — gunakan `api/src/lib/user-select.ts` untuk safe select.

### Article
- id, title, slug (unique), excerpt, content (Json — untuk TipTap JSON), imageUrl, divisionId, published (bool), createdAt, updatedAt, authorId, category (default "News"), likes, scheduledPublishAt, scheduledUnpublishAt, views, isFeatured, featuredOrder, readingTime, metaTitle, metaDescription, metaKeywords.
- Relasi: User (author), Division, Comment[], Bookmark[], Tag[] (ArticleTags).

### Bookmark (table sendiri)
- id, userId, articleId, createdAt.
- `@@unique([userId, articleId])`, `@@index([userId, createdAt])`.
- Justifikasi: save-time harus tercatat & daftar baca diurutkan berdasarkan waktu simpan.

### Notification
- id, userId, type (`COMMENT_REPLY|ARTICLE_PUBLISHED|EVENT_REMINDER|EVENT_REGISTRATION|MEMBERSHIP_APPROVED|MEMBERSHIP_REJECTED|SYSTEM`), title, body?, link?, readAt?, createdAt.
- `readAt` nullable date = flag sekaligus timestamp.
- Index `[userId, readAt]` dan `[userId, createdAt]`.

### AuditLog
- id, userId?, action, entity, entityId, details (Json?), ipAddress?, userAgent?, createdAt.

### Candidate
- id, electionId, userId, vision (Text), mission (Text), experience?, program?, slogan?, posterUrl?, status (`PENDING|APPROVED|REJECTED|WITHDRAWN`, default PENDING), approvedAt?, approvedBy?, rejectionReason?, timestamps.
- `@@unique([electionId, userId])`, `@@index([status])`.

### Comment
- id, content, articleId?, researchId?, userId?, userName, userEmail, parentId? (self-relation), createdAt, updatedAt, isHidden.
- Relasi: Article, Research, User (nullable — comment publik tanpa akun), parent/replies (CommentToComment).

### Division
- id, name, slug (unique), description?, color?, order, isActive, createdAt, updatedAt, coordinatorId (unique, nullable).
- Relasi: Article[], Event[], Research[], User (members), User (coordinator).

### Election
- id, title, description?, registrationStart, registrationEnd, campaignStart, campaignEnd, votingStart, votingEnd, status (`UPCOMING|REGISTRATION|CAMPAIGN|VOTING|CLOSED|PUBLISHED`), createdBy, timestamps.
- Index `[status]`, `[votingStart]`.
- Relasi: Candidate[], Vote[], creator.

### Event
- id, title, slug (unique), description, content (Json?), imageUrl?, startDate, endDate?, location?, locationMapUrl? (Google Maps embed), divisionId?, published, timestamps, authorId, capacity?, isFree, registrationDeadline?, registrationFields (Json? — array `{id,type,label,required,options?,prefill?}`), scheduledPublishAt?, scheduledUnpublishAt?.
- Relasi: User (author), Division, EventDocumentation[], EventRegistration[].

### EventDocumentation
- id, eventId, type (`PHOTO|VIDEO|LINK`), url, title?, description?, timestamps.

### EventRegistration
- id, eventId, userId? (null = guest), guestName?, guestEmail?, status (`REGISTERED|CANCELLED|WAITLISTED|ATTENDED|NO_SHOW`, default REGISTERED), responses (Json?), registeredAt, checkedInAt?.
- `@@unique([eventId, userId])` — Postgres NULL distinct, jadi guest tidak terikat; guest di-de-dup by email.
- `@@index([eventId, guestEmail])`.

### Media
- id, filename, url, mimetype, size, createdAt, altText?, folder?.

### NewsletterSubscriber
- id, email (unique), name?, isActive, subscribedAt, unsubscribedAt?.

### Page (CMS page)
- id, title, slug (unique), content (Json — legacy), excerpt?, metaTitle?, metaDescription?, featuredImage?, pageType (`standard|landing|custom`, default standard), template (`default|landing|cabinet|timeline|event_list|division_grid`, default default), published, authorId, timestamps.
- Relasi: User, PageBlock[].

### PageBlock
- id, pageId, type (BlockType, lihat enum), title?, titleId? (Indonesian), subtitle?, subtitleId?, content?, contentId? (Indonesian HTML), linkUrl?, linkText?, linkTextId?, imageUrl?, iconName? (Lucide), color? (hex), order, config (Json?), enabled, timestamps.
- Index `[pageId, order]`.

### LandingSection & SectionBlock
- LandingSection: id, key (unique — `hero|about|video|events|articles|membership|...`), title?, titleId?, subtitle?, subtitleId?, description?, descriptionId?, enabled, order, config (Json?), timestamps.
- SectionBlock: sama dengan PageBlock tapi milik LandingSection.
- Ini dipakai untuk homepage CMS.

### MenuItem & SiteConfig
- MenuItem: key (unique — `header_main|header_right|footer_about|footer_activities|footer_quicklinks`), items (Json — array menu dengan hierarki), enabled.
- SiteConfig: key (unique — `header|footer|social`), config (Json).

### Research
- id, title, titleIndonesian?, slug (unique), abstract, abstractIndonesian?, researchType (`ACADEMIC_PAPER|THESIS|DISSERTATION|RESEARCH_PROJECT|PUBLICATION|CONFERENCE_PAPER|JOURNAL_ARTICLE`), researchStatus (`DRAFT|PENDING_REVIEW|UNDER_REVIEW|APPROVED|REJECTED|PUBLISHED`), authors, mainAuthorId?, publicationDate?, venue?, venueDate?, volume?, issue?, pages?, doi?, issn?, isbn?, url?, keywords?, citationFormat?, citationText?, generatedCitation?, pdfUrl?, pdfSize?, imageUrl?, supplementalFiles (Json?), divisionId?, downloadCount, viewCount, citationsCount, published, featuredOrder?, metaTitle?, metaDescription?, metaKeywords?, scheduledPublishAt?, reviewedBy?, reviewedAt?, reviewComments?, timestamps.
- Relasi: Division, mainAuthor (User), Comment[], ResearchDownload[], Tag[] (ResearchTags).

### ResearchDownload
- id, researchId, userId?, ipAddress?, userAgent?, downloadedAt.
- Index `[researchId]`, `[userId]`.

### Setting
- key (String, primary key), value (String), updatedAt.

### Tag
- id, name (unique), slug (unique), color?, description?, timestamps.
- Relasi: Article[] (ArticleTags), Research[] (ResearchTags).

### Vote
- id, electionId, candidateId, voterId, votedAt.
- `@@unique([electionId, voterId])` — satu suara per voter per election.
- Index `[electionId]`, `[candidateId]`.

### Faq
- id (auto-increment Int), question, answer, category?, order, published (default true), timestamps.

### Enum BlockType (WAJIB lengkap)
`TEXT | IMAGE | VIDEO | CTA_BUTTON | STATISTIC | FEATURE | ARTICLE_CARD | EVENT_CARD | MEMBER_CARD | SOCIAL_LINK | NEWSLETTER_FORM | HERO | GALLERY | DIVIDER | SPACER | CODE | QUOTE | HEADING | COLUMNS | TIMELINE | TEAM | TABLE | CONTACT | COUNTDOWN | SPONSOR | FAQ | MAP`

### Enum lain
- `Role`: SUPER_ADMIN, BOARD, MEMBER.
- `MembershipStatus`: PENDING, APPROVED, REJECTED.
- `RegistrationStatus`: REGISTERED, CANCELLED, WAITLISTED, ATTENDED, NO_SHOW.
- `ElectionStatus`: UPCOMING, REGISTRATION, CAMPAIGN, VOTING, CLOSED, PUBLISHED.
- `CandidateStatus`: PENDING, APPROVED, REJECTED, WITHDRAWN.
- `ResearchStatus`: DRAFT, PENDING_REVIEW, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED.
- `ResearchType`: ACADEMIC_PAPER, THESIS, DISSERTATION, RESEARCH_PROJECT, PUBLICATION, CONFERENCE_PAPER, JOURNAL_ARTICLE.
- `Position`: PRESIDENT, VICE_PRESIDENT, SECRETARY, TREASURER, COORDINATOR, MEMBER.
- `Degree`: BACHELOR, MASTER, DOCTORATE, NON_DEGREE.
- `Funding`: LPDP, SELF_FUNDED, SCHOLARSHIP, OTHER.
- `DocumentationType`: PHOTO, VIDEO, LINK.
- `NotificationType`: COMMENT_REPLY, ARTICLE_PUBLISHED, EVENT_REMINDER, EVENT_REGISTRATION, MEMBERSHIP_APPROVED, MEMBERSHIP_REJECTED, SYSTEM.
- `VerificationStatus`: UNVERIFIED, VERIFIED, PENDING.

## Lifecycle membership
```
register ──▶ PENDING ──approve──▶ APPROVED ──▶ full member access
                │
                └──reject──▶ REJECTED  (rejection reason stored)
```
- Visitor register → `role=MEMBER`, `membershipStatus=PENDING`, **tidak** return token.
- SUPER_ADMIN review di `/dashboard/admin/members`, approve/reject.
- Approve → kirim email (welcome) + link WhatsApp group jika dikonfigurasi.
- Reject → simpan alasan opsional.

## Lifecycle Election (PEMIRA)
Diturunkan dari timestamp (`registrationStart/End`, `campaignStart/End`, `votingStart/End`) lewat `api/src/lib/electionState.ts`:
```
UPCOMING ──▶ REGISTRATION ──▶ CAMPAIGN ──▶ VOTING ──▶ CLOSED ──▶ PUBLISHED
```
- REGISTRATION: member daftar kandidat (vision, mission, dst); SUPER_ADMIN approve/reject.
- VOTING: approved member cast 1 Vote (unik per [election, voter]).
- PUBLISHED: hasil dipublish.

---

# 4. STRUKTUR BACKEND (`api/`)

```
api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed-landing-sections.ts
│   ├── seed-all-pages.ts
│   ├── cleanup-template-page-blocks.ts
│   ├── verify-page-content-contract.ts
│   ├── audit-public-content-contract.ts
│   ├── repair-*.ts, backfill-*.ts, apply-cabinet-structure.ts, wiki-ppia-content.ts
│   └── page-content.ts
├── scripts/
│   ├── prisma.ts          # wrapper dengan DATA_SOURCE resolver
│   ├── prisma-all.ts
│   └── send-test-email.ts
├── src/
│   ├── index.ts          # bootstrap
│   ├── routes/           # 28 router file (satu per resource)
│   ├── controllers/      # 27 controller
│   ├── middleware/
│   │   ├── auth.ts                # authenticate (verify JWT) + authorize(...roles)
│   │   ├── rate-limit.ts          # throttling by client IP
│   │   ├── security-headers.ts    # header keamanan di setiap response
│   │   └── public-cache.ts        # Cache-Control untuk GET publik
│   └── lib/
│       ├── prisma.ts              # shared PrismaClient singleton
│       ├── mailer.ts              # Mailtrap HTTP API (jika token kosong → console log)
│       ├── auth.ts                # token + password helpers
│       ├── user-select.ts         # safe field selections
│       ├── electionState.ts       # derives PEMIRA phase from timestamps
│       ├── ics.ts                 # calendar (.ics) generation
│       ├── data-source.ts         # resolver DATA_SOURCE (local|supabase)
│       ├── storage.ts             # storage driver (local|supabase)
│       ├── settings.ts
│       ├── notify.ts              # create notifications
│       ├── view-tracking.ts
│       ├── maps.ts
│       ├── checkin-code.ts        # generate 6-char code
│       ├── event-registration.ts  # register logic
│       ├── newsletter-token.ts    # signed unsubscribe token
│       └── page-content-mode.ts
└── uploads/, storage/private/   # gitignore, dibuat runtime
```

## Request flow
1. `securityHeaders` jalan duluan — bahkan error response & static file kena header.
2. CORS dicek terhadap allow-list (`FRONTEND_URL`, `CORS_ORIGINS`, dan localhost 3000/3001 untuk dev).
3. Body parser, lalu route match.
4. Protected route → `authenticate` (verifikasi Bearer JWT, set `req.user`) → `authorize('SUPER_ADMIN', ...)` cek role.
5. Controller jalankan, Prisma untuk data, return JSON.

## Auth & Authorization (DUA LAPIS)
- **JWT stateless** — login menandatangani token berisi user id + role. Browser simpan & kirim `Authorization: Bearer <token>` tiap request.
- **Layer 1**: middleware `authorize(...)` di route.
- **Layer 2**: controller re-cek role & ownership.
- Content routes (articles, events, research, media, comments, tags, pages): `SUPER_ADMIN` atau `BOARD`.
- Lainnya (members, divisions, registrations, newsletter, elections, audit, search, settings): `SUPER_ADMIN` only.
- `membershipStatus` gate akses fitur member terpisah dari role.

## Uploads
- Tulis di `api/uploads/`, serve statis di `/uploads` dengan `X-Content-Type-Options: nosniff`.
- PDF dikirim `Content-Disposition: attachment` (anti inline render di origin API).
- Endpoint: `/api/upload` (🔑 untuk image, public untuk document registrasi PDF).
- Documents privat di `api/storage/private/` (di luar static dir) — diakses via signed link HMAC short-lived dari `GET /api/members/:id/document`, dilayani via `GET /api/private-files/...`.

## E-mail
- Lewat Mailtrap HTTP API (`lib/mailer.ts`).
- Jika `MAILTRAP_TOKEN` kosong → log ke console (dev tetap jalan tanpa credential).

## Response shape & cache
- List endpoint: `{ <resourceKey>, pagination: { page, limit, total, totalPages } }`. (Beberapa endpoint lama pakai `pages` untuk backward compat.)
- Error: `{ "error": "message" }` dengan HTTP status sesuai.
- Public GET pada allowlist → `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- Auth/admin/member-specific → **tidak pernah** shared-cache.

## Konvensi
- **Safe selects** lewat `api/src/lib/user-select.ts` — tidak pernah bocorkan password hash.
- **Relation casing** — Prisma mengekspos relasi dengan kapital (`User`, `Division`, `Event`, `mainAuthor`). Frontend baca kapital & lowercase sama-sama (defensif).
- **Migrations** — semua perubahan schema dilacak di `api/prisma/migrations`. Dev pakai `npm run db:migrate`.

---

# 5. DAFTAR ENDPOINT API (WAJIB DIIMPLEMENTASI)

Semua di-mount di bawah `/api`. Base URL dev: `http://localhost:4000/api`. Health check: `GET /health`.

**Auth legend:** — (publik), 🔑 (user login), 🛡️ (SUPER_ADMIN atau BOARD), 🔒 (SUPER_ADMIN only).

## Auth — `/api/auth`
- POST `/register` — buat akun baru (status PENDING, tanpa token).
- POST `/login` — sign in, return JWT + user.
- POST `/forgot-password` — kirim email reset password.
- POST `/reset-password` — reset dengan token.
- POST `/verify-email` — verifikasi email dengan token.
- POST `/resend-verification` — kirim ulang.
- GET `/me` 🔑 — current user dari DB.
- GET `/profile` 🔑 — full profile.
- PUT `/profile` 🔑 — update profile sendiri.

## Users — `/api/users`
- GET `/username/:username` — public profile by username (safe fields).

## Members — `/api/members`
- GET `/stats` — public membership counts.
- GET `/directory` 🔑 — member directory.
- GET `/` 🔒 — list members (search, role, status filter).
- GET `/:id` 🔑 — member detail (own, atau any untuk admin).
- PUT `/:id` 🔒 — update role/position/division.
- PATCH `/:id/approve` 🔒 — approve pending.
- PATCH `/:id/reject` 🔒 — reject (optional reason).
- DELETE `/:id` 🔒 — delete member.

## Events — `/api/events`
- GET `/` — published events.
- GET `/slug/:slug` — by slug.
- GET `/slug/:slug/calendar.ics` — single event .ics.
- GET `/calendar.ics` — all events .ics.
- GET `/admin/all` 🛡️ — all events (termasuk draft).
- GET `/:id` — by id.
- POST `/` 🛡️ — create.
- PUT `/:id` 🛡️ — update.
- DELETE `/:id` 🛡️ — delete.

## Event registrations — `/api/event-registration`
- POST `/` 🔑 — register current member.
- GET `/my` 🔑 — current member's registrations.
- DELETE `/:registrationId` 🔑 — cancel own.
- GET `/event/:eventId` 🔒 — attendees list.
- POST `/event/:eventId/checkin-by-code` 🔒 — check-in pakai kode 6-char.
- PATCH `/:registrationId/checkin` 🔒 — mark checked in.
- PATCH `/:registrationId/status` 🔒 — update status.

## Event documentation — `/api/event-documentation`
- GET `/public/:slug` — gallery items published event.
- GET `/event/:eventId` 🔑 — admin documentation list.
- POST `/` 🛡️ — add photo/video/link.
- PUT `/:id` 🛡️ — update.
- DELETE `/:id` 🛡️ — delete.

## Articles — `/api/articles`
- GET `/` — published.
- GET `/slug/:slug` — by slug.
- GET `/admin/all` 🛡️ — all (termasuk draft).
- GET `/:id` — by id.
- POST `/` 🛡️ — create.
- PUT `/:id` 🛡️ — update.
- DELETE `/:id` 🛡️ — delete.

## Research — `/api/research`
- GET `/` — published.
- GET `/slug/:slug` — by slug.
- GET `/:id` — published by id.
- GET `/admin/all` 🛡️ — all (draft + in-review).
- GET `/admin/:id` 🛡️ — any by id, tanpa increment views.
- POST `/` 🛡️ — create.
- PUT `/:id` 🛡️ — update.
- DELETE `/:id` 🛡️ — delete.

## Comments — `/api/comments`
- GET `/article/:articleId` — visible threads (page, limit; default 20, max 50).
- GET `/research/:researchId` — sama.
- POST `/public` — post public comment.
- POST `/` 🔑 — post sebagai signed-in user.
- GET `/` 🛡️ — moderation list.
- GET `/stats` 🛡️ — stats.
- PATCH `/:id/visibility` 🛡️ — show/hide.
- DELETE `/:id` 🛡️ — delete.

## Tags — `/api/tags`
Read publik (`GET /`, `/:id`, `/slug/:slug`); create/update/delete 🛡️.

## Media — `/api/media`
- GET `/` 🛡️ — paginated (`folder`, `search`, `page`, `limit`; max 100).
- PATCH `/:id` 🛡️ — alt text/folder.
- DELETE `/:id` 🛡️ — delete file.

## Uploads — `/api/upload`
- POST `/` 🔑 — image upload, return URL.
- POST `/document` — PDF registration document (signup).

## Divisions — `/api/divisions`
Read publik; create/update/delete 🔒.

## Pages & blocks — `/api/pages`
Public reads (`/`, `/slug/*slug`, `/:id`); admin reads + writes (termasuk block create/update/delete/reorder) 🛡️.

## Homepage — `/api/landing-sections`, `/api/blocks`
Public read; admin write.

## Menus & site config — `/api/menus`
Public read; write 🔒.

## Settings — `/api/settings`
- GET `/` — public (org, contact, branding, flags). **Tidak pernah** include WhatsApp invite.
- GET `/member` 🔑 — member-only (WhatsApp group invite).
- GET `/all` 🔒 — all.
- PUT `/` 🔒 — update.
- `maintenanceMode=true` → maintenance page HTTP 503 untuk public, login/admin tetap.
- `allowPublicRegistration=false` → enforce di register page & POST `/api/auth/register`.

## Newsletter — `/api/newsletter`
- POST `/subscribe` — subscribe email.
- POST `/unsubscribe` — visitor-initiated.
- GET `/unsubscribe?email=…&token=…` — signed one-click link.
- GET `/subscribers` 🔒 — list.
- POST `/send` 🔒 — deliver per-recipient (max 500/request).

## Search — `/api/search`
- GET `/` — global across events, articles, members.

## Elections (PEMIRA) — `/api/elections`, `/api/candidates`, `/api/votes`
- GET `/elections` — list.
- GET `/elections/active` — currently active.
- GET `/elections/:id` — detail.
- GET `/elections/:id/results` — results.
- POST `/elections` 🔒 — create.
- PATCH `/elections/:id` 🔒 — update.
- DELETE `/elections/:id` 🔒 — delete.
- GET `/elections/:id/voters` 🔒 — voter audit.
- GET `/elections/:id/candidates` — candidates.
- POST `/elections/:id/candidates` 🔑 — register as candidate.
- PATCH `/candidates/:id/approve` 🔒 — approve.
- PATCH `/candidates/:id/reject` 🔒 — reject (reason required).
- DELETE `/candidates/:id` 🔑 — withdraw own.
- POST `/elections/:id/vote` 🔑 — cast vote.
- GET `/elections/:id/my-vote` 🔑 — my vote.

## Analytics — `/api/analytics`
- GET `/articles` — article analytics.
- GET `/research` — research analytics.
- GET `/dashboard` 🛡️ — admin dashboard metrics.
- GET `/engagement` 🛡️ — engagement over time.
- POST `/download/:researchId` — record research download.
- GET `/downloads/:researchId` 🛡️ — download analytics.

## Audit logs — `/api/audit-logs`
- GET `/` 🔒 — list (`entity`, `action`, `page`, `limit`; max 100).
- GET `/entity/:entity/:entityId` 🔒 — per-entity audit trail.

## Bookmarks — `/api/bookmarks`
- GET `/ids` 🔑 — current member bookmark IDs.
- GET `/` 🔑 — bookmarked articles.
- POST `/:articleId` 🔑 — bookmark.
- DELETE `/:articleId` 🔑 — remove.

## Notifications — `/api/notifications`
- GET `/` 🔑 — current member recent notifications + unread count.
- POST `/read-all` 🔑 — mark all read.
- PATCH `/:id/read` 🔑 — mark one read.
- DELETE `/:id` 🔑 — delete.
- **Tidak ada** public create — dibuat internal oleh aksi aplikasi.

## FAQs — `/api/faq`
Read publik (`GET /`, `/:id`); create/update/delete 🛡️.

---

# 6. STRUKTUR FRONTEND (`web/`)

```
web/
├── public/                       # favicon, robots, OG images
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root providers (theme, language, auth, toast)
│   │   ├── globals.css           # Tailwind v4 @theme block (design tokens)
│   │   ├── page.tsx              # Public homepage (CMS-driven sections)
│   │   ├── error.tsx, global-error.tsx, not-found.tsx, robots.ts, sitemap.ts
│   │   ├── maintenance/
│   │   ├── about/                # /about
│   │   ├── activities/           # /activities
│   │   ├── contact/              # /contact
│   │   ├── opportunities/        # /opportunities
│   │   ├── legal/                # /legal
│   │   ├── newsletter/           # /newsletter
│   │   ├── pemira/[id]/          # public election detail
│   │   ├── login, register, forgot-password, reset-password, verify-email
│   │   ├── registration-pending  # shown after signup before approval
│   │   ├── profile/              # public profile pages
│   │   ├── [...slug]/            # dynamic CMS-driven pages
│   │   ├── api/                  # Next.js API routes (jika ada)
│   │   └── dashboard/
│   │       ├── page.tsx          # member dashboard home
│   │       ├── articles/         # browse + /[slug]
│   │       ├── events/           # browse + /[slug]
│   │       ├── research/         # browse + /[slug]
│   │       ├── pemira/           # member election view
│   │       ├── profile/          # own profile, member card, history
│   │       └── admin/            # /admin/*
│   ├── components/
│   │   ├── ui/                   # Button, Modal, Table, Badge, Avatar, Input, Select, Toggle, Pagination, dll
│   │   ├── dashboard/            # shell, nav-config, page-kit, KPI cards, charts
│   │   ├── sections/             # public homepage sections
│   │   ├── admin/                # admin tools per resource
│   │   ├── builder/              # CMS page builder (craft.js + dnd-kit)
│   │   ├── blocks/               # CMS block renderers
│   │   ├── pemira/               # ballot, results, timeline
│   │   ├── auth/                 # login/register forms
│   │   └── *.tsx                 # Navbar, Footer, CookieConsent, Toast, dll
│   ├── lib/
│   │   ├── api.ts                # Axios singleton — satu-satunya jalur API
│   │   ├── api-base.ts, api-types.ts, server-api.ts
│   │   ├── auth-context.tsx      # current user, login/logout, hydration
│   │   ├── theme-context.tsx     # light/dark/system
│   │   ├── language-context.tsx  # public EN/ID
│   │   ├── translations.ts       # EN/ID strings
│   │   ├── utils.ts              # cn(), en-NZ date/number helpers
│   │   ├── constants.ts
│   │   ├── services.ts
│   │   ├── sanitize-html.ts
│   │   ├── page-editor.ts, page-editor-validation.ts
│   │   ├── page-templates.ts
│   │   ├── content-schemas.ts, section-schemas.ts
│   │   ├── editable-canvas-context.tsx
│   │   ├── event-registration.ts
│   │   └── *.test.ts             # unit tests (tsx --test)
│   ├── hooks/                    # custom hooks
│   ├── middleware.ts             # Next.js middleware
│   └── types/                    # shared TS types
├── middleware.ts
├── next.config.ts
├── tailwind.config (via PostCSS v4)
├── postcss.config.mjs
├── eslint.config.mjs
└── tsconfig.json
```

## Route map
```
/                       Public homepage (CMS sections)
/about, /activities,    Public marketing pages
/contact, /opportunities
/pemira, /pemira/[id]  Public election pages
/login, /register       Auth
/forgot-password, /reset-password, /verify-email
/registration-pending   Shown after signup, before approval

/dashboard              Member dashboard home
/dashboard/articles     Browse + /[slug]
/dashboard/events       Browse + /[slug]
/dashboard/research     Browse + /[slug]
/dashboard/pemira       Member election view
/dashboard/profile      Profile, member card, history

/dashboard/admin        Admin home
/dashboard/admin/*      Admin tools
```

## DashboardShell
Setiap route dashboard dibungkus `DashboardShell` (`components/dashboard/dashboard-shell.tsx`):
- **Top nav** generated dari `nav-config.ts`, filtered by role.
- **Command palette** ⌘K / Ctrl+K untuk jump ke page atau cari content.
- **Notifications** real-data (pending members, recent comments, upcoming events, viewer status).
- **Theme toggle** (Light/Dark/System).
- **User menu** dengan profile, admin↔member view switch (untuk admin), sign out.
- `DashboardChrome` adalah alias tipis untuk backward compat; kode baru pakai `DashboardShell`.

## Role & navigation
Generated from `components/dashboard/nav-config.ts`. Setiap item deklarasi roles yang boleh lihat. Role string asli: `MEMBER`, `BOARD`, `SUPER_ADMIN`.

- **Member nav:** Dashboard, Articles, Events, Research, PEMIRA, My profile.
- **Admin nav (BOARD + SUPER_ADMIN):** Dashboard, Analytics, Content (Articles, Events, Research, Comments, Media, Tags), Site pages (Homepage, Pages).
- **Admin nav (SUPER_ADMIN only):** Community (Members, Divisions, Event registrations, PEMIRA) dan System (Newsletter, Menus & theme, Search, Audit log, Settings).

Hiding nav hanya kosmetik — API enforce rules juga. `BOARD` yang navigate langsung ke SUPER_ADMIN page dapat "Access denied".

## Design system
- Tokens di `web/src/app/globals.css` Tailwind v4 `@theme` block.
- Brand colors: navy `#0D1B33`, red `#E8231A`. Plus ramps `primary/success/warning/danger`, slate neutrals, fonts, shadows, radii.
- Fonts via `next/font` (Inter body, Poppins display) → `--font-inter`, `--font-poppins`; `--font-sans` & `--font-display` menunjuk ke mereka.

### Page-kit primitives (WAJIB dipakai dashboard pages)
| Component | Use |
| --- | --- |
| `PageStack`, `PageHeading`, `PageHero` | Page scaffold + headers |
| `SectionCard`, `SectionHeading` | Card surfaces & section titles |
| `Toolbar`, `SearchField`, `FilterSelect`, `ResetFiltersButton` | Filter bars |
| `TableShell`, `Th`, `Td`, `Tr`, `RowActions`, `IconAction` | Data tables |
| `StatTile`, `StatTileRow` | Metric tiles (bisa jadi filter status) |
| `KpiCard`, `KpiGrid` | KPI summaries (with sparkline) |
| `Sparkline`, `BarChart`, `DonutChart` | Inline SVG charts (no dependency) |
| `EmptyBlock`, `LoadingRows`, `LoadingCards`, `PageLoading`, `ListPageSkeleton` | Empty/loading states |
| `AccessDenied` | Role-gated fallback |
| `Field`, `FormGrid`, `FormActions` | Forms |
| `DetailItem` | Label/value di detail pages |

Plus primitives di `components/ui/`: Button, Modal, Table, Badge, Avatar, Input, Select, Toggle, Pagination.

## Theming
- Dark mode = class-based: `.dark` di `<html>` toggle palette.
- Pilihan (Light/Dark/System) di `localStorage` dan diterapkan oleh inline script di root layout **sebelum** first paint → tidak ada flash.
- Komponen pakai Tailwind `dark:` variants.

## i18n
- **Public site:** EN/ID toggle via `lib/language-context.tsx` + `lib/translations.ts`. Homepage & page content bisa punya varian Indonesia.
- **Dashboard UI:** English only. Dates & numbers `en-NZ`.

## Data access
Single Axios client di `web/src/lib/api.ts`:
- Baca JWT dari `localStorage` → `Authorization: Bearer`.
- Redirect ke `/login` pada 401.
- Normalisasi error ke `{ success, message, status }`.

Auth state via `lib/auth-context.tsx` + `useAuth()` hook.

## Konvensi dashboard pages baru
1. Bungkus page dengan `PageStack`, buka dengan `PageHeading`/`PageHero`.
2. Pakai `page-kit` primitives; **JANGAN** hand-roll card/table/empty state.
3. Gate by role: cek `useAuth().user.role` → render `AccessDenied` jika tak sesuai. Jangan andalkan hidden nav.
4. Format dates/numbers pakai `en-NZ` helpers di `lib/utils.ts`.
5. Copy UI English, sentence case.
6. Support dark mode dengan `dark:` variants (kit sudah handle).

---

# 7. FITUR PUBLIK (yang visitor lihat)

1. **Homepage** (`/`): CMS-driven sections (hero, about, video, events, articles, membership, dst). Setiap section dari `LandingSection` + `SectionBlock` dengan BlockType (TEXT, IMAGE, VIDEO, HERO, dll).
2. **Events listing** & **event detail** — deskripsi, lokasi (peta embed Google Maps opsional), tanggal, register button, gallery dokumentasi setelah event.
3. **Articles listing** & **article detail** — kategori, tags, like, views, comment (publik atau signed-in).
4. **Research Corner** — list + detail; unduh PDF; track download; review workflow.
5. **About / Activities / Contact / Opportunities / Legal** — CMS pages.
6. **PEMIRA** (`/pemira`, `/pemira/[id]`) — list election aktif, lihat kandidat, voting (jika login & approved), hasil setelah published.
7. **Newsletter** — subscribe form + halaman `/newsletter`.
8. **Login / Register / Forgot Password / Reset Password / Verify Email**.
9. **Public profile** (`/profile/:username`).
10. **i18n toggle EN/ID** di public site.
11. **Maintenance page** saat `maintenanceMode=true` (HTTP 503 untuk public routes).
12. **Cookie consent banner**.
13. **SEO**: `robots.ts`, `sitemap.ts`, meta tags, JSON-LD structured data.

## Fitur member (di belakang login)
- Dashboard home (ringkasan upcoming events, latest articles, notifikasi, status membership).
- Browse & bookmark articles.
- Browse events & register (form dinamis per event).
- Browse research + download tracking.
- Member card (QR code via `qrcode.react`).
- Profile management + edit.
- Notifikasi in-app.
- Participate in PEMIRA (vote, daftar kandidat saat REGISTRATION).

## Fitur admin (role-gated)
- **Dashboard admin** dengan KPI (analytics).
- **Content management:** Articles, Events, Research, Comments moderation, Media library, Tags, Pages (CMS dengan page builder craft.js + dnd-kit).
- **Homepage CMS:** Landing sections & section blocks.
- **Members management:** approve/reject pending, ubah role/division, delete.
- **Divisions** (CRUD).
- **Event registrations:** lihat attendees, check-in (by code atau manual).
- **PEMIRA management:** create/update/delete elections, approve/reject candidates, lihat voter audit.
- **Newsletter:** list subscribers, send campaign (max 500/recipient/request).
- **Search console** (analytics).
- **Menus & theme** (header/footer/social config, navigation).
- **Audit log** viewer.
- **Site settings** (org info, contact, branding, maintenance, allowPublicRegistration, WhatsApp group invite untuk member).

---

# 8. KONFIGURASI & ENV VARIABLES

## API (`api/.env`)
- `PORT` (default 4000).
- `API_URL` (default `http://localhost:4000`) — untuk absolute link di email.
- `FRONTEND_URL` (default `http://localhost:3000`) — selalu allowed CORS + email link.
- `DATA_SOURCE` (`local|supabase`) — pilih DB **dan** storage bareng.
- `LOCAL_DATABASE_URL` — saat `local`.
- `SUPABASE_DATABASE_URL` (runtime, pooled OK), `SUPABASE_DIRECT_URL` (direct untuk migrations).
- `DATABASE_URL` (fallback), `DIRECT_URL` (override migration).
- `STORAGE_DRIVER` (`local|supabase`, default infer).
- `STORAGE_LOCAL_DIR` (default process cwd).
- `JWT_SECRET` (**WAJIB**, panjang & random, beda tiap env).
- `MAILTRAP_USE_SANDBOX` (default `true`), `MAILTRAP_TOKEN`, `MAILTRAP_INBOX_ID`, `MAIL_FROM` (default `no-reply@ppiaauckland.org`), `MAIL_FROM_NAME` (default `PPIA Auckland`).
- `TRUST_PROXY` (jumlah proxy di depan), `RATE_LIMIT_DISABLED` (dev only).
- `CORS_ORIGINS` (extra origins, comma-separated).

Resolver di `api/src/lib/data-source.ts`; tulis balik ke env karena Prisma baca `env("DATABASE_URL")` dari schema. `db:*` scripts lewat sini.

## Web (`web/.env.local`)
- `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) — dipakai di build time.

## Secrets
- `JWT_SECRET` & `DATABASE_URL` wajib selalu set & privat.
- Beda `JWT_SECRET` per env (dev/staging/prod).
- `.env` & `.env.local` **tidak** di-commit. Hanya `.env.example` yang tracked.

## docker-compose.dev.yml
Postgres 16-alpine, port host 5433 (anti tabrakan dengan Postgres lokal di 5432):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ppia-postgres
    environment:
      POSTGRES_USER: ppia
      POSTGRES_PASSWORD: ppia_local_dev
      POSTGRES_DB: ppia
    ports: ['5433:5432']
    volumes: ['ppia_pgdata:/var/lib/postgresql/data']
volumes:
  ppia_pgdata:
```

---

# 9. SETUP & PERINTAH

## Root `package.json`
```json
{
  "name": "ppia-auckland",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "cd api && npm run dev",
    "dev:web": "cd web && npm run dev",
    "install:all": "npm install && cd api && npm install && cd ../web && npm install",
    "build": "cd web && npm run build",
    "start": "concurrently \"npm run start:api\" \"npm run start:web\"",
    "start:api": "cd api && npm start",
    "start:web": "cd web && npm start"
  },
  "devDependencies": { "concurrently": "^8.2.2" }
}
```

## API scripts
- `dev` → `tsx watch src/index.ts`
- `build` → `prisma generate && tsc`
- `start` → `node dist/index.js`
- `postinstall` → `prisma generate`
- `db:generate`, `db:push:all`, `db:migrate`, `db:deploy`, `db:status`, `db:studio`
- `db:seed-pages`, `db:seed-home`, `db:cleanup-template-blocks`, `db:verify-content-contract`, `db:audit-public-content`
- `mail:test`
- `typecheck`, `test` (via `node --import tsx --test "src/**/*.test.ts"`)

## Web scripts
- `dev` → `NODE_OPTIONS=--max-old-space-size=4096 next dev -p 3001`
- `build` → `next build`
- `start` → `next start -p 3001`
- `lint` → `eslint`
- `typecheck` → `tsc --noEmit`
- `test` → `node --import tsx --test "src/**/*.test.ts"`

## Quick start (urut)
1. `npm run install:all`
2. `cp api/.env.example api/.env` → set minimal `DATA_SOURCE=local`, `LOCAL_DATABASE_URL`, `JWT_SECRET`.
3. (Opsional) `docker compose -f docker-compose.dev.yml up -d`.
4. `cd api && npm run db:deploy && npm run db:generate && cd ..`
5. `npm run dev` (API :4000, web :3001).
6. Register di `/register` → buka Prisma Studio → set `role=SUPER_ADMIN`, `membershipStatus=APPROVED` → sign in → `/dashboard/admin`.

---

# 10. STANDAR KODE & KUALITAS

1. **TypeScript strict** end-to-end. Hindari `any` kecuali sangat terpaksa.
2. **Idempotent bookmark** — duplicate POST → conflict jadi no-op.
3. **Sanitasi HTML** untuk semua field CMS-authored lewat `isomorphic-dompurify`. Pakai override `jsdom: "^26.1.0"`.
4. **Pagination konsisten** — `{ <resourceKey>, pagination: { page, limit, total, totalPages } }`. Cap limit per resource (public comments max 50, media/audit max 100).
5. **JWT refresh dari DB** — authorization data di-refresh tiap authenticated request, jadi perubahan role/status langsung berlaku.
6. **Rate limiting** — pakai `TRUST_PROXY` benar, jangan trust `X-Forwarded-For` tanpa proxy.
7. **Security headers** di **setiap** response (termasuk error & static).
8. **CORS** allow-list eksplisit; localhost:3000 & localhost:3001 selalu allowed.
9. **PDF served as attachment**, `X-Content-Type-Options: nosniff` di static uploads.
10. **Private documents** SELALU di `storage/private/` (di luar static dir), hanya lewat signed link HMAC short-lived.
11. **Penamaan relasi** di Prisma kapital; frontend baca kapital & lowercase defensif.
12. **Dates/numbers** pakai `en-NZ` locale di dashboard.
13. **UI copy** English sentence case di dashboard; public site bisa EN/ID.
14. **No Dockerfiles** untuk deploy (pakai Node runtime biasa).
15. **CI**: ada `.github/workflows/ci.yml` yang build kedua package pada push ke `main`, `master`, `develop`. Web build pakai API URL yang intentionally unreachable agar SSR test empty-content fallback tanpa network eksternal.

## Catatan khusus
- `AGENTS.md` di `web/`: "This is NOT the Next.js you know. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices." → Hormati ini, Next.js 16 banyak perubahan.
- Baca `node_modules/next/dist/docs/` untuk API Next.js terbaru (routing, server actions, metadata, dsb).

---

# 11. DOKUMENTASI YANG HARUS DIBUAT

Letakkan semua di folder `docs/`:
- `README.md` (index dokumentasi).
- `getting-started.md` (prasyarat, setup, first admin).
- `architecture.md` (gambar + flow request + auth + uploads + email).
- `configuration.md` (semua env var).
- `data-model.md` (model Prisma + enums + lifecycle).
- `api-reference.md` (tabel endpoint dengan auth legend).
- `frontend.md` (route map, dashboard shell, design system, theming, i18n, konvensi).
- `deployment.md` (build, env prod, reverse proxy, storage, pre-launch checklist).

---

# 12. URUTAN PELAKSANAAN YANG DIREKOMENDASIKAN

1. **Init monorepo** — folder `LandingPage/`, root `package.json` dengan concurrently scripts, `.gitignore`, `docker-compose.dev.yml`.
2. **Backend bootstrap** — `api/package.json`, `tsconfig.json`, install deps, `src/index.ts` minimal (Express + security headers + CORS + health check).
3. **Prisma schema** lengkap dengan semua model di atas.
4. **Migration & generate** — `npm run db:deploy && npm run db:generate`.
5. **Auth core** — `lib/auth.ts`, `lib/prisma.ts`, `middleware/auth.ts`, `routes/auth.ts`, `controllers/authController.ts` (register, login, me, profile).
6. **Resource lain** — articles → events → research → comments → tags → media → uploads → divisions → members → event registration → event documentation → bookmarks → notifications → settings → newsletter → pages → landing sections → blocks → analytics → audit logs → faqs → elections → candidates → votes → menus → search.
7. **Seeder & scripts** — `seed-landing-sections.ts`, `seed-all-pages.ts`, helpers verifikasi content contract.
8. **Frontend bootstrap** — `web/package.json`, `next.config.ts`, `tailwind.config` via PostCSS v4, `globals.css` dengan `@theme`, `app/layout.tsx` (providers).
9. **Lib & contexts** — `lib/api.ts`, `auth-context`, `theme-context`, `language-context`, `translations.ts`, `utils.ts`.
10. **UI kit & page-kit** — `components/ui/*`, `components/dashboard/page-kit.tsx`.
11. **DashboardShell** + `nav-config.ts` + `DashboardShell`.
12. **Public pages** — homepage (CMS sections renderer), about, activities, contact, opportunities, legal, pemira, newsletter, login/register/forgot/reset/verify, registration-pending, profile.
13. **Member dashboard** — articles browse + detail, events browse + detail + register, research browse + detail + download, pemira (vote + candidate registration), profile + member card.
14. **Admin dashboard** — articles/events/research/comments/media/tags CRUD, pages CMS dengan craft.js page builder, landing sections editor, members management, divisions, event registrations (attendees + check-in), elections management, newsletter, search, menus & theme, audit log, settings.
15. **SEO & misc** — `robots.ts`, `sitemap.ts`, JSON-LD, cookie consent, OG images.
16. **Testing** — unit test untuk helpers (sanitize-html, theme-validation, page-editor, ics, mailer, dll).
17. **CI workflow** — `.github/workflows/ci.yml`.
18. **Docs** — tujuh file Markdown di `docs/`.

---

# 13. KRITERIA SELESAI

Aplikasi dianggap selesai jika:
- [ ] `npm run install:all` sukses dari root.
- [ ] `docker compose -f docker-compose.dev.yml up -d` + `cd api && npm run db:deploy && npm run db:generate` berhasil.
- [ ] `npm run dev` menjalankan API di :4000 dan web di :3001 tanpa error.
- [ ] Homepage render sections dari CMS.
- [ ] Register → akun `PENDING` dibuat → setelah promote ke SUPER_ADMIN + APPROVED, dashboard admin accessible.
- [ ] Semua endpoint di section 5 berfungsi dengan auth legend yang sesuai.
- [ ] Member bisa register untuk event, vote di PEMIRA (saat phase VOTING), download research.
- [ ] Admin bisa CRUD articles, events, research, pages (CMS), landing sections, members, elections.
- [ ] Public site punya EN/ID toggle, dashboard English only dengan `en-NZ` formatting.
- [ ] Dark mode toggle tanpa flash, disimpan di localStorage.
- [ ] CORS, rate limit, security headers bekerja; private documents hanya lewat signed link.
- [ ] Tests pass (`npm test` di `api/` & `web/`).
- [ ] Typecheck pass (`npm run typecheck` di kedua package).
- [ ] Lint pass (`npm run lint` di `web/`).
- [ ] Dokumentasi `docs/` lengkap.

---

# 14. CATATAN UNTUK AI YANG MENGEKSEKUSI

- Prioritaskan kebenaran & completeness daripada kecepatan. Aplikasi ini dipakai organisasi nyata.
- Kalau menemukan ambiguitas (mis. detail warna, spesifik animasi framer-motion, konfigurasi block CMS tertentu), pilih default yang masuk akal & konsisten dengan kode existing (lihat README, AGENTS.md, dan file contoh).
- Gunakan komit kecil yang logis dengan pesan descriptive (style: `change favicon`, `fix dark mode`, `update ad/art`, `fix bug`, `cek` — informal, Bahasa Indonesia/Inggris campur sesuai konteks).
- Setelah selesai, tulis README.md di root yang menjelaskan setup singkat seperti README existing, plus dokumentasi lengkap di `docs/`.
- **JANGAN** skip testing atau typecheck di akhir. Aplikasi harus `npm run typecheck && npm test && npm run lint` di kedua package tanpa error.

Semoga berhasil. Kalau ada bagian yang butuh klarifikasi, tanyakan ke user **sebelum** menulis kode, jangan menebak.
