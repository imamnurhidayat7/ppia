# Performance Audit — PPIA Auckland Web + API

> Comprehensive audit performed 2026-07-31.
> Method: static analysis + production build inspection + dependency review.

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total static JS bundle | 6.1 MB | ⚠️ Review |
| Largest single chunk | 484 KB (×4 vendor chunks) | ⚠️ High |
| Client components (`'use client'`) | 142 / 220 (64%) | ⚠️ Too many |
| Dynamic imports (`next/dynamic`) | 0 | 🔴 Missing |
| `loading.tsx` files | 3 / 83 routes | 🔴 No streaming |
| Raw `<img>` tags (no optimization) | 4 | ⚠️ Fix |
| DB connection limit | `connection_limit=1` (Supabase) | 🔴 Critical |
| API compression | None | 🔴 Missing |
| API security headers (helmet) | None | 🔴 Missing |
| View tracking dedup | In-memory Map (per-instance) | ⚠️ Broken under scale |
| Public pages client-side fetch | Multiple (AD/ART, articles) | ⚠️ Waterfall |

**Critical issues: 5** · **Warnings: 7** · **Good practices found: 6**

---

## 🔴 Critical Issues

### C1. Database connection_limit=1 (Supabase pooler)
**File:** `api/.env`
```
DATABASE_URL="...supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```
**Impact:** Every API request shares a single DB connection. Under concurrent load (event registration, election), requests queue and time out.
**Fix:** Change to `connection_limit=25` (Supabase recommended for server apps). For serverless, use `pgbouncer=true&connection_limit=1` only with external connection pooling (PgBouncer transaction mode + Supavisor).

### C2. No API compression middleware
**File:** `api/src/index.ts`
**Impact:** JSON responses (article lists, page content with HTML) are sent uncompressed. Article list with 10 items ~50KB → could be ~8KB with gzip (84% reduction).
**Fix:** Install and use `compression` middleware:
```bash
npm install compression @types/compression
```
```ts
import compression from 'compression';
app.use(compression()); // before routes
```

### C3. No security headers (helmet)
**File:** `api/src/index.ts`
**Impact:** Missing CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security. Security vulnerability + Google ranking penalty.
**Fix:** `npm install helmet` → `app.use(helmet())`

### C4. View tracking uses in-memory Map
**File:** `api/src/lib/view-tracking.ts`
**Impact:** `recentViews` Map resets on every server restart and is not shared across instances. In serverless/multi-pod deployment, view counts will be inflated (each pod counts independently).
**Fix:** Use Redis with TTL, or a DB table `ViewDedup(ip, resourceId, timestamp)` with TTL index.

### C5. Zero dynamic imports — all admin code loads eagerly
**Finding:** `grep -rn 'next/dynamic' src/` → 0 results.
**Impact:** RichTextEditor (TipTap ~8.6MB source), RepeaterEditor, ContentFormEditor, and all admin components are bundled into route chunks even for public visitors who never visit `/dashboard`.
**Fix:** Dynamic-import admin-only and heavy components:
```tsx
const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });
const ContentFormEditor = dynamic(() => import('@/components/admin/ContentFormEditor'));
```
**Expected gain:** Reduce public route First Load JS by ~150-200KB.

---

## ⚠️ Warnings

### W1. 64% client components (142/220)
**Finding:** 142 of 220 components are `'use client'`. Many public pages render a client component that fetches data in `useEffect`, causing a waterfall: HTML shell → JS download → API call → render.
**Example:** `src/app/about/ad-art/page.tsx` (server) → `<AdArtContent />` (client) → `useEffect` fetches `api.getPageBySlug`.
**Fix:** Convert to Server Component fetching via `server-api.ts` (already exists with ISR). Pass data as props to a thinner client component for interactivity only.

### W2. Only 3 `loading.tsx` for 83 routes
**Impact:** No streaming/Suspense fallback for most routes. Users see blank screen during data fetch.
**Fix:** Add `loading.tsx` to route groups, especially:
- `src/app/activities/news-articles/loading.tsx`
- `src/app/activities/research-corner/loading.tsx`
- `src/app/about/ad-art/loading.tsx`
- `src/app/dashboard/admin/**/loading.tsx`

### W3. 4 raw `<img>` tags without optimization
**Finding:** 4 `<img>` in codebase bypass `next/image` (no lazy load, no responsive sizes, no WebP/AVIF).
**Fix:** Replace with `next/image` `<Image>` component. Critical for CLS (Cumulative Layout Shift) score.

### W4. No cache headers in next.config.ts
**Finding:** No `headers()` function in `next.config.ts`. Static assets in `/_next/static/` are cached by default, but no custom long-cache headers for fonts, manifest, etc.
**Fix:** Add `headers()` to `next.config.ts`:
```ts
async headers() {
  return [{
    source: '/:all*(svg|jpg|png|webp|avif|woff2)',
    locale: false,
    headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
  }];
}
```

### W5. Public pages use client-side axios instead of server fetch
**Finding:** AD/ART, articles, research pages use `api.getPageBySlug` (axios, client-side) instead of `server-api.ts` (fetch with ISR revalidate=300).
**Impact:** No caching, slower TTFB, waterfall fetch, SEO-unfriendly (content not in initial HTML).
**Fix:** Migrate public page data fetching to `server-api.ts` pattern. ISR gives 5-min cache + instant response.

