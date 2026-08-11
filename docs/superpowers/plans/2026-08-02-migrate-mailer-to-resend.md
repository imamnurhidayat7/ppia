# Migrate Transactional E-mail Provider from Mailtrap to Resend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mailtrap with Resend as the transactional e-mail provider for the API, using `fetch` directly (no SDK) and `onboarding@resend.dev` as the default sender, with no changes to the public mailer interface or any controller that calls it.

**Architecture:** Hand-rolled `fetch` POST to `https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>`. Provider config (`resolveConfig`) reads `RESEND_API_KEY` and returns `null` when it is missing or does not look like a token — that triggers the existing `logInsteadOfSending` path so dev runs without credentials still work. `MAIL_FROM` defaults to `onboarding@resend.dev` (overridable, so swapping to `no-reply@ppiaauckland.org` after domain verification is a config-only change). The `SendEmailOptions` and `SendResult` shapes and all renderer helpers are unchanged; controllers are not touched.

**Tech Stack:** Node 20+, TypeScript, native `fetch`, native `node:test` (no new dependencies).

## Global Constraints

- **No new dependencies.** Use the existing `fetch` (Node 20+ global). No `resend` SDK, no other npm packages.
- **No signature changes.** `sendEmail`, `SendEmailOptions`, `SendResult`, and all `render*` exports keep their current types. Callers in `authController.ts`, `memberController.ts`, `newsletterController.ts`, `eventRegistrationController.ts` are not touched.
- **Never throw.** `sendEmail` resolves to a `SendResult`; on any failure (missing config, network error, non-2xx) it returns `{ ok: false, ... }` and never rejects. This is load-bearing for `forgot-password`'s enumeration-resistance contract.
- **Env contract:** replace `MAILTRAP_TOKEN`/`MAILTRAP_API_KEY`/`MAILTRAP_USE_SANDBOX`/`MAILTRAP_INBOX_ID` with a single `RESEND_API_KEY`. `MAIL_FROM` and `MAIL_FROM_NAME` keep their names; only the `MAIL_FROM` default changes.
- **Timeout:** 10s per request (matches current value).
- **Log safety:** never log the request body (it can contain reset tokens); cap response body excerpts at 300 chars.
- **Test stack:** `node --import tsx --test "src/**/*.test.ts"`. No Jest, no Vitest. `npm run typecheck` must also pass.
- **Commits:** one commit per task with a Conventional-Commits-style message.

---

## File Structure

Files modified by this plan, in order of expected change:

- `api/src/lib/mailer.ts` — endpoint, auth, payload shape, defaults, docblock, log messages. ~50 lines of effective change, all localised.
- `api/src/lib/mailer.test.ts` — three tests currently key off `MAILTRAP_TOKEN` / `MAILTRAP_API_KEY`. Rename the env vars to `RESEND_API_KEY` and update one comment about Mailtrap's lockout policy.
- `api/scripts/send-test-email.ts` — read `RESEND_API_KEY`, update the printed config block, update the failure-path hints, drop the sandbox branch.
- `api/.env.example` — replace the Mailtrap block with a Resend block.

Files **not** modified, and why:

- `api/src/controllers/*.ts` — interface is unchanged. Verified by `grep` showing 9 call sites that all use the existing `sendEmail({ to, subject, html, [category] })` shape.
- `api/src/index.ts` and any startup code — `mailer.ts` is self-contained; it has no module-level initialisation that would crash on missing env.
- `api/package.json` — no new dependency.
- `web/**` — no involvement; the API is the only thing that sends mail.

---

## Task 1: Update the mailer module to talk to Resend

**Files:**
- Modify: `api/src/lib/mailer.ts` (rewrite endpoints, payload, headers, defaults, docblock, log messages)
- Reference: `api/src/lib/mailer.test.ts` (do not modify yet — the next task updates it; this task's manual check is typecheck + the existing tests' other paths still passing)

**Interfaces:**
- Consumes: nothing new (this is the leaf module).
- Produces: same exports as today — `sendEmail`, `SendEmailOptions`, `SendResult`, `renderEmailLayout`, `renderEmailButton`, `renderWhatsAppButton`, `renderEmailDetails`, `renderEmailHeading`, `renderEmailFallbackLink`, `escapeHtml`.

