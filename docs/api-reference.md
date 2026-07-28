# API reference

The API is an Express service. Every route is mounted under `/api` (see
`api/src/index.ts`). Responses are JSON.

- **Base URL (local):** `http://localhost:4000/api`
- **Health check:** `GET /health` (outside `/api`)
- **Auth:** send `Authorization: Bearer <token>` where required. Tokens come from
  `POST /api/auth/login`.

## Auth requirement legend

| Symbol | Meaning |
| --- | --- |
| — | Public, no authentication |
| 🔑 | Any authenticated user |
| 🛡️ | `SUPER_ADMIN` or `BOARD` (content roles) |
| 🔒 | `SUPER_ADMIN` only |

> Some handlers apply finer ownership checks (e.g. a member may edit only their own
> profile or cancel only their own registration). Where a route allows any
> authenticated user but restricts *data*, it is marked 🔑 and the constraint noted.

## Response shape

List endpoints return the resource under a named key plus pagination. Newer
endpoints use `totalPages`; media and audit-log responses retain the legacy
`pages` name for client compatibility.

```json
{
  "members": [ /* ... */ ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Public comment lists default to 20 top-level threads and accept `page`/`limit`
(`limit` is capped at 50). Media and audit lists cap `limit` at 100.

Errors return `{ "error": "message" }` with an appropriate HTTP status.

Anonymous successful GETs on the explicit public-content allowlist return
`Cache-Control: public, max-age=60, stale-while-revalidate=300`. Authenticated,
admin, and member-specific responses are never marked for shared caching.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | — | Register a new member (created `PENDING`, no token returned). |
| POST | `/login` | — | Sign in, returns a JWT and the user. |
| POST | `/forgot-password` | — | Request a password reset e-mail. |
| POST | `/reset-password` | — | Reset a password using a token. |
| POST | `/verify-email` | — | Verify an e-mail address using a token. |
| POST | `/resend-verification` | — | Resend the verification e-mail. |
| GET | `/me` | 🔑 | Current user from the database. |
| GET | `/profile` | 🔑 | Current user's full profile. |
| PUT | `/profile` | 🔑 | Update own profile. |

JWTs identify the user, but authorization data is refreshed from the database on
every authenticated request. Role, division, deletion, and approval-status changes
therefore take effect immediately rather than waiting for token expiry.

## Users — `/api/users`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/username/:username` | — | Public profile by username (safe fields only). |

## Members — `/api/members`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/stats` | — | Public membership counts. |
| GET | `/directory` | 🔑 | Member directory. |
| GET | `/` | 🔒 | List members (search, role, status filters). |
| GET | `/:id` | 🔑 | Member detail (own record, or any for admins). |
| PUT | `/:id` | 🔒 | Update role / position / division. |
| PATCH | `/:id/approve` | 🔒 | Approve a pending member. |
| PATCH | `/:id/reject` | 🔒 | Reject a pending member (optional reason). |
| DELETE | `/:id` | 🔒 | Delete a member. |

## Events — `/api/events`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | — | List published events. |
| GET | `/slug/:slug` | — | Event by slug. |
| GET | `/slug/:slug/calendar.ics` | — | Download a single event as `.ics`. |
| GET | `/calendar.ics` | — | Download all events as `.ics`. |
| GET | `/admin/all` | 🛡️ | List all events including drafts. |
| GET | `/:id` | — | Event by id. |
| POST | `/` | 🛡️ | Create an event. |
| PUT | `/:id` | 🛡️ | Update an event. |
| DELETE | `/:id` | 🛡️ | Delete an event. |

## Event registrations — `/api/event-registration`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/` | 🔑 | Register the current member for an event. |
| GET | `/my` | 🔑 | The current member's registrations. |
| DELETE | `/:registrationId` | 🔑 | Cancel own registration. |
| GET | `/event/:eventId` | 🔒 | List attendees for an event. |
| POST | `/event/:eventId/checkin-by-code` | 🔒 | Check in an attendee using their six-character code. |
| PATCH | `/:registrationId/checkin` | 🔒 | Mark an attendee checked in. |
| PATCH | `/:registrationId/status` | 🔒 | Update a registration's status. |

## Event documentation — `/api/event-documentation`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/public/:slug` | — | Gallery items for a published event. |
| GET | `/event/:eventId` | 🔑 | Event documentation for administration. |
| POST | `/` | 🛡️ | Add a photo, video, or link. |
| PUT | `/:id` | 🛡️ | Update a documentation item. |
| DELETE | `/:id` | 🛡️ | Delete a documentation item. |

## Articles — `/api/articles`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | — | List published articles. |
| GET | `/slug/:slug` | — | Article by slug. |
| GET | `/admin/all` | 🛡️ | List all articles including drafts. |
| GET | `/:id` | — | Article by id. |
| POST | `/` | 🛡️ | Create an article. |
| PUT | `/:id` | 🛡️ | Update an article. |
| DELETE | `/:id` | 🛡️ | Delete an article. |

## Research — `/api/research`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | — | List published research. |
| GET | `/slug/:slug` | — | Research by slug. |
| GET | `/:id` | — | Published research by id. |
| GET | `/admin/all` | 🛡️ | List all research including drafts and in-review. |
| GET | `/admin/:id` | 🛡️ | Any research by id, without incrementing views. |
| POST | `/` | 🛡️ | Create research. |
| PUT | `/:id` | 🛡️ | Update research. |
| DELETE | `/:id` | 🛡️ | Delete research. |

