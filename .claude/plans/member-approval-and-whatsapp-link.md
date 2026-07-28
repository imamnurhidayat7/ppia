# Member Approval + WhatsApp Group Link

## Goal
1. New member registrations require **admin approval** before the member can log in.
2. After registration (and once approved), the member receives a **PPIA WhatsApp group link**.

## Decisions (confirmed with user)
- **Pending login**: Block login with a clear message ("awaiting admin approval").
- **WhatsApp link source**: Admin-configurable in **Admin Settings** (persisted in DB), not an env var.
- **Existing members**: Auto-marked **APPROVED** (only *new* registrations go through approval).

---

## 1. Database schema — `api/prisma/schema.prisma`

Add a new enum and fields on `User` (default `APPROVED` so existing rows keep access; new registrations explicitly set `PENDING`):

```prisma
enum MembershipStatus {
  PENDING
  APPROVED
  REJECTED
}
```

On `User`, add:
- `membershipStatus MembershipStatus @default(APPROVED)`
- `approvedAt   DateTime?`
- `approvedBy   String?`
- `rejectionReason String?`

Add a new key/value settings table (so the WhatsApp link and future site config are admin-editable):

```prisma
model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

Generate + create migration:
```bash
cd api
npx prisma migrate dev --name add_member_approval_and_settings
npx prisma generate
```

---

## 2. Backend — `api/src`

### `controllers/authController.ts`
- **`register`**:
  - Create user with `membershipStatus: 'PENDING'`, `role: 'MEMBER'`.
  - Do **not** issue a JWT (no instant login).
  - Respond `201 { message: 'Registration submitted. Awaiting admin approval.', status: 'PENDING' }`.
- **`login`**:
  - After password check, gate on `membershipStatus`:
    - `PENDING` → `403 { error: 'Your registration is awaiting admin approval.', status: 'PENDING' }`
    - `REJECTED` → `403 { error: 'Your registration was not approved. <rejectionReason?>', status: 'REJECTED' }`
    - `APPROVED` → existing token flow.
  - (`SUPER_ADMIN`/`BOARD` are `APPROVED` by default → unaffected.)
- **`getProfile` / `me`**: add `membershipStatus` to the selected fields.

### `controllers/memberController.ts`
- **`getAllMembers`**: accept `membershipStatus` query filter; include the new fields in returned rows.
- **New `approveMember`**: set `membershipStatus='APPROVED'`, `approvedAt=now`, `approvedBy=req.user.userId`, clear `rejectionReason`. Then call `sendWelcomeEmail` (placeholder `sendEmail` logs to console) including the WhatsApp group link from `Setting`.
- **New `rejectMember`**: body `{ reason }` → set `membershipStatus='REJECTED'`, `rejectionReason`.
- `updateMember`/`deleteMember` unchanged.

### `controllers/settingsController.ts` (new)
- `getPublicSettings`: return safe subset incl. `whatsappGroupLink` (and any other non-sensitive keys later).
- `updateSettings` (SUPER_ADMIN): upsert key/value pairs from body.

### Routes
- `routes/members.ts`: add `PATCH /:id/approve` and `PATCH /:id/reject` (both `authenticate, authorize('SUPER_ADMIN')`).
- `routes/settings.ts` (new): `GET /` public; `PUT /` SUPER_ADMIN.
- `index.ts`: mount `app.use('/api/settings', settingsRoutes)`.

---

## 3. Frontend — `web/src`

### Types & API client
- `lib/api-types.ts`: add `membershipStatus?: 'PENDING'|'APPROVED'|'REJECTED'` to `User`/`UserProfile`.
- `lib/api.ts`: add `approveMember(id)`, `rejectMember(id, reason)`, `getSettings()`, `updateSettings(data)`.

### Registration flow
- `lib/auth-context.tsx`: `register()` no longer expects a token; just resolves on success.
- `app/register/page.tsx`: on success → `router.push('/registration-pending')` instead of `/dashboard`.
- **New `app/registration-pending/page.tsx`**: branded "Registration received — awaiting admin approval" screen with link back to home/login.

### Login
- `app/login/page.tsx`: no change needed — backend `403 + error` already surfaces via existing `setError`.

### Dashboard (approved members)
- `app/dashboard/page.tsx`: add a **"Join the PPIA WhatsApp Community"** card that fetches `whatsappGroupLink` from `/api/settings` and renders a join button. (Only relevant once approved; login gating guarantees this.)

### Admin — approve/reject members
- `app/dashboard/admin/members/page.tsx`:
  - Add status tabs / filter (`All`, `Pending`, `Approved`, `Rejected`) and a status badge per row.
  - For `PENDING` rows: show **Approve** and **Reject** actions (reject opens a small reason prompt).
  - Existing edit/delete retained.

### Admin — configurable WhatsApp link
- `app/dashboard/admin/settings/page.tsx`: add a new **"Community / WhatsApp"** card with a "WhatsApp Group Link" input, saved via `PUT /api/settings` (`getSettings` on load). Other cards stay local/mock for now (noted in summary).

---

## 4. Files to create / change

**Backend**
- `api/prisma/schema.prisma` (edit) + new migration under `api/prisma/migrations/`
- `api/src/controllers/authController.ts` (edit)
- `api/src/controllers/memberController.ts` (edit)
- `api/src/controllers/settingsController.ts` (new)
- `api/src/routes/members.ts` (edit)
- `api/src/routes/settings.ts` (new)
- `api/src/index.ts` (edit)

**Frontend**
- `web/src/lib/api-types.ts` (edit)
- `web/src/lib/api.ts` (edit)
- `web/src/lib/auth-context.tsx` (edit)
- `web/src/app/register/page.tsx` (edit)
- `web/src/app/registration-pending/page.tsx` (new)
- `web/src/app/dashboard/page.tsx` (edit)
- `web/src/app/dashboard/admin/members/page.tsx` (edit)
- `web/src/app/dashboard/admin/settings/page.tsx` (edit)

---

## 5. Verification
1. `cd api && npx prisma migrate dev` succeeds; `npx prisma generate`.
2. Register a new user → response has no token, `status: PENDING`; redirected to pending screen.
3. Login as that user → 403 "awaiting approval".
4. As SUPER_ADMIN, see the user under Pending, Approve them.
5. Approved user can now log in and sees the WhatsApp join card with the link set in Admin Settings.
6. Existing members/admins still log in normally (auto-APPROVED).
7. `GET /api/settings` is public and returns `whatsappGroupLink`; `PUT` is SUPER_ADMIN only.

## 6. Out of scope / notes
- Email sending is still the existing `console.log` placeholder; the welcome email (with WA link) will be logged until a real provider is wired.
- Only the WhatsApp link is persisted in settings for now; the other settings cards remain local/mock as today.