**Context for the implementer:** the existing module has three things to change at the wire level (endpoint URL, auth header, request body shape) and one thing to change at the config level (env var name + default sender). Everything else — the renderer helpers, the `htmlToText` converter, the `logInsteadOfSending` fallback, the `looksLikeToken` guard, the timeout — stays as-is. The module-level docblock at the top of the file (lines 1–20) is currently Mailtrap-specific and must be rewritten in the same edit.

**Step-by-step:**

- [ ] **Step 1: Rewrite the top-of-file docblock (lines 1–20).**

Replace the existing Mailtrap-flavoured docblock with a Resend-flavoured one. The new docblock must say:

- The module talks to the Resend HTTP API with the global `fetch`, so no runtime dependency is added.
- Endpoint is `https://api.resend.com/emails` and the auth header is `Authorization: Bearer <RESEND_API_KEY>`.
- The `MAIL_FROM` domain must be verified in Resend, or the API rejects the request. The default in code is `onboarding@resend.dev` (Resend's built-in test sender) so unconfigured environments and dev runs work without domain verification; production is expected to set `MAIL_FROM` to a verified address.
- Failures never throw (same enumeration-resistance contract as before).

The final sentence of the old docblock ("Instead every send resolves to a SendResult the caller may inspect or ignore.") carries over verbatim.

- [ ] **Step 2: Replace the endpoint constants (lines 22–23).**

Delete the two `const …_ENDPOINT` declarations. Add a single constant:

```ts
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
```

Keep `REQUEST_TIMEOUT_MS = 10_000` exactly as is.

- [ ] **Step 3: Update `resolveConfig` (lines 100–120).**

- Change the `firstUsableToken(...)` call to read `RESEND_API_KEY` only. Remove the `MAILTRAP_TOKEN` and `MAILTRAP_API_KEY` lookup. Update the warning text inside `firstUsableToken` (lines 78–84) from "...Mailtrap credential that does not look like an API token..." to "...Resend API key that does not look like a token...".
- Remove the `sandbox` and `inboxId` logic entirely (no Resend equivalent).
- Update the returned object:
  - `endpoint: RESEND_ENDPOINT`
  - `token: token`
  - `fromEmail: readEnv('MAIL_FROM') || 'onboarding@resend.dev'`
  - `fromName: readEnv('MAIL_FROM_NAME') || 'PPIA Auckland'`
  - **Delete** the `sandbox: boolean` field — no caller reads it and the test that prints the "sandbox" hint is updated in Task 2.
- Update the `MailerConfig` interface (lines 88–94) to drop the `sandbox` field accordingly.

- [ ] **Step 4: Update `logInsteadOfSending` (lines 177–196).**

In the `console.warn` message (lines 182–186), replace the Mailtrap-specific copy:

- Old: `"[mailer] Mailtrap is not configured (MAILTRAP_TOKEN, and MAILTRAP_INBOX_ID when MAILTRAP_USE_SANDBOX=true). E-mails are being logged, not delivered."`
- New: `"[mailer] Resend is not configured (RESEND_API_KEY is missing or not a valid token). E-mails are being logged, not delivered."`

The two `console.error` / `console.log` branches that print "DROPPED e-mail" and "(not sent) To: …" are unchanged.

- [ ] **Step 5: Update `sendEmail` (lines 202–248).**

Replace the `payload` and the `fetch` call:

```ts
const payload = {
  from: `${config.fromName} <${config.fromEmail}>`,
  to: [options.to],
  subject: options.subject,
  html: options.html,
  text: options.text ?? htmlToText(options.html),
  // `category` is accepted on the input but Resend has no equivalent at the
  // wire level. Drop it silently rather than fail the send.
};

try {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = `Resend responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`;
    console.error(`[mailer] Failed to send "${options.subject}" to ${options.to} — ${message}`);
    return { ok: false, error: message };
  }

  console.log(`[mailer] Sent "${options.subject}" to ${options.to}`);
  return { ok: true };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mailer] Failed to send "${options.subject}" to ${options.to} — ${message}`);
  return { ok: false, error: message };
}
```

Notes:
- `from` is a single `"Name <email>"` string, not an object.
- `to` is `["email"]`, not `[{ email }]`.
- The `category` field from `SendEmailOptions` is intentionally not included in the payload. Add a one-line comment explaining this (see code above).
- Remove the `(config.sandbox ? ' (Mailtrap sandbox)' : '')` suffix from the success log.
- The error message text changes from "Mailtrap responded" to "Resend responded".

- [ ] **Step 6: Run typecheck.**

Run: `cd api && npm run typecheck`
Expected: passes. The `MailerConfig.sandbox` field is removed; nothing else in the codebase reads it (verify with `grep -rn "sandbox" api/src` — only the `logInsteadOfSending` warning text matches, and that line is not a property access).

- [ ] **Step 7: Commit.**

```bash
git add api/src/lib/mailer.ts
git commit -m "feat(mailer): switch transactional provider from Mailtrap to Resend"
```

---

## Task 2: Update the mailer test to use RESEND_API_KEY

**Files:**
- Modify: `api/src/lib/mailer.test.ts` (rename env var in three tests + update one Mailtrap-specific comment)

**Interfaces:**
- Consumes: the renamed env var name from Task 1.
- Produces: a green test suite that exercises the unconfigured-provider path with the new env var.

**Context:** three existing tests key off the old `MAILTRAP_TOKEN` / `MAILTRAP_API_KEY` names. They must be renamed, otherwise the suite will pass for the wrong reason (the env var is unset, so the tests would still hit the "unconfigured" path, but the cleanup `finally` blocks would be lying about restoring the original env).

**Step-by-step:**

- [ ] **Step 1: Update the plain-text-alternative test (lines 163–197).**

In the `previousToken` / `previousKey` save-delete-restore block, rename:

- `MAILTRAP_TOKEN` → `RESEND_API_KEY`
- `MAILTRAP_API_KEY` → `RESEND_API_KEY` (both old vars are now collapsed into one; only the single new var needs to be saved/restored)
- Delete the second `previousKey` variable and its `process.env.MAILTRAP_API_KEY` reads/writes. The test should now save and restore one variable: `process.env.RESEND_API_KEY`.

The body of the test (what it actually asserts about the rendered text) is unchanged.

- [ ] **Step 2: Update the URL-as-credential test (lines 220–244).**

- Rename the same two env vars to a single `RESEND_API_KEY`.
- Update the comment on lines 222–223 from "Pasting the token *page* URL into the variable is an easy mistake, and presenting it as a token makes Mailtrap lock the account out with 'Too many failed login attempts'." to "Pasting the dashboard URL into the variable is an easy mistake, and presenting it as a token makes the provider return 401 on every call, which is noisy and can trigger rate limiting. Treat it as unconfigured instead."
- Keep the rest of the test (the `looksLikeToken` rejection logic) — it still applies to Resend API keys.
- Update the assignment from `process.env.MAILTRAP_API_KEY = 'https://mailtrap.io/api-tokens';` to `process.env.RESEND_API_KEY = 'https://resend.com/api-keys';` (a representative URL of a similar shape).

- [ ] **Step 3: Update the unconfigured-provider test (lines 246–268).**

- Same rename: collapse `MAILTRAP_TOKEN` + `MAILTRAP_API_KEY` into a single `RESEND_API_KEY` save/restore.
- Body of the test is unchanged — it still asserts `{ ok: false, skipped: true }` and that `result.error` is set.

- [ ] **Step 4: Run the mailer test suite in isolation.**

Run: `cd api && npm test -- src/lib/mailer.test.ts`
Expected: all tests pass. The render tests don't touch the env; the three renamed tests should still hit the unconfigured path and pass.

- [ ] **Step 5: Run typecheck.**

Run: `cd api && npm run typecheck`
Expected: passes.

- [ ] **Step 6: Commit.**

```bash
git add api/src/lib/mailer.test.ts
git commit -m "test(mailer): point mailer tests at RESEND_API_KEY"
```

---

## Task 3: Update the manual mail-test script

**Files:**
- Modify: `api/scripts/send-test-email.ts` (env var name, config print block, failure hints, drop sandbox branch)

**Interfaces:**
- Consumes: the renamed env var from Task 1.
- Produces: a `npm run mail:test -- <addr>` smoke check that prints Resend-specific config and points operators at Resend Dashboard when the send fails.

**Context:** the script is the operator-facing smoke test, run after deploy. Its current `console.log` block tells the operator about Mailtrap sandbox/inbox state — those lines must go.

**Step-by-step:**

- [ ] **Step 1: Update the top-of-file docblock (lines 1–11).**

Replace with:

```ts
/**
 * Verify that transactional e-mail actually leaves the API.
 *
 *   npm run mail:test -- you@example.com
 *
 * With RESEND_API_KEY set, Resend accepts the message; whether it reaches the
 * inbox depends on the recipient address (use your own while onboarding) and
 * on the `from` address being a verified Resend sender. The script does not
 * check delivery — only that the provider accepted the request.
 *
 * Exits non-zero when the provider rejects the message, which makes this
 * usable as a deployment smoke check.
 */
