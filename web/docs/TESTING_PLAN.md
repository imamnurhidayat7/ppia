# Testing Plan — PPIA Auckland Web

> Comprehensive testing strategy for the `web/` Next.js 16 + React 19 + Prisma app.
> Status: **planned, not yet executed**. Created 2026-07-31.
> Updated 2026-07-31: industry-standard best practices (testing trophy, CI/CD gates, security, a11y, performance, mutation, contract testing).

---

## Stack & Conventions

| Layer | Tool | Notes |
|-------|------|-------|
| Unit (pure) | `node:test` + `tsx` | Already in use, zero new deps. Pattern: top-level `assert.equal`, no `describe`. |
| Unit (React) | Vitest + @testing-library/react + jsdom | ESM-native, fast, good React 19 support. |
| E2E | Playwright | Cross-browser, auto-wait, trace viewer. |

### Existing tests (do not duplicate)
- `src/lib/sanitize-html.test.ts`
- `src/lib/page-editor.test.ts`
- `src/lib/page-editor-validation.test.ts`
- `src/lib/theme-validation.test.ts`
- `src/lib/scholarship-content.test.ts`

### Test command (current)
```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

### Proposed scripts
```json
{
  "test": "node --import tsx --test \"src/**/*.test.ts\"",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:e2e": "playwright test",
  "test:all": "npm run test && npm run test:unit && npm run test:e2e"
}
```

### Dependencies to install
**P1 (component tests):**
```
vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
**P2 (E2E):**
```
@playwright/test
```

---

## Coverage Matrix

| Area | File/Path | Test Type | Priority |
|------|-----------|-----------|----------|
| Pure utils | `src/lib/utils.ts` | Unit | P0 |
| HTML sanitization | `src/lib/sanitize-html.ts` | Unit (✅ exists) | — |
| Content schemas | `src/lib/content-schemas.ts` | Unit | P0 |
| Page templates | `src/lib/page-templates.ts` | Unit | P0 |
| Event registration | `src/lib/event-registration.ts` | Unit | P0 |
| Scholarship parsing | `src/lib/scholarship-content.ts` | Unit (✅ exists) | — |
| Theme validation | `src/lib/theme-validation.ts` | Unit (✅ exists) | — |
| Page editor routing | `src/lib/page-editor.ts` | Unit (✅ exists) | — |
| API client | `src/lib/api.ts` | Unit + mock | P1 |
| Auth context | `src/lib/auth-context.tsx` | Component | P1 |
| Rich text editor | `src/components/ui/RichTextEditor` | Component | P1 |
| Content form editor | `src/components/admin/ContentFormEditor` | Component | P1 |
| Editable field | `src/components/admin/EditableField` | Component | P2 |
| Repeater editor | `src/components/admin/RepeaterEditor` | Component | P2 |
| useConfirm hook | `src/hooks/useConfirm.tsx` | Hook | P2 |
| useBlockData hook | `src/hooks/useBlockData.ts` | Hook | P2 |
| AD/ART render | `src/app/about/ad-art/` | Integration | P1 |
| Article detail + view track | `src/app/activities/news-articles/[slug]/` | E2E | P1 |
| Research detail + view track | `src/app/activities/research-corner/[slug]/` | E2E | P1 |
| Admin login flow | `src/app/dashboard/` | E2E | P0 |
| CMS canvas editor | `src/app/dashboard/admin/canvas/` | E2E | P1 |
| Dark mode toggle | theme context | E2E | P2 |
| Favicon/metadata | `src/app/layout.tsx` | Smoke | P3 |

---

## P0 — Unit Pure Functions (no new deps, `node:test`)

### 1. `src/lib/utils.test.ts`
- `cn()` — merge classNames, handle falsy values (`null`, `undefined`, `''`)
- `formatCurrency(1500000)` → `NZ$1,500,000.00`
- `formatDate('2026-07-31')` → format en-NZ medium
- `formatRelativeTime()` — "just now" (<60s), "5m ago", "3h ago", "2d ago", "1w ago", fallback to formatDate
- `truncate('hello world', 5)` → `'hello...'`; `truncate('hi', 10)` → `'hi'`
- `getInitials('Budi Santoso')` → `'BS'`; single name; empty string
- `resolveImageUrl('/uploads/img.png')` → prepend API base; `'https://...'` → as-is; `null` → `undefined`

Edge cases: null input, empty string, invalid date, Unicode names

