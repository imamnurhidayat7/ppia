# Performance Testing

> Companion to [`PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md). This guide explains how to **measure** runtime performance; the audit documents **why** each issue matters.

The `npm run perf:test` script runs the full suite (Lighthouse + autocannon load test + bundle analyzer) and saves everything under `docs/perf-reports/<timestamp>/` so you can diff before/after each fix.

---

## Quick start

```bash
# 1. Make sure dev stack is running
docker compose -f docker-compose.dev.yml up -d   # if using Docker for Postgres
npm run dev                                       # starts API (:4000) + web (:3001)

# 2. In a SECOND terminal, run the perf suite
cd web && npm run perf:test

# 3. Open the report
open docs/perf-reports/<latest>/lighthouse-home.html
```

The suite takes **5–15 minutes** end to end (most of the time is the production build for the bundle analyzer).

---

## What gets produced

For each run, a timestamped folder is created at `docs/perf-reports/YYYYMMDD-HHMMSS/`:

```
docs/perf-reports/20260731-080000/
├── lighthouse.log                       # lhci stdout/stderr
├── report-*.html                        # Lighthouse HTML reports (one per URL)
├── summary.txt                          # perf/a11y/bp/seo scores table
├── api-_.txt                            # autocannon raw JSON per endpoint
├── api-_.summary.txt                    # parsed latency / throughput
├── api-summary.txt                      # aggregate table across endpoints
└── bundle/
    ├── build.log                        # `next build` stdout
    ├── top-chunks.txt                   # largest 10 chunks by size
    ├── total-size.txt                   # total static JS+CSS in MB
    ├── build-manifest.json              # Next.js manifests (if present)
    └── client.html, server.html         # bundle analyzer interactive reports
```

The folder is the snapshot. To compare two runs:

```bash
# Diff top chunks
diff -u docs/perf-reports/20260731-080000/bundle/top-chunks.txt \
        docs/perf-reports/20260802-140000/bundle/top-chunks.txt

# Diff aggregate API
diff -u docs/perf-reports/20260731-080000/api-summary.txt \
        docs/perf-reports/20260802-140000/api-summary.txt
```

---

## Individual scripts

If you only want one phase, run them directly:

| Command | What it does | Time |
| --- | --- | --- |
| `npm run perf:test` | Lighthouse + API + bundle | 5–15 min |
| `npm run perf:lighthouse` | Lighthouse only | 1–2 min |
| `npm run perf:api` | API load test only | 3–5 min |
| `npm run perf:bundle` | Bundle analyzer only | 2–3 min |
| `npm run lint` | (existing) ESLint | — |
| `npm run typecheck` | (existing) TS check | — |

### `npm run perf:test`

The master script. Runs all three phases, prerequisite checks, then prints a summary with the verdict on connection-pool health (see "Verdict" below).

Flags:
- `--skip-build` — skip the bundle analyzer (much faster, ~4 min instead of 15).

### `npm run perf:lighthouse`

Wraps `lhci autorun` against 4 public pages: `/`, `/about`, `/activities`, `/contact`. Writes HTML reports plus a `summary.txt` table of perf/a11y/best-practices/SEO scores.

### `npm run perf:api`

Hammers the read-heavy public endpoints with autocannon. Each endpoint is run independently with `-c 50 -d 30` (50 concurrent connections for 30 s) by default.

Tunable via env vars:

```bash
CONCURRENCY=100 DURATION_S=60 npm run perf:api     # heavier stress
API_BASE=https://staging.example.com npm run perf:api  # test staging
```

After running, the script checks whether **any** endpoint has p95 > 1000 ms. If yes, it warns that this matches the `connection_limit=1` symptom from audit issue C1.

### `npm run perf:bundle`

Just `ANALYZE=true next build`. Opens interactive bundle analyzer pages.

---

## Prerequisites

| Tool | Why | Install |
| --- | --- | --- |
| Chrome (or Chromium) | Lighthouse headless | https://www.google.com/chrome |
| `autocannon` | API load testing | `npm install -g autocannon` |
| `@lhci/cli` | Lighthouse CI runner | `npm install -g @lhci/cli` |
| `jq` | Parse autocannon JSON | `brew install jq` (macOS) |
| PostgreSQL reachable | Data for endpoints | see [Getting started](getting-started.md) |

If you skip the global installs, the scripts will use `npx --yes <pkg>` automatically — slightly slower on first run.

---

## Verdict cheatsheet

After `npm run perf:test`, look for these signals:

### Lighthouse
- **Performance ≥ 90** — target.
- **LCP ≤ 1.5 s** — biggest paint, biggest contributor to perceived load.
- **CLS ≤ 0.1** — layout stability, hits raw `<img>` (audit W3).
- **TBT ≤ 200 ms** — main-thread blocking; high values usually = too much JS.
- **Unused JavaScript** — tells you how much code can be removed via dynamic imports (audit C5).

### autocannon
- **p95 < 300 ms** for public GET endpoints under c=50.
- **0 errors / 0 timeouts** at concurrency 50.
- **Throughput ≥ 100 req/s** for `/health`.
- If p95 > 1000 ms across the board → almost certainly the connection_limit=1 bottleneck (C1). Fix: bump to `connection_limit=25` in `api/.env` and re-run.

### Bundle
- **Total static bundle ≤ 4 MB** — current 6.1 MB; target after fixes ~4 MB.
- **No single chunk > 300 KB** — current 484 KB vendor chunks. Look at what's inside.
- **Admin-only code absent from public route chunks** — verify dynamic imports landed (C5).

---

## Suggested workflow

Run baseline now (audit was just done):

```bash
mkdir -p ~/perf-history
cp -r docs/perf-reports/<latest> ~/perf-history/baseline-$(date +%Y%m%d)
```

Then for each phase of the audit:

1. **Phase 1 (quick wins)** — bump `connection_limit=25`, add `compression`, add `helmet`, add cache headers in `next.config.ts`.
2. Restart API + web.
3. Run `npm run perf:test -- --skip-build` (skip build — those changes don't move bundle).
4. Compare Lighthouse + autocannon with baseline.

For Phase 2 (bundle changes), include the bundle analyzer:

```bash
npm run perf:test
```

For Phase 3 (SSR migration), focus on Lighthouse since that's where the gains show up.

---

## CI integration (optional)

To gate PRs on perf regressions, add to `.github/workflows/ci.yml`:

```yaml
- name: Performance smoke test
  run: |
    npm run build:all
    npm run start &
    sleep 10
    npm run perf:api   # exits non-zero if any endpoint p95 > 1000ms
```

For full Lighthouse gates, install `lhci` in CI and configure budgets in `.lighthouserc.json`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `lighthouse` exits with `Could not find Chrome` | Chrome not installed at standard path | Install Chrome or pass `--chromePath=$CHROME_PATH` |
| All API tests show p95 > 2000ms | `connection_limit=1` (audit C1) | Bump to 25 in `api/.env` |
| API tests show ECONNREFUSED | API not running | `npm run dev` first |
| Bundle build fails on `jsdom` ESM error | Node < 22.12 | Upgrade to Node 22+ |
| Lighthouse reports "lab data may be inaccurate" | `--headless=new` flag, no GPU | Add `--chrome-flags="--no-sandbox"` (already set) |
| `jq: command not found` | macOS default | `brew install jq` |
| `lhci` upload fails | no network to temporary-public-storage | Remove `upload` block from temp config, or set `LHCI_GITHUB_APP_TOKEN` |

---

## See also

- [`PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md) — the audit this script validates against.
- [`frontend.md`](frontend.md) — design system and dashboard conventions referenced in the audit.
- [Next.js performance docs](https://nextjs.org/docs/app/building-your-application/optimizing) — official optimization guide.
