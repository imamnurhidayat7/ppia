#!/usr/bin/env bash
# perf-test.sh — Master performance test runner.
#
# Runs Lighthouse + autocannon load tests + bundle analysis and saves all
# reports to docs/perf-reports/<timestamp>/. Use to measure before/after a
# fix from PERFORMANCE_AUDIT.md.
#
# Usage:
#   bash scripts/perf-test.sh                 # full run
#   bash scripts/perf-test.sh --skip-build    # skip bundle analyzer (faster)
#   bash scripts/perf-test.sh --baseline      # alias for the default run
#
# Prerequisites (checked at startup):
#   - dev server running at http://localhost:4000 (API) and :3001 (web)
#   - PostgreSQL reachable (DATA_SOURCE=local or DATA_SOURCE=supabase)
#   - Chrome installed (for Lighthouse headless)
#   - autocannon installed globally or via npx
#   - lhci installed globally or via npx

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/perf-reports/$(date +%Y%m%d-%H%M%S)"
SKIP_BUILD=false

# --- Argument parsing -------------------------------------------------------
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --baseline)   : ;; # default mode
    --help|-h)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$REPORT_DIR"

# --- Pretty output -----------------------------------------------------------
B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; C="\033[36m"; D="\033[0m"
hdr()  { echo -e "\n${B}${C}═══ $* ═══${D}"; }
ok()   { echo -e "${G}✓${D} $*"; }
warn() { echo -e "${Y}⚠${D} $*"; }
fail() { echo -e "${R}✗${D} $*"; }

# --- Prerequisite checks -----------------------------------------------------
hdr "Prerequisites"

check_url() {
  local url=$1
  if curl -sf -o /dev/null --max-time 5 "$url"; then
    ok "$url reachable"
    return 0
  else
    fail "$url not reachable — start the dev server (npm run dev) first"
    return 1
  fi
}

PREREQ_OK=true
check_url "http://localhost:4000/health" || PREREQ_OK=false
check_url "http://localhost:3001/" || PREREQ_OK=false

# Detect chrome for Lighthouse
CHROME_PATH=""
for p in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "/usr/bin/google-chrome" "/usr/bin/chromium"; do
  [ -x "$p" ] && CHROME_PATH="$p" && break
done
if [ -z "$CHROME_PATH" ]; then
  warn "Chrome not found in common paths — Lighthouse may fail. Install Chrome from https://www.google.com/chrome"
else
  ok "Chrome found: $CHROME_PATH"
fi

# Detect tools
if command -v autocannon >/dev/null 2>&1; then
  AUTOCANNON="autocannon"
  ok "autocannon: $(autocannon --version 2>&1 | head -n1)"
else
  AUTOCANNON="npx --yes autocannon"
  warn "autocannon not global — will use 'npx --yes autocannon' (slower first run)"
fi

if command -v lhci >/dev/null 2>&1; then
  LHCI="lhci"
  ok "lhci: $(lhci --version 2>&1 | head -n1)"
else
  LHCI="npx --yes @lhci/cli"
  warn "lhci not global — will use 'npx --yes @lhci/cli' (slower first run)"
fi

if [ "$PREREQ_OK" = false ]; then
  fail "Prerequisites missing. Start dev server and re-run."
  exit 1
fi

# --- Phase 1: Lighthouse -----------------------------------------------------
hdr "Phase 1/3 — Lighthouse"
echo "  Output: $REPORT_DIR/lighthouse-*"
bash "$ROOT_DIR/scripts/perf-lighthouse.sh" "$REPORT_DIR" "$CHROME_PATH" "$LHCI"
LIGHTHOUSE_EXIT=$?
[ $LIGHTHOUSE_EXIT -eq 0 ] && ok "Lighthouse done" || warn "Lighthouse exited $LIGHTHOUSE_EXIT"

# --- Phase 2: API load test --------------------------------------------------
hdr "Phase 2/3 — API load test (autocannon)"
echo "  Output: $REPORT_DIR/api-*.txt"
bash "$ROOT_DIR/scripts/perf-api.sh" "$REPORT_DIR" "$AUTOCANNON"
API_EXIT=$?
[ $API_EXIT -eq 0 ] && ok "API load test done" || warn "API load test exited $API_EXIT"

# --- Phase 3: Bundle analyzer ------------------------------------------------
if [ "$SKIP_BUILD" = false ]; then
  hdr "Phase 3/3 — Bundle analyzer"
  echo "  Output: $REPORT_DIR/bundle/"
  mkdir -p "$REPORT_DIR/bundle"

  cd "$ROOT_DIR/web"
  if ANALYZE=true npx --yes next build > "$REPORT_DIR/bundle/build.log" 2>&1; then
    ok "Bundle build complete"

    # Copy client/server manifests if present
    for f in .next/build-manifest.json .next/app-build-manifest.json .next/build-id; do
      [ -f "$f" ] && cp "$f" "$REPORT_DIR/bundle/"
    done

    # Tally chunk sizes
    if [ -d .next/static/chunks ]; then
      echo "  Top 10 chunks by size:"
      find .next/static/chunks -type f -name '*.js' -exec ls -l {} \; 2>/dev/null |
        awk '{ printf("    %8d  %s\n", $5, $NF) }' |
        sort -rn |
        head -n 10 > "$REPORT_DIR/bundle/top-chunks.txt"
      cat "$REPORT_DIR/bundle/top-chunks.txt"
      ok "Top chunks → $REPORT_DIR/bundle/top-chunks.txt"
    fi

    # Total JS size
    if [ -d .next/static ]; then
      TOTAL_BYTES=$(find .next/static -type f \( -name '*.js' -o -name '*.css' \) -exec stat -f%z {} \; 2>/dev/null | awk '{s+=$1} END {print s}')
      if [ -n "$TOTAL_BYTES" ]; then
        TOTAL_MB=$(awk -v b="$TOTAL_BYTES" 'BEGIN { printf "%.2f", b/1024/1024 }')
        echo "  Total static bundle (JS+CSS): ${TOTAL_MB} MB" | tee "$REPORT_DIR/bundle/total-size.txt"
      fi
    fi

    # Try to copy the analyzer HTML reports if produced
    for html in .next/analyze/client.html .next/analyze/server.html .next/analyze/edge.html; do
      [ -f "$html" ] && cp "$html" "$REPORT_DIR/bundle/$(basename "$html")"
    done
  else
    warn "Bundle build failed — see $REPORT_DIR/bundle/build.log"
  fi
  cd "$ROOT_DIR"
else
  echo "  Skipped (--skip-build)"
fi

# --- Summary -----------------------------------------------------------------
hdr "Summary"
echo "  Report dir: $REPORT_DIR"
echo ""
echo "  Files:"
find "$REPORT_DIR" -type f | sort | sed 's/^/    /'
echo ""
echo "  Open Lighthouse report:"
LH_FILE=$(find "$REPORT_DIR" -name 'lighthouse-home.html' | head -n1)
[ -n "$LH_FILE" ] && echo "    open \"$LH_FILE\""

echo ""
ok "Done. Compare with previous run by diffing top-chunks.txt and total-size.txt."