```

- [ ] **Step 2: Replace the configuration print block (lines 19–27).**

Delete the existing `console.log` block (the "Mailtrap configuration" lines). Add:

```ts
console.log('Resend configuration');
console.log(`  api key present : ${Boolean(readEnv('RESEND_API_KEY'))}`);
console.log(`  from            : ${readEnv('MAIL_FROM') || 'onboarding@resend.dev'}`);
console.log(`  from name       : ${readEnv('MAIL_FROM_NAME') || 'PPIA Auckland'}`);
console.log(`  recipient       : ${recipient}`);
console.log('');
```

- [ ] **Step 3: Remove the `sandbox` branch (lines 19 + 42–44).**

- Delete the `const sandbox = …` line and the `if (sandbox) …` block at the bottom of the success branch.
- Delete the `if (sandbox) console.log(...)` after "OK — Mailtrap accepted the message." and change that log to `"OK — Resend accepted the message."`.

- [ ] **Step 4: Update the failure hints (lines 49–60).**

Replace the bottom of the function (the `if (result.skipped) …` and `console.error('FAILED — …')` blocks) with:

```ts
if (result.skipped) {
  console.error('NOT CONFIGURED — the message was logged instead of sent.');
  console.error('Set RESEND_API_KEY in api/.env.');
  process.exitCode = 1;
  return;
}

