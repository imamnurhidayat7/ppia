# Migrate Transactional E-mail Provider from Mailtrap to Resend

**Date:** 2026-08-02
**Status:** Draft for review
**Scope:** `api/` only. Frontend is unaffected.

## Context

The API currently sends transactional e-mail through **Mailtrap** (HTTP API, hand-rolled `fetch` in `api/src/lib/mailer.ts`). We are moving to **Resend** for the following reasons:

1. **Production realism.** Mailtrap's "production" endpoint is a real SMTP relay, but its free tier is shaped around dev/testing workflows. Resend is a dedicated transactional provider with a cleaner API and a dashboard that surfaces bounces/complaints/deliverability directly.
2. **No sandbox dependency in dev.** Mailtrap requires a sandbox inbox ID for safe local testing. Resend has no equivalent — verification is the only "mode." This forces a small but real change in the dev workflow: local runs either use a real API key against `onboarding@resend.dev` (Resend's built-in test sender) or log to console.
3. **Separation from "Email Testing".** Mailtrap conflates fake-inbox testing with real delivery. Resend is one thing (delivery), and tests happen elsewhere. This makes the system easier to reason about.

**Initial rollout constraint.** The organisation's domain (`ppiaauckland.org`) is not yet verified with Resend, and the Vercel-provided subdomain `ppia.vercel.app` cannot be used as a sender domain (Vercel does not delegate DNS for `*.vercel.app`). The migration therefore ships in two phases:

- **Phase 1 (this spec):** code ships with `onboarding@resend.dev` as the default sender, overridable via `MAIL_FROM`. No domain verification needed.
- **Phase 2 (future, not in this spec):** verify `ppiaauckland.org` in Resend, set `MAIL_FROM=no-reply@ppiaauckland.org` in production env, redeploy. No code change.

The two phases share the same code, so Phase 2 is a config-only change.

## Goals

- Replace Mailtrap with Resend in the API mailer without changing the public function signature (`sendEmail`, `SendEmailOptions`, `SendResult`).
- Keep the existing dev-mode "log instead of send" behavior, so contributors can run the API without any provider credentials.
- Update the `.env.example`, the test script, and inline documentation to reflect the new provider.
- Make `MAIL_FROM` overridable so Phase 2 is a config change, not a code change.

## Non-Goals

- No change to e-mail content, layout, or templates.
- No change to which emails are sent (verification, password reset, welcome, etc.) or when.
- No switch to the official Resend SDK — we continue to use `fetch` directly to match the existing style and avoid adding a dependency.
- No new feature surface (attachments, scheduled send, audiences, webhooks).
- No domain verification work in Phase 1.

## Design

### 1. Provider configuration

Replace the Mailtrap-specific env vars with Resend ones. Read on every call (same as today) so tests and scripts can override without re-importing.

| Old (Mailtrap)                          | New (Resend)                | Notes                                                                 |
|-----------------------------------------|-----------------------------|-----------------------------------------------------------------------|
| `MAILTRAP_TOKEN` / `MAILTRAP_API_KEY`   | `RESEND_API_KEY`            | One name only; Resend keys have a stable prefix (`re_`) and length.    |
| `MAILTRAP_USE_SANDBOX`                  | *(removed)*                 | Resend has no sandbox mode.                                            |
| `MAILTRAP_INBOX_ID`                     | *(removed)*                 | Tied to the removed sandbox mode.                                      |
| `MAIL_FROM`                             | `MAIL_FROM` (unchanged)     | Default changes to `onboarding@resend.dev` until domain is verified.  |
| `MAIL_FROM_NAME`                        | `MAIL_FROM_NAME` (unchanged)| Default stays `PPIA Auckland`.                                         |

If `RESEND_API_KEY` is empty or does not look like a token, `resolveConfig` returns `null` and the existing `logInsteadOfSending` path runs. This is identical to today's behavior on missing `MAILTRAP_TOKEN`.

### 2. HTTP request shape

| Aspect      | Mailtrap                                | Resend                                                |
|-------------|-----------------------------------------|-------------------------------------------------------|
| Endpoint    | `https://send.api.mailtrap.io/api/send` | `https://api.resend.com/emails`                       |
| Auth header | `Api-Token: <token>`                    | `Authorization: Bearer <token>`                       |
| `from`      | `{ email, name }` (object)              | `"Name <email>"` (single string)                      |
| `to`        | `[{ email }]` (array of objects)        | `["email"]` (array of strings)                        |
| `subject`   | string                                  | string                                                |
| `html`      | string                                  | string                                                |
| `text`      | string (optional)                       | string (optional)                                     |
| `category`  | string (optional, dashboard grouping)   | not supported — dropped                               |

The `category` field on `SendEmailOptions` is preserved in the function signature so callers don't change, but it is not sent to Resend. (Resend has `tags` instead, but they require a different shape; not worth introducing now.) Callers that pass `category` will continue to work; the value is simply ignored at the wire level.

`REQUEST_TIMEOUT_MS = 10_000` is unchanged.

### 3. Defaults

- `MAIL_FROM` default: `onboarding@resend.dev` (Phase 1) instead of the previous `no-reply@ppiaauckland.org`. Rationale: until the real domain is verified in Resend, `no-reply@ppiaauckland.org` would be rejected with a validation error on every send. `onboarding@resend.dev` always works.
- `MAIL_FROM_NAME` default: `PPIA Auckland` (unchanged).

When Phase 2 lands (out of scope here), production env will set `MAIL_FROM=no-reply@ppiaauckland.org`. The default in code stays at `onboarding@resend.dev` so a missing env var in any environment degrades to a working test sender rather than a domain that may or may not be verified.

### 4. `looksLikeToken` and `firstUsableToken`

The existing helper that rejects mis-pastes (URLs, whitespace, slashes) is still useful: a Resend key pasted from the dashboard as a URL would have the same effect, and the warning message about "too many failed login attempts" generalises to "the API will return 401 repeatedly, which is noisy and may trigger rate limiting." The warning text is updated to mention Resend instead of Mailtrap.

The minimum length check (16) is kept. Resend keys are longer, but the threshold is about "is this plausibly a token, not a comment or a stray string," not a precise validator.

### 5. Error handling and response shape

`sendEmail` continues to **never throw** and to resolve to a `SendResult` so that callers in request handlers don't have to wrap in try/catch. This is load-bearing: `forgot-password` deliberately returns the same response for known and unknown addresses to avoid an e-mail enumeration leak, and a thrown error from the mailer would break that contract.

Failure modes that map to `SendResult`:

- `RESEND_API_KEY` missing/invalid → `{ ok: false, skipped: true, error: 'Mail provider not configured' }`. Same as today.
- Network error, timeout, or non-2xx response → `{ ok: false, error: <message> }`. The message includes the HTTP status and a truncated response body (capped at 300 chars) so misconfiguration is debuggable, but request bodies (which contain reset tokens) are never logged.

### 6. Test script (`api/scripts/send-test-email.ts`)

`npm run mail:test -- you@example.com` continues to be the smoke check. Changes:

- Reads `RESEND_API_KEY` instead of `MAILTRAP_*` vars.
- The "configuration" block printed at the top shows Resend fields, not Mailtrap.
- The failure-path hints point to **Resend Dashboard → API Keys**, not Mailtrap.
- Removes the "sandbox (captured, not delivered)" branch since the concept no longer exists.
- The exit-code contract is unchanged: non-zero if the provider rejected the message.

### 7. Documentation updates

- `api/.env.example` rewritten for the Resend block.
- Top-of-file docblock in `api/src/lib/mailer.ts` rewritten to describe Resend, the new endpoint, the Phase 1 / Phase 2 sender story, and the same "never throws" contract.
- Inline comments referencing "Mailtrap" updated to "Resend" where they describe behavior, not history.

## Files Changed

- `api/src/lib/mailer.ts` — endpoint, auth header, payload shape, defaults, docblock, log messages.
- `api/scripts/send-test-email.ts` — env var names, configuration display, failure hints.
- `api/.env.example` — replace Mailtrap block with Resend block.

No other files. In particular:

- `api/src/controllers/authController.ts` and any other caller of `sendEmail` are untouched: `SendEmailOptions` is unchanged, and `category` continues to be accepted (just not transmitted to Resend).
- `web/` is untouched.
- No new dependency in `api/package.json`.

## Migration / Rollout

1. **Local dev (no domain verification needed).**
   - Drop the old `MAILTRAP_*` vars from `api/.env`.
   - Add `RESEND_API_KEY=` (leave empty for log-only dev, or fill in to actually send from `onboarding@resend.dev`).
   - `MAIL_FROM` and `MAIL_FROM_NAME` can stay at their defaults; override only if a different sender is desired.
2. **Staging / production.**
   - Create an API key in Resend Dashboard → API Keys, with the `sending.access` scope.
   - Set `RESEND_API_KEY`, `MAIL_FROM` (still `onboarding@resend.dev` for Phase 1), `MAIL_FROM_NAME=PPIA Auckland` in the host's env.
   - `npm run mail:test -- <your-personal-email>` to confirm a real send arrives.
3. **Phase 2 (later, separate work).**
   - Verify `ppiaauckland.org` in Resend.
   - Set `MAIL_FROM=no-reply@ppiaauckland.org` in production env.
   - Redeploy. No code change.

## Risks

- **Recipients may see "via resend.dev" banners in Gmail/Outlook** while on `onboarding@resend.dev`. This is acceptable for Phase 1 internal/QA sends; users should be told when this is in effect, and Phase 2 should be scheduled as soon as the real domain is available.
- **Resend free tier is 100 emails/day, 2/second.** Trivially sufficient for transactional mail (verification, password reset, welcome). The newsletter feature (`POST /newsletter/send`) already has its own rate limiting in front of it; that limit is well under Resend's free tier but should be revisited if volume grows.
- **`MAIL_FROM` must always be a verified address.** If someone in the future sets `MAIL_FROM=no-reply@ppiaauckland.org` in a non-production env that has not verified the domain, every send will fail with a 422. This is the desired fail-loud behavior, but worth noting in the runbook.
- **`category` on `SendEmailOptions` is silently dropped.** The current only caller that passes it is the test script; production sends from `authController.ts` etc. do not. If a future caller relies on it for grouping, that grouping will be lost. Mitigation: leave a one-line comment in the mailer noting this, and revisit if/when grouping becomes useful.

## Open Questions

None for Phase 1. Phase 2 (domain verification, sender branding, DMARC alignment) will need its own spec.