### 2. `src/lib/content-schemas.test.ts`
- `getContentSchema('about/ad-art')` → returns `legal_document` schema
- `getContentSchema('unknown-slug', 'division_grid')` → fallback ke template
- `getContentSchema('unknown-slug')` → returns default schema
- `emptyContentFromSchema([{type:'text',key:'a'},{type:'array',key:'b'},{type:'toggle',key:'c'},{type:'number',key:'d'}])` → `{a:'',b:[],c:false,d:0}`
- Contract: setiap key di `TEMPLATE_FOR_SLUG` resolve ke schema non-empty
- Contract: `adArticles`/`artArticles` itemSchema punya field `content` dengan `type: 'richtext'` (regresion test untuk fix kemarin)

### 3. `src/lib/page-templates.test.ts`
- `isValidTemplate('standard')` → true; `isValidTemplate('xxx')` → false
- `getTemplate('standard')` → returns object dengan `id`, `label`, `allowedBlocks`, `defaultBlocks`
- `getAllowedBlocks('cabinet')` → array berisi block types valid
- `getDefaultBlocks('standard')` → array BlockInput dengan `order` dan `enabled`
- `getTemplateLayout('standard')` → `'full'` | `'with_sidebar'` | dll
- Unknown template → throw atau fallback default

### 4. `src/lib/event-registration.test.ts`
- `resolveEventFields(null)` → `DEFAULT_REGISTRATION_FIELDS`
- `resolveEventFields([{...custom}])` → returns array as-is
- `resolveEventFields('not array')` → defaults
- `prefillResponses(fields, {name:'Budi', university:'UoA'})` → map `prefill: 'name'` → value; skip kalau profile null
- `prefillResponses` dengan `single_choice` field → hanya isi kalau value ada di options
- `validateResponses` — required field kosong → error; pilih di luar options → error; semua valid → `{}` empty errors
- `newFieldId()` → format `f_xxxxxxxx`, unique di 1000 call

---

## P1 — Component & Hook Tests (Vitest + Testing Library)

### 5. `src/components/ui/RichTextEditor.test.tsx`
- Render initial value HTML
- Type text → onChange dipanggil dengan HTML updated
- Paste sanitized HTML (XSS attempt: `<script>` stripped)
- Empty value → tidak crash

### 6. `src/components/admin/ContentFormEditor.test.tsx`
- Render schema `text` → muncul `<input>`
- Render schema `textarea` → muncul `<textarea>`
- Render schema `richtext` → muncul RichTextEditor
- Render schema `array` → muncul add/remove button, render itemSchema
- Render schema `group` → collapsible, render nested fields
- Render schema `toggle` → muncul toggle switch
- Ubah value → onChange callback dengan struktur benar
- Array add/remove → item baru kosong sesuai `emptyContentFromSchema`

### 7. `src/lib/auth-context.test.tsx`
- Provider render → anak bisa `useAuth()`
- Login dengan credentials valid → set token, user terisi
- Login invalid → error, no token
- Logout → clear state
- Token expired → auto-logout

### 8. `src/lib/api.test.ts` (mock fetch)
- `api.getArticles()` → parse response, return array
- Network error → throw dengan message jelas
- 401 → trigger logout / redirect
- `api.trackArticleView(id)` → fire-and-forget, tidak throw kalau gagal

### 9. `src/app/about/ad-art/_components/ad-art-content.test.tsx` (integration)
- Render dengan content `{adArticles: [...], artArticles: [...]}` → muncul chapter & articles
- Article dengan `content` berisi HTML (`<p>`, `<img>`) → render sebagai HTML, bukan teks (regresion test fix kemarin!)
- Article kosong → tidak crash
- Click chapter header → expand/collapse

### 10. `src/app/activities/news-articles/[slug]/_components/article-detail.test.tsx`
- Render article dengan view count
- Mount → trigger `trackArticleView` (verify mock called)
- Bot user-agent → tidak track

---

## P2 — E2E dengan Playwright

### 11. `e2e/admin-auth.spec.ts`
- Login sebagai admin → redirect ke dashboard
- Login salah password → error message
- Logout → redirect ke home
- Akses `/dashboard` tanpa login → redirect ke login

### 12. `e2e/cms-edit.spec.ts`
- Login → buka `/dashboard/admin/canvas/about/ad-art`
- Edit article content → save → cek perubahan tersimpan
- Add new chapter → muncul di list
- Delete chapter → hilang dari list
- Edit dengan rich text → HTML tersimpan benar

