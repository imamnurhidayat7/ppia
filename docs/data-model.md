# Data model

The database is PostgreSQL, modelled with Prisma. The full schema is in
[`api/prisma/schema.prisma`](../api/prisma/schema.prisma). This document summarises
the models, the enums that drive business logic, and the membership lifecycle.

## Models

| Model | Purpose |
| --- | --- |
| `User` | Accounts: credentials, profile, role, membership status, division, social links. |
| `Division` | Organisational units members and content can belong to. |
| `Article` | News and articles, with publish state, views, likes, tags, and SEO metadata. |
| `Research` | Research corner publications, with type, review status, DOI, downloads. |
| `ResearchDownload` | Individual download records for research analytics. |
| `Event` | Events, with schedule, location, capacity, and publish state. |
| `EventRegistration` | A member's registration for an event (status, check-in time). |
| `EventDocumentation` | Photos, videos, and links documenting a past event. |
| `Comment` | Comments on articles and research, with a hidden/visible flag. |
| `Tag` | Labels shared across articles and research. |
| `Media` | Uploaded files with alt text and folder grouping. |
| `NewsletterSubscriber` | E-mail subscribers with active/unsubscribed state. |
| `Page` / `PageBlock` | CMS pages and their content blocks. |
| `LandingSection` / `SectionBlock` | Homepage sections and their blocks. |
| `MenuItem` / `SiteConfig` | Navigation menus and site configuration (header, footer, colours). |
| `Setting` | Key/value site settings (e.g. the WhatsApp group link). |
| `Election` / `Candidate` / `Vote` | The student election (PEMIRA). |
| `AuditLog` | Recorded admin actions (actor, action, entity). |
| `Notification` | Per-user notifications. |
| `Bookmark` | A member's saved articles. |
| `Faq` | Frequently asked questions. |

## Enums

### Roles

```
Role = SUPER_ADMIN | BOARD | MEMBER
```

| Role | Scope |
| --- | --- |
| `MEMBER` | Member dashboard: browse content, register for events, edit own profile, vote in PEMIRA. |
| `BOARD` | Member scope **plus** all website *content*: articles, events, research, comments, media, tags, pages, homepage, and analytics (read-only). |
| `SUPER_ADMIN` | Full access, including members, divisions, event registrations, newsletter, elections, audit logs, search console, menus/theme, and site settings. |

> **Why the split matters.** `BOARD` is a content-editor role. It deliberately cannot
> see member records, subscriber lists, elections, or site configuration. This is
> enforced by API route middleware *and* controller checks, then mirrored in the
> dashboard navigation — hiding a link alone would not block a request.

### Membership status

```
MembershipStatus = PENDING | APPROVED | REJECTED
```

Controls whether a member can use member features, independent of role. New
registrations start `PENDING`.

### Other enums

| Enum | Values |
| --- | --- |
| `RegistrationStatus` | `REGISTERED`, `CANCELLED`, `WAITLISTED`, `ATTENDED`, `NO_SHOW` |
| `ElectionStatus` | `UPCOMING`, `REGISTRATION`, `CAMPAIGN`, `VOTING`, `CLOSED`, `PUBLISHED` |
| `CandidateStatus` | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `ResearchStatus` | `DRAFT`, `PENDING_REVIEW`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PUBLISHED` |
| `ResearchType` | `ACADEMIC_PAPER`, `THESIS`, `DISSERTATION`, `RESEARCH_PROJECT`, `PUBLICATION`, `CONFERENCE_PAPER`, `JOURNAL_ARTICLE` |
| `Position` | `PRESIDENT`, `VICE_PRESIDENT`, `SECRETARY`, `TREASURER`, `COORDINATOR`, `MEMBER` |
| `Degree` | `BACHELOR`, `MASTER`, `DOCTORATE`, `NON_DEGREE` |
| `Funding` | `LPDP`, `SELF_FUNDED`, `SCHOLARSHIP`, `OTHER` |
| `DocumentationType` | `PHOTO`, `VIDEO`, `LINK` |
| `NotificationType` | `COMMENT_REPLY`, `ARTICLE_PUBLISHED`, `EVENT_REMINDER`, `EVENT_REGISTRATION`, `MEMBERSHIP_APPROVED`, `MEMBERSHIP_REJECTED`, `SYSTEM` |
| `VerificationStatus` | `UNVERIFIED`, `VERIFIED`, `PENDING` |
| `BlockType` | CMS block kinds: `TEXT`, `IMAGE`, `VIDEO`, `HERO`, `GALLERY`, `STATISTIC`, `FAQ`, and more (see schema). |

## Membership lifecycle

```
register  ──▶  PENDING  ──approve──▶  APPROVED  ──▶  full member access
                  │
                  └──reject──▶  REJECTED  (rejection reason stored)
```

1. A visitor registers. The account is created as `role = MEMBER`,
   `membershipStatus = PENDING`. No token is returned — approval is required first.
2. A `SUPER_ADMIN` reviews the application (with the submitted details and uploaded
   documents) on `/dashboard/admin/members` and approves or rejects it.
3. On approval, a welcome e-mail is sent that includes the WhatsApp group link if one
   is configured. On rejection, an optional reason is stored on the record.

## Election (PEMIRA) lifecycle

An `Election` moves through phases derived from its timestamps
(`registrationStart/End`, `campaignStart/End`, `votingStart/End`) by
`api/src/lib/electionState.ts`:

```
UPCOMING ──▶ REGISTRATION ──▶ CAMPAIGN ──▶ VOTING ──▶ CLOSED ──▶ PUBLISHED
```

- During **REGISTRATION**, members submit candidacy (vision, mission, etc.); a
  `SUPER_ADMIN` approves or rejects each `Candidate`.
- During **VOTING**, approved members cast one `Vote`.
- Results are published when the election reaches **PUBLISHED**.

## Conventions

- **Safe selects.** User queries use `api/src/lib/user-select.ts` to avoid returning
  password hashes and other sensitive columns.
- **Relation casing.** Prisma exposes some relations capitalised (`User`, `Division`,
  `Event`, `mainAuthor`). The frontend reads both capitalised and lowercase spellings
  to stay resilient.
- **Migrations.** Schema changes are tracked in `api/prisma/migrations`. Use
  `npm run db:migrate` (dev) to apply them.