## Comments — `/api/comments`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/article/:articleId` | — | Visible article threads (`page`, `limit`; defaults 20, max 50). |
| GET | `/research/:researchId` | — | Visible research threads (`page`, `limit`; defaults 20, max 50). |
| POST | `/public` | — | Post a public comment. |
| POST | `/` | 🔑 | Post a comment as the signed-in user. |
| GET | `/` | 🛡️ | List all comments (moderation). |
| GET | `/stats` | 🛡️ | Comment statistics. |
| PATCH | `/:id/visibility` | 🛡️ | Show/hide a comment. |
| DELETE | `/:id` | 🛡️ | Delete a comment. |

## Tags — `/api/tags`

Read (`GET /`, `/:id`, `/slug/:slug`) is public; create/update/delete are 🛡️.

## Media — `/api/media`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | 🛡️ | Paginated media list (`folder`, `search`, `page`, `limit`; max 100). |
| PATCH | `/:id` | 🛡️ | Update alt text / folder. |
| DELETE | `/:id` | 🛡️ | Delete a file. |

## Uploads — `/api/upload`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/` | 🔑 | Upload an image; returns its URL. |
| POST | `/document` | — | Upload a registration document (PDF), used during signup. |

## Divisions — `/api/divisions`

Read is public; create/update/delete are 🔒.

## Pages & blocks — `/api/pages`

CMS pages. Public reads (`/`, `/slug/*slug`, `/:id`); admin reads and all writes,
including block create/update/delete/reorder, are 🛡️.

## Homepage sections — `/api/landing-sections`, blocks — `/api/blocks`

Homepage content sections and their block data. Public read; admin write.

## Menus & site config — `/api` (menus)

Navigation menus and site configuration (header, footer, colours). Public read;
writes are 🔒.

## Settings — `/api/settings`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | — | Public organisation, contact, branding, and operational flags. Never includes the WhatsApp invite. |
| GET | `/member` | 🔑 | Member-only settings, currently the WhatsApp group invite. |
| GET | `/all` | 🔒 | All settings. |
| PUT | `/` | 🔒 | Update settings. |

`maintenanceMode=true` returns the maintenance page with HTTP 503 for public web
routes while leaving login/admin access available. `allowPublicRegistration=false`
is enforced by both the registration page and `POST /api/auth/register`.

## Newsletter — `/api/newsletter`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/subscribe` | — | Subscribe an e-mail. |
| POST | `/unsubscribe` | — | Unsubscribe an e-mail submitted by the visitor. |
| GET | `/unsubscribe?email=…&token=…` | — | Signed one-click unsubscribe link used in delivered e-mails. |
| GET | `/subscribers` | 🔒 | List subscribers. |
| POST | `/send` | 🔒 | Deliver a per-recipient newsletter to active subscribers (maximum 500 per request). |

## Search — `/api/search`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | — | Global search across events, articles, and members. |

## Elections (PEMIRA) — `/api/elections`, `/api` (candidates, votes)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/elections` | — | List elections. |
| GET | `/elections/active` | — | The currently active election. |
| GET | `/elections/:id` | — | Election detail. |
| GET | `/elections/:id/results` | — | Election results. |
| POST | `/elections` | 🔒 | Create an election. |
| PATCH | `/elections/:id` | 🔒 | Update an election. |
| DELETE | `/elections/:id` | 🔒 | Delete an election. |
| GET | `/elections/:id/voters` | 🔒 | Voter audit for an election. |
| GET | `/elections/:id/candidates` | — | Candidates for an election. |
| POST | `/elections/:id/candidates` | 🔑 | Register as a candidate. |
| PATCH | `/candidates/:id/approve` | 🔒 | Approve a candidate. |
| PATCH | `/candidates/:id/reject` | 🔒 | Reject a candidate (reason required). |
| DELETE | `/candidates/:id` | 🔑 | Withdraw own candidacy. |
| POST | `/elections/:id/vote` | 🔑 | Cast a vote. |
| GET | `/elections/:id/my-vote` | 🔑 | The current member's vote. |

## Analytics — `/api/analytics`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/articles` | — | Article analytics. |
| GET | `/research` | — | Research analytics. |
| GET | `/dashboard` | 🛡️ | Admin dashboard overview metrics. |
| GET | `/engagement` | 🛡️ | Engagement over time. |
| POST | `/download/:researchId` | — | Record a research download. |
| GET | `/downloads/:researchId` | 🛡️ | Download analytics for one research item. |

## Audit logs — `/api/audit-logs`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔒 | List audit entries (`entity`, `action`, `page`, `limit`; max 100). |
| GET | `/entity/:entity/:entityId` | 🔒 | Paginated audit trail for one entity (`page`, `limit`; max 100). |

## Bookmarks — `/api/bookmarks`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/ids` | 🔑 | IDs of the current member's bookmarks. |
| GET | `/` | 🔑 | The current member's bookmarked articles. |
| POST | `/:articleId` | 🔑 | Bookmark an article. |
| DELETE | `/:articleId` | 🔑 | Remove a bookmark. |

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔑 | Current member's recent notifications and unread count. |
| POST | `/read-all` | 🔑 | Mark all current member notifications as read. |
| PATCH | `/:id/read` | 🔑 | Mark one owned notification as read. |
| DELETE | `/:id` | 🔑 | Delete one owned notification. |

Notifications are created internally by successful application actions; there is
no public create endpoint.

## FAQs — `/api/faq`

Read (`GET /`, `/:id`) is public; create/update/delete are 🛡️.

---

### Keeping this document accurate

The tables above are derived from the routers in `api/src/routes`. When you add or
change a route, update the matching section here. The auth column reflects the
`authorize(...)` middleware on the route and the role checks in the controller — if
you change one, check the other.