### 13. `e2e/view-tracking.spec.ts`
- Buka article detail → view count +1
- Refresh dalam 5 menit → view count tidak bertambah (IP dedup)
- Buka sebagai bot → view count tidak berubah

### 14. `e2e/public-pages.spec.ts`
- Home page load tanpa error
- `/about/ad-art` → render HTML content (bukan raw tag)
- `/activities/news-articles` → list article
- `/contact` → form bisa diisi
- Dark mode toggle → class `.dark` di `<html>`

### 15. `e2e/favicon.spec.ts` (smoke)
- `/favicon.png` → 200, content-type image/png
- `<link rel="icon">` di HTML → point ke `/favicon.png`

---

## P3 — Hook Tests

### 16. `src/hooks/useConfirm.test.tsx`
- Call `confirm()` → show modal
- Click confirm → resolve true, modal close
- Click cancel → resolve false
- Multiple concurrent confirms → queue atau replace

### 17. `src/hooks/useBlockData.test.tsx`
- Initial fetch → loading state
- Success → data terisi
- Error → error state
- Refetch → re-request

---

## File Structure

```
web/
├── src/
│   ├── lib/
│   │   ├── utils.test.ts              ← NEW (P0)
│   │   ├── content-schemas.test.ts    ← NEW (P0)
│   │   ├── page-templates.test.ts     ← NEW (P0)
│   │   ├── event-registration.test.ts ← NEW (P0)
│   │   ├── api.test.ts                ← NEW (P1)
│   │   ├── auth-context.test.tsx      ← NEW (P1)
│   │   └── (existing tests...)
│   ├── components/
│   │   ├── ui/RichTextEditor.test.tsx ← NEW (P1)
│   │   └── admin/ContentFormEditor.test.tsx ← NEW (P1)
│   ├── hooks/
│   │   ├── useConfirm.test.tsx        ← NEW (P3)
│   │   └── useBlockData.test.tsx      ← NEW (P3)
│   └── app/about/ad-art/_components/
│       └── ad-art-content.test.tsx    ← NEW (P1)
├── e2e/                               ← NEW dir
│   ├── admin-auth.spec.ts
│   ├── cms-edit.spec.ts
│   ├── view-tracking.spec.ts
│   ├── public-pages.spec.ts
│   └── favicon.spec.ts
├── vitest.config.ts                   ← NEW (P1)
├── playwright.config.ts               ← NEW (P2)
└── package.json                       ← update scripts
```

---

## Estimasi Effort

| Phase | File count | Est. time | Value |
|-------|-----------|-----------|-------|
| P0 — Pure unit | 4 files, ~80 cases | 1-2 jam | ⭐⭐⭐⭐⭐ |
| P1 — Component + integration | 5 files, ~40 cases | 3-4 jam | ⭐⭐⭐⭐ |
| P2 — E2E | 5 files, ~15 scenarios | 4-6 jam | ⭐⭐⭐⭐⭐ (regression catch terbesar) |
| P3 — Hooks | 2 files, ~15 cases | 1-2 jam | ⭐⭐⭐ |

**Total: ~17 test files, ~150 test cases.**

---

## Best Practice Principles

- **AAA pattern**: Arrange-Act-Assert, satu konsep per test
- **Test behavior, bukan implementation** — jangan assert internals
- **Deterministik** — no `Date.now()` tanpa mock, no real network
- **Test data di fixture**, bukan inline di test
- **Name tests sebagai kalimat**: "returns empty array when input is null"
- **Coverage bukan target** — target area kritis (auth, CMS, public render)
- **Fast feedback** — unit < 2s total, E2E di CI saja

---

## Open Questions (belum dijawab user)

1. Mau P0 dulu aja (pure unit, 1-2 jam, no new deps), atau P0+P1 bareng?
2. Untuk E2E, ada DB test terpisah atau pakai dev DB?
3. E2E butuh API jalan di `localhost:4000` + web di `localhost:3001`. Ada docker-compose untuk ini atau manual?
4. Ada bagian yang sering broke / paling khawatir? Biar diprioritaskan.

---

## Execution Checklist