console.error(`FAILED — ${result.error}`);
console.error('');
console.error('A 401 means the API key is wrong or revoked.');
console.error('A 422 usually means MAIL_FROM is on a domain that has not been');
console.error('verified in Resend. Check Domains in the Resend dashboard.');
process.exitCode = 1;
```

- [ ] **Step 5: Run the script with no API key set (smoke check).**

Run: `cd api && unset RESEND_API_KEY && npm run mail:test -- you@example.com`
Expected: prints the new "Resend configuration" block with `api key present : false`, then prints "NOT CONFIGURED — the message was logged instead of sent." and exits non-zero. The "Hello" body should appear in the log (this is the unconfigured path's debug output).

- [ ] **Step 6: Run typecheck.**

Run: `cd api && npm run typecheck`
Expected: passes.

- [ ] **Step 7: Commit.**

```bash
git add api/scripts/send-test-email.ts
git commit -m "chore(mailer): point mail:test script at Resend"
```

---

## Task 4: Rewrite the .env.example mailer block

**Files:**
- Modify: `api/.env.example` (replace the `─── E-mail (Mailtrap) ───` block, lines 66–86, with a Resend block)

**Interfaces:**
- Consumes: nothing.
- Produces: an `.env.example` that lists `RESEND_API_KEY` and removes the Mailtrap-specific vars.

**Context:** the existing block explains Mailtrap's sandbox-vs-production switch and the `MAILTRAP_INBOX_ID` requirement. The new block has neither — it explains Resend's "leave empty for log-only dev" behaviour and notes that `MAIL_FROM` defaults to `onboarding@resend.dev`.

**Step-by-step:**

- [ ] **Step 1: Replace lines 66–86 with the Resend block.**

Old block (66–86) starts with `# ─── E-mail (Mailtrap) ───` and ends with `MAIL_FROM_NAME=PPIA Auckland`.

New block:

