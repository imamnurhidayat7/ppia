#!/usr/bin/env bash
# perf-api.sh — API load test via autocannon.
#
# Hammers the read-heavy public endpoints and one write endpoint to surface
# connection pool / serialization issues (PERFORMANCE_AUDIT.md C1).
#
# Args:
#   $1  report directory (required)
#   $2  autocannon command (optional, default "npx --yes autocannon")
#
# Configurable via env:
#   API_BASE       default http://localhost:4000
#   CONCURRENCY    default 50
#   DURATION_S     default 30

set -uo pipefail

REPORT_DIR="${1:-$(pwd)/perf-reports/$(date +%Y%m%d-%H%M%S)}"
AUTOCANNON="${2:-npx --yes autocannon}"

API_BASE="${API_BASE:-http://localhost:4000}"
CONCURRENCY="${CONCURRENCY:-50}"
DURATION_S="${DURATION_S:-30}"

mkdir -p "$REPORT_DIR"

B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; D="\033[0m"
ok()   { echo -e "${G}✓${D} $*"; }
warn() { echo -e "${Y}⚠${D} $*"; }
fail() { echo -e "${R}✗${D} $*"; }
section() { echo -e "\n${B}── $* ──${D}"; }

# Read endpoints — most likely to saturate DB connection pool.
ENDPOINTS=(
  "/api/articles|Articles list"
  "/api/events|Events list"
  "/api/landing-sections|Landing sections (homepage)"
  "/api/elections/active|Active election"
  "/api/search?q=event|Search"
  "/api/settings|Public settings"
  "/health|Health check"
)

# Write endpoint (POST /api/event-registration) requires auth; skip by default
# and surface a hint in the report instead.

run_load() {
  local path=$1 label=$2
  local url="${API_BASE}${path}"
  local out="$REPORT_DIR/api-$(echo "$path" | tr '/?&=' '____').txt"

  echo ""
  echo "  → $label  ($url)"
  echo "    c=$CONCURRENCY  d=${DURATION_S}s  →  $out"

  if ! $AUTOCANNON \
      --json \
      -c "$CONCURRENCY" \
      -d "$DURATION_S" \
      "$url" \
      > "$out" 2>&1; then
    warn "autocannon failed for $url — see $out"
    return 1
  fi

  # Extract key metrics from JSON output (autocannon prints human then json).
  # The --json flag writes only JSON to stdout.
  if command -v jq >/dev/null 2>&1; then
    local summary="$REPORT_DIR/api-$(echo "$path" | tr '/?&=' '____').summary.txt"
    jq -r '
      "  Latency p50  : \(.latency.p50) ms",
      "  Latency p95  : \(.latency.p95) ms",
      "  Latency p99  : \(.latency.p99) ms",
      "  Latency max  : \(.latency.max) ms",
      "  Throughput   : \(.requests.average) req/s",
      "  Total reqs   : \(.requests.total)",
      "  Errors       : \(.errors)",
      "  Timeouts     : \(.timeouts)",
      "  2xx responses: \(.["2xx"])",
      "  4xx responses: \(.["4xx"])",
      "  5xx responses: \(.["5xx"])",
      "  Throughput   : \(.throughput.average) bytes/s"
    ' "$out" | tee "$summary"
  else
    tail -n 40 "$out"
    warn "Install jq for parsed summary"
  fi
}

echo "API base: $API_BASE  |  concurrency: $CONCURRENCY  |  duration: ${DURATION_S}s"
echo "Reports → $REPORT_DIR"

# Sanity check
if ! curl -sf -o /dev/null --max-time 5 "${API_BASE}/health"; then
  fail "API not reachable at ${API_BASE}/health — start 'npm run dev'"
  exit 1
fi

for entry in "${ENDPOINTS[@]}"; do
  IFS='|' read -r path label <<< "$entry"
  run_load "$path" "$label"
done

# Aggregate comparison file
section "Aggregate"
SUMMARY="$REPORT_DIR/api-summary.txt"
{
  echo "=== API load test summary ==="
  echo "Base: $API_BASE  |  c=$CONCURRENCY  d=${DURATION_S}s"
  echo ""
  printf "%-32s  %8s  %8s  %8s  %8s\n" "Endpoint" "p50(ms)" "p95(ms)" "req/s" "errors"
  for f in "$REPORT_DIR"/api-*.txt; do
    [ -f "$f" ] || continue
    base=$(basename "$f" .txt)
    name=${base#api-}
    if command -v jq >/dev/null 2>&1 && jq -e . "$f" >/dev/null 2>&1; then
      printf "%-32s  %8s  %8s  %8s  %8s\n" \
        "$name" \
        "$(jq -r '.latency.p50 // "?"' "$f")" \
        "$(jq -r '.latency.p95 // "?"' "$f")" \
        "$(jq -r '.requests.average // "?"' "$f")" \
        "$(jq -r '.errors // "?"' "$f")"
    fi
  done
} | tee "$SUMMARY"

# Check for the connection_limit=1 tell-tale: very high p95 on the read endpoints
# when concurrency is moderate.
section "Verdict"
HIGH_P95_COUNT=0
if command -v jq >/dev/null 2>&1; then
  for f in "$REPORT_DIR"/api-*.txt; do
    [ -f "$f" ] || continue
    p95=$(jq -r '.latency.p95 // 0' "$f" 2>/dev/null)
    if [ -n "$p95" ] && [ "$p95" != "0" ] && [ "$p95" -gt 1000 ] 2>/dev/null; then
      HIGH_P95_COUNT=$((HIGH_P95_COUNT + 1))
    fi
  done
fi

if [ "$HIGH_P95_COUNT" -gt 0 ]; then
  warn "$HIGH_P95_COUNT endpoint(s) have p95 > 1000ms — likely connection pool bottleneck"
  warn "Fix: increase connection_limit in api/.env DATABASE_URL (PERFORMANCE_AUDIT.md C1)"
else
  ok "All endpoints p95 < 1000ms — connection pool looks healthy"
fi

ok "API reports → $REPORT_DIR"