- [ ] P0: `utils.test.ts`
- [ ] P0: `content-schemas.test.ts`
- [ ] P0: `page-templates.test.ts`
- [ ] P0: `event-registration.test.ts`
- [ ] P0: Run `npm test` — all green
- [ ] P1: Install Vitest + Testing Library deps
- [ ] P1: `vitest.config.ts`
- [ ] P1: `RichTextEditor.test.tsx`
- [ ] P1: `ContentFormEditor.test.tsx`
- [ ] P1: `auth-context.test.tsx`
- [ ] P1: `api.test.ts`
- [ ] P1: `ad-art-content.test.tsx`
- [ ] P1: `article-detail.test.tsx`
- [ ] P2: Install Playwright
- [ ] P2: `playwright.config.ts`
- [ ] P2: `e2e/admin-auth.spec.ts`
- [ ] P2: `e2e/cms-edit.spec.ts`
- [ ] P2: `e2e/view-tracking.spec.ts`
- [ ] P2: `e2e/public-pages.spec.ts`
- [ ] P2: `e2e/favicon.spec.ts`
- [ ] P3: `useConfirm.test.tsx`
- [ ] P3: `useBlockData.test.tsx`
- [ ] Update `package.json` scripts
- [ ] Document in `web/README.md` atau `docs/testing.md`

---

## Industry-Standard Best Practice Frameworks

### Testing Trophy (Kent C. Dodds)
Pirámide testing klasik sudah deprecated. Industry sekarang pakai **Testing Trophy**:

```
        ┌───────────┐
        │    E2E    │  sedikit — hanya happy path kritis
        ├───────────┤
        │Integration│  BANYAK — ini sweet spot untuk app modern
        ├───────────┤
        │   Unit    │  banyak — pure logic & isolated components
        ├───────────┤
        │  Static   │  TypeScript + ESLint — catch bugs tanpa run
        └───────────┘
```

**Filosofi:** integration test paling berharga karena nangkap bug nyata antar komponen. E2E sedikit (mahal, flaky). Unit untuk edge case & pure logic.

### Shift-Left Testing
- **TDD (Test-Driven Development)** untuk fitur baru: Red → Green → Refactor
- **Linting sebelum commit** — husky pre-commit hook: `lint-staged`
- **Type-check di CI** — `tsc --noEmit` wajib di pipeline
- **Pre-PR validation** — local `npm run precommit` sebelum push

### Code Coverage Gates
Thresholds di `vitest.config.ts`:
```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  thresholds: {
    statements: 70,   // start conservative, naikkan perlahan
    branches: 65,
    functions: 70,
    lines: 70,
    // Per-file threshold — file kritis lebih tinggi
    'src/lib/**': 85,
    'src/components/admin/**': 75,
  },
  exclude: ['**/*.test.*', 'src/app/**/*.tsx', 'e2e/**'],
}
```
**Rule:** PR yang turunkan coverage > 2% → block merge.

### Mutation Testing (Stryker)
Verifikasi kualitas test — apakah test nangkap bug kalau kode diubah?
```
npx stryker init
```
- Target: `src/lib/sanitize-html.ts`, `src/lib/utils.ts` (security-critical)
- Mutation score target: **> 70%**
- Run: monthly atau sebelum release besar

### Contract Testing (API ↔ Frontend)
Validasi bahwa response API cocok dengan TypeScript types di frontend:
- **OpenAPI spec** dari API (kalau belum ada, generate dari Express routes)
- **Schema validation** runtime: `zod` parse response di `src/lib/api.ts`
- **Snapshot contract**: simpan sample response, detect breaking changes

```ts
// src/lib/api.test.ts
import { expect } from 'vitest';
test('GET /articles response matches Article[] schema', async () => {
  const data = await api.getArticles();
  expect(z.array(ArticleSchema).safeParse(data).success).toBe(true);
});
```

### Accessibility Testing (a11y)
**Wajib untuk public-facing site** — WCAG 2.1 AA compliance:
- `@axe-core/playwright` — run axe di setiap E2E page
- `eslint-plugin-jsx-a11y` — static lint
- Component test: `jest-axe` untuk isolated components