```bash
# ─── E-mail (Resend) ────────────────────────────────────────────────────────
# Transactional mail goes through the Resend HTTP API (see src/lib/mailer.ts).
# Generate an API key at https://resend.com/api-keys with the sending.access
# scope. Leave RESEND_API_KEY empty for local development — e-mails will be
# logged to the console instead of sent.
RESEND_API_KEY=

# Envelope sender. The domain in this address must be verified in Resend,
# otherwise every send fails with 422. The default below is Resend's built-in
# test sender and always works; switch to no-reply@ppiaauckland.org once the
# domain is verified.
MAIL_FROM=onboarding@resend.dev
MAIL_FROM_NAME=PPIA Auckland
```

- [ ] **Step 2: Verify no other env vars in the file reference Mailtrap.**

Run: `grep -n -i "mailtrap" api/.env.example`
Expected: no output.

Run: `grep -n -i "resend" api/.env.example`
Expected: the four lines from the new block (`# ─── E-mail (Resend) ─`, `RESEND_API_KEY=`, `MAIL_FROM=`, `MAIL_FROM_NAME=`) plus the comment lines.

- [ ] **Step 3: Commit.**

```bash
git add api/.env.example
git commit -m "docs(env): switch .env.example mailer block to Resend"
```

---

## Task 5: End-to-end verification

**Files:** none modified.

**Purpose:** confirm the whole change works as a unit, not just per-task.

**Step-by-step:**

- [ ] **Step 1: Run the full test suite.**

Run: `cd api && npm test`
Expected: all tests pass, including the renamed mailer tests from Task 2.

- [ ] **Step 2: Run typecheck.**

Run: `cd api && npm run typecheck`
Expected: passes.

- [ ] **Step 3: Run the smoke script with no key (unconfigured path).**

Run: `cd api && npm run mail:test -- you@example.com`
Expected: prints "Resend configuration" with `api key present : false`, then "NOT CONFIGURED — the message was logged instead of sent." and exits non-zero.

- [ ] **Step 4: Run the smoke script with a key (real Resend path).**

If a Resend API key is available locally, run:

```bash
cd api
RESEND_API_KEY=<your-resend-key> MAIL_FROM=onboarding@resend.dev npm run mail:test -- <your-personal-email>
```

Expected: prints "Resend configuration" with `api key present : true`, then "OK — Resend accepted the message." and exits 0. The message lands in `<your-personal-email>` (possibly with a "via resend.dev" banner — expected for Phase 1).

If no Resend key is available, skip this step and note in the commit message that it was deferred to the deployment environment. Do **not** fabricate a result.

- [ ] **Step 5: Confirm no Mailtrap references remain in the API source.**

Run: `grep -rn -i "mailtrap" api/src api/scripts api/.env.example`
Expected: no output.

- [ ] **Step 6: Confirm `SendEmailOptions` is still importable and unchanged in shape.**

Run: `grep -n "interface SendEmailOptions" api/src/lib/mailer.ts`
Expected: one match, and the interface fields are `to: string`, `subject: string`, `html: string`, `text?: string`, `category?: string` — exactly the same as before. (No caller in the controllers should need to change.)

- [ ] **Step 7: No commit.**

Task 5 is a verification gate, not a change. If anything in steps 1–6 reveals a missed item, open a follow-up task to address it; otherwise the migration is done.

---

## Notes for the implementer

- The `category` field on `SendEmailOptions` is silently dropped at the wire level. The only caller in the codebase that passes it is the test script (`scripts/send-test-email.ts` passes `category: 'mailer-test'`, and that's fine — it remains accepted on the input side). Production callers (`authController.ts`, `memberController.ts`, `newsletterController.ts`, `eventRegistrationController.ts`) do not pass `category` at all. This is the intended Phase 1 trade-off called out in the spec.
- The free-tier Resend limit (100 emails/day) is more than enough for transactional traffic (verification, password reset, welcome). The newsletter feature has its own rate limiting in front of it; revisit only if bulk volume grows.
- Phase 2 (verifying `ppiaauckland.org` in Resend and switching `MAIL_FROM` to `no-reply@ppiaauckland.org`) is intentionally out of scope. It will be a separate spec-and-plan when the organisation owns the domain.