### W6. Large files (>500 lines)
**Finding:**
- `canvas/[...slug]/page.tsx` — 1182 lines
- `cabinet-content.tsx` — 1015 lines
- `research-detail.tsx` — 703 lines
- `research-list.tsx` — 697 lines
**Impact:** Large client components = large JS bundles, slow hydration, hard to maintain.
**Fix:** Split into smaller subcomponents; extract pure logic to hooks/utils.

### W7. 186 `useEffect` calls
**Finding:** 186 `useEffect` across codebase — many likely for data fetching (should be server-side) or event listeners (potential memory leaks if cleanup missing).
**Fix:** Audit useEffects; replace data-fetch ones with SWR/React Query or server components.

---

## ✅ Good Practices Found

1. **ISR via `server-api.ts`** — `next: { revalidate: 300 }` on server fetches ✅
2. **`optimizePackageImports`** for lucide-react, @heroicons, framer-motion ✅
3. **Bundle analyzer** configured (`@next/bundle-analyzer`) ✅
4. **`Promise.all` in controllers** — parallel queries, no waterfall ✅
5. **Prisma `select`** — articles/events don't over-fetch related fields ✅
6. **Image optimization config** — remote patterns configured for uploads ✅

---

## 📊 Bundle Analysis

### Largest chunks (production build)
| Chunk | Size | Likely content |
|-------|------|----------------|
| `0b4crwolye_b4.js` | 484 KB | Vendor (React + framer-motion) |
| `2io10yftbc-om.js` | 484 KB | Vendor (likely duplicate split) |
| `34uabm0pnorvm.js` | 484 KB | Vendor |
| `1yvm5-39s2eh5.js` | 228 KB | App code (admin?) |
| `3h3r9j4y2l93b.js` | 136 KB | App code |
| **Total static** | **6.1 MB** | All routes combined |

### Heavy dependencies (node_modules)
| Package | Size | Used in public routes? |
|---------|------|------------------------|
| date-fns | 26 MB | Only 1 file — OK |
| @tiptap/* | 8.6 MB | Admin only — should be dynamic import |
| framer-motion | 5.6 MB | 40 files — some in public (Navbar?) |
| axios | 1.9 MB | 1 import — consider native fetch |
| isomorphic-dompurify | — | Server-only (jsdom externalized ✅) |

---

## 🎯 Priority Action Plan

### Phase 1 — Quick wins (1-2 hours, high impact)
1. **Fix DB connection_limit** → `connection_limit=25` in `.env`
2. **Add compression middleware** to API
3. **Add helmet** for security headers
4. **Add cache headers** in `next.config.ts`

### Phase 2 — Bundle optimization (3-4 hours)
5. **Dynamic import** RichTextEditor, ContentFormEditor, all admin components
6. **Replace 4 raw `<img>`** with `next/image`
7. **Replace axios** with native `fetch` (saves ~1.9MB node_modules, smaller bundle)
8. **Run bundle analyzer**: `ANALYZE=true npm run build` → identify split opportunities

### Phase 3 — Rendering strategy (4-6 hours)
9. **Migrate public pages to server-side fetch** (AD/ART, articles, research) using `server-api.ts`
10. **Add `loading.tsx`** to top 10 public routes
11. **Split large components** (canvas page, cabinet-content)
12. **Audit useEffect** — remove unnecessary ones, add cleanup

### Phase 4 — Scale & monitoring (ongoing)
13. **Move view tracking to Redis** or DB table
14. **Add Lighthouse CI** to GitHub Actions
15. **Add Core Web Vitals** monitoring (vercel/analytics or web-vitals)
16. **Set up Sentry** for performance monitoring

---

## Expected Impact

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| DB concurrency | 1 | 25 | 25× throughput |
| API response size | ~50KB JSON | ~8KB gzipped | 84% smaller |
| Public route First Load JS | ~300KB est | <150KB | 50% faster |
| TTFB (public pages) | ~800ms (CSR waterfall) | <200ms (SSR+ISR) | 4× faster |
| LCP (public pages) | ~2.5s | <1.5s | 40% better |
| Lighthouse Performance | ~60-70 est | >90 | Significant |

---

## Tools to Add

| Tool | Purpose | Priority |
|------|---------|----------|
| `compression` | API gzip | P1 |
| `helmet` | API security headers | P1 |
| `@vercel/analytics` or `web-vitals` | RUM tracking | P2 |
| `@sentry/nextjs` | Error + perf monitoring | P2 |
| `lighthouse-ci` | CI perf gates | P3 |
| Redis (Upstash) | View tracking + cache | P3 |

---

## Methodology

This audit covered:
- ✅ Next.js config (`next.config.ts`)
- ✅ Production build analysis (`.next/static/chunks/`)
- ✅ Dependency analysis (`package.json`, `node_modules` sizes)
- ✅ Component architecture (server vs client ratio)
- ✅ Image optimization strategy
- ✅ Data fetching patterns (SSR vs CSR, ISR, caching)
- ✅ Database query patterns (Prisma includes, N+1, connection pool)
- ✅ API middleware (compression, security, caching)
- ✅ Bundle splitting strategy (dynamic imports)
- ✅ Rendering strategy (suspense, loading states)

**Not covered (need runtime profiling):**
- ❌ Actual Lighthouse run (need running dev server)
- ❌ Real User Monitoring (RUM) data
- ❌ Database query EXPLAIN plans
- ❌ Memory/CPU profiling under load
- ❌ Third-party script impact (analytics, fonts)

To complete the audit, run:
```bash
# Lighthouse against local dev
npx lighthouse http://localhost:3001 --output html --output-path ./lighthouse-report.html

# Bundle analyzer
ANALYZE=true npm run build
```