```ts
// e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
test('home page has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Performance Testing
**Core Web Vitals** — Google ranking factor:
- `@playwright/test` + `playwright-lighthouse` — Lighthouse CI di E2E
- Thresholds: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Bundle size monitoring: `@next/bundle-analyzer` + size-limit

```yaml
# .github/workflows/lighthouse.yml
- Lighthouse check di setiap PR ke homepage & key pages
- Block PR kalau Lighthouse score < 80
```

### Visual Regression Testing
- **Playwright screenshot comparison** — cheap, built-in
- **Chromatic** (kalau pakai Storybook) — untuk component library
- Threshold: 0.1% pixel diff tolerance

```ts
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.01,
});
```

### Security Testing
- **Dependency audit**: `npm audit` + `audit-ci` di CI (block high/critical)
- **OWASP ZAP** baseline scan (manual, sebelum release)
- **Secret scanning**: `gitleaks` di pre-commit
- **CSP headers test**: verify Content-Security-Policy tidak ada `unsafe-inline`
- **XSS test**: inject `<script>` di semua input form (regression untuk sanitize-html)

### Load/Stress Testing (opsional, pre-release)
- **k6** atau **Artillery** — simulate 100 concurrent users
- Target: < 500ms p95 response time
- Run: sebelum event besar (pemira, pendaftaran anggota)

---

## CI/CD Pipeline Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test & Quality Gates

on: [pull_request, push]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test              # node:test pure functions
      - run: npm run test:unit     # vitest components
      - name: Coverage report
        run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
      api:
        image: ghcr.io/ppia/api:latest
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npx audit-ci --high

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: npx @lhci/cli autorun
```

### Quality Gates (block PR kalau fail)
1. ✅ ESLint — 0 errors
2. ✅ TypeScript — 0 errors (`tsc --noEmit`)
3. ✅ Unit tests — 100% pass
4. ✅ Coverage — meet thresholds
5. ✅ E2E — 100% pass (happy path kritis)
6. ✅ Security audit — no high/critical vulns
7. ✅ Bundle size — tidak naik > 10%
8. ✅ Lighthouse — performance > 80, a11y > 90

---

## Test Data Management

### Fixtures
```
web/src/test/
├── fixtures/
│   ├── pages.ts          # sample Page objects per template
│   ├── articles.ts       # article dengan berbagai state
│   ├── users.ts          # admin, member, anonymous
│   └── events.ts         # event dengan/without registration fields
├── mocks/
│   ├── api-handlers.ts   # MSW handlers
│   └── server.ts         # MSW server setup
└── setup.ts              # global test setup
```

### Mock Service Worker (MSW)
Untuk component/integration test — mock API di network layer:
```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.get('/api/articles', () => HttpResponse.json([...])),
  http.post('/api/articles/:id/view', () => HttpResponse.json({ ok: true })),
);
```

### Test Database (untuk E2E)
- **Isolated test DB** — `ppia_test`, di-reset per test run
- **Seed data** — `prisma db seed --env test`
- **Transaction rollback** per test (kalau pakai integration test)

---

## Test Environment Strategy

| Environment | Purpose | DB | API | Reset |
|-------------|---------|-----|-----|-------|
| `test` (local) | Unit + component | mock | mock (MSW) | per test |
| `integration` | API + DB integration | test DB | real API | per run |
| `staging` | E2E + smoke | staging DB | staging API | per deploy |
| `production` | Smoke + monitoring | prod | prod | never reset |

---

## Testing Workflow per Feature

Saat develop fitur baru:

1. **Plan** — identifikasi apa yang dites (unit/integration/E2E)
2. **TDD** — tulis test dulu (Red), implementasi minimal (Green), refactor
3. **Edge cases** — null, empty, invalid, boundary values
4. **Regression** — kalau fix bug, tulis test yang reproduce bug dulu
5. **Coverage check** — pastikan file baru tercover > threshold
6. **E2E (kalau fitur user-facing)** — happy path minimal
7. **PR description** — sertakan screenshot test pass + coverage report

---

## Anti-Patterns yang Dihindari

❌ **Testing implementation details** — assert `setState` dipanggil, bukan behavior
❌ **Snapshot testing berlebihan** — fragile, tidak menjelaskan intent
❌ **Mock semua hal** — test jadi tidak bermakna
❌ **E2E untuk semua** — lambat, flaky, mahal
❌ **Coverage 100% obsession** — 70% bermakna > 100% test kosong
❌ **Test yang depend on order** — harus isolated
❌ **Real timers/network** — selalu mock `Date.now()`, `fetch`, `setTimeout`
❌ **Testing framework features** — jangan test React/Next.js internal

---

## KPI & Metrics

Track quality over time:
- **Test coverage** — Codacy / Codecov badge di README
- **Bug escape rate** — bug found in prod / total bugs (target < 5%)
- **Test execution time** — unit < 30s, E2E < 5 menit
- **Flaky test rate** — < 1% (track di CI)
- **MTTR (Mean Time To Recovery)** — bug fix time (target < 24h)

---

## Phased Rollout

### Phase 0 — Foundation (1 minggu)
- [ ] Install Vitest + Testing Library + Playwright
- [ ] Setup `vitest.config.ts`, `playwright.config.ts`
- [ ] Setup MSW + fixtures directory
- [ ] Setup CI GitHub Actions (lint + typecheck + unit)
- [ ] Tambah pre-commit hook (husky + lint-staged)

### Phase 1 — P0 Unit (1-2 minggu)
- [ ] Tulis semua unit test di plan atas (P0 section)
- [ ] Setup coverage threshold
- [ ] Integrate ke CI

### Phase 2 — P1 Component & Integration (2-3 minggu)
- [ ] Component tests (RichTextEditor, ContentFormEditor, auth)
- [ ] Integration test AD/ART render
- [ ] API contract tests

### Phase 3 — P2 E2E (2-3 minggu)
- [ ] Playwright setup dengan test DB
- [ ] 5 E2E scenarios di plan atas
- [ ] Visual regression snapshots

### Phase 4 — Advanced (ongoing)
- [ ] Mutation testing (Stryker) — monthly
- [ ] Lighthouse CI
- [ ] Accessibility audit
- [ ] Security audit
- [ ] Load test sebelum event besar

---

## Tooling Summary

| Category | Tool | Installed | Priority |
|----------|------|-----------|----------|
| Test runner (unit) | `node:test` | ✅ | — |
| Test runner (component) | Vitest | ❌ | P1 |
| Component testing | @testing-library/react | ❌ | P1 |
| E2E | Playwright | ❌ | P2 |
| API mock | MSW | ❌ | P1 |
| Coverage | c8 / v8 | ❌ | P1 |
| Coverage badge | Codecov | ❌ | P2 |
| Mutation | Stryker | ❌ | P4 |
| Visual regression | Playwright snapshots | (built-in) | P3 |
| Accessibility | @axe-core/playwright | ❌ | P3 |
| Performance | Lighthouse CI | ❌ | P4 |
| Security | audit-ci + gitleaks | ❌ | P2 |
| Linting | ESLint + eslint-plugin-jsx-a11y | ✅ (partial) | P1 |

---

## References (Industry Standards)

- **Google Testing Blog** — testing on the toilet (TOT) series
- **Kent C. Dodds** — "The Testing Trophy" & TestingJavaScript.com
- **Martin Fowler** — "Test Pyramid" & "Practical Test-Driven Development"
- **IEEE 829** — test documentation standard
- **ISO/IEC 25010** — software quality model
- **WCAG 2.1 AA** — accessibility standard
- **OWASP Top 10** — security testing baseline
- **Google Web Vitals** — performance metrics
- **Cypress vs Playwright** — Playwright dipilih karena cross-browser & modern

---

## Open Questions (belum dijawab user)

1. Mau mulai Phase 0 sekarang (setup tooling) atau langsung Phase 1 (nulis test)?
2. Ada CI/CD existing (GitHub Actions / lainnya)? Atau setup dari nol?
3. Untuk E2E: ada staging environment atau pakai local docker-compose?
4. Budget untuk tooling berbayar (Chromatic, Snyk, BrowserStack)? Atau all open-source?
5. Tim ada berapa orang yang akan nulis test? (pengaruh ke training & ownership model)
6. Ada compliance requirement khusus (GDPR, data privacy) yang perlu dites?

---

## Final Checklist (master)

- [ ] Phase 0: Tooling setup (Vitest, Playwright, MSW, CI)
- [ ] Phase 1: All P0 unit tests written & passing
- [ ] Phase 1: Coverage threshold enforced
- [ ] Phase 2: Component tests for critical UI
- [ ] Phase 2: API contract tests
- [ ] Phase 2: Integration test AD/ART & article detail
- [ ] Phase 3: E2E happy path (auth, CMS, view tracking)
- [ ] Phase 3: Visual regression baseline
- [ ] Phase 3: CI pipeline complete
- [ ] Phase 4: Mutation testing monthly
- [ ] Phase 4: Lighthouse CI on PR
- [ ] Phase 4: Accessibility audit pass
- [ ] Phase 4: Security audit automation
- [ ] Documentation: `docs/testing.md` untuk contributor
- [ ] README badge: coverage, build status, a11y
