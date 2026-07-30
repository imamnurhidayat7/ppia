#!/usr/bin/env bash
# perf-lighthouse.sh — Run Lighthouse against key public + dashboard pages.
#
# Args:
#   $1  report directory (required)
#   $2  chrome binary path (optional, auto-detected)
#   $3  lhci command (optional, default: "npx --yes @lhci/cli")

set -uo pipefail

REPORT_DIR="${1:-$(pwd)/perf-reports/$(date +%Y%m%d-%H%M%S)}}"
CHROME_PATH="${2:-}"
LHCI="${3:-npx --yes @lhci/cli}"

mkdir -p "$REPORT_DIR"

B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; D="\033[0m"
ok()   { echo -e "${G}✓${D} $*"; }
warn() { echo -e "${Y}⚠${D} $*"; }
fail() { echo -e "${R}✗${D} $*"; }

# Pages to test (slug, label, categories). Use --quiet to suppress lhci chatter.
PAGES=(
  "/|Homepage|performance,accessibility,best-practices,seo"
  "/about|About|performance,accessibility,best-practices,seo"
  "/activities|Activities|performance,accessibility,best-practices,seo"
  "/contact|Contact|performance,accessibility,best-practices,seo"
)

# Build lhci config in a temp dir so we can target multiple URLs in one run.
TMPDIR_CFG=$(mktemp -d)
cat > "$TMPDIR_CFG/lighthouserc.json" <<EOF
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3001/",
        "http://localhost:3001/about/ad-art",
        "http://localhost:3001/contact",
        "http://localhost:3001/pemira"
      ],
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop",
        "chromeFlags": "--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
      }
    },
    "upload": { "target": "filesystem", "outputDir": "$REPORT_DIR/.lighthouseci" }
  }
}
EOF

CHROME_FLAGS=""
[ -n "$CHROME_PATH" ] && CHROME_FLAGS="--chromePath=$CHROME_PATH"

echo "Running Lighthouse on ${#PAGES[@]} pages → $REPORT_DIR"

# Run lhci with the temp config
if $LHCI autorun \
    --config="$TMPDIR_CFG/lighthouserc.json" \
    $CHROME_FLAGS \
    > "$REPORT_DIR/lighthouse.log" 2>&1; then

  ok "lhci completed"

  # The lhci report is HTML — find the latest one in ~/.lighthouseci or app dir
  LHCI_REPORT_DIR="$ROOT_DIR/.lighthouseci"
  [ -d "$LHCI_REPORT_DIR" ] || LHCI_REPORT_DIR="$HOME/.lighthouseci"

  if [ -d "$LHCI_REPORT_DIR" ]; then
    # Copy most recent report files
    find "$LHCI_REPORT_DIR" -name '*.html' -newer "$TMPDIR_CFG/lighthouserc.json" \
      -exec cp {} "$REPORT_DIR/" \; 2>/dev/null || true

    REPORT_COUNT=$(find "$REPORT_DIR" -maxdepth 1 -name 'report-*.html' | wc -l | tr -d ' ')
    if [ "$REPORT_COUNT" -gt 0 ]; then
      ok "Copied $REPORT_COUNT Lighthouse HTML reports"
    else
      warn "No lhci reports found in $LHCI_REPORT_DIR — check $REPORT_DIR/lighthouse.log"
    fi
  fi

  # Extract perf scores for at-a-glance comparison
  cat > "$REPORT_DIR/summary.txt" <<'EOF'
=== Lighthouse performance scores ===
EOF
  for f in "$REPORT_DIR"/report-*.html; do
    [ -f "$f" ] || continue
    PERF=$(grep -oE 'kind:[[:space:]]*"?performance"?.*?score:[[:space:]]*[0-9.]+' "$f" 2>/dev/null \
           | grep -oE '[0-9.]+$' | head -n1)
    A11Y=$(grep -oE 'kind:[[:space:]]*"?accessibility"?.*?score:[[:space:]]*[0-9.]+' "$f" 2>/dev/null \
           | grep -oE '[0-9.]+$' | head -n1)
    BP=$(grep -oE 'kind:[[:space:]]*"?best-practices"?.*?score:[[:space:]]*[0-9.]+' "$f" 2>/dev/null \
         | grep -oE '[0-9.]+$' | head -n1)
    SEO=$(grep -oE 'kind:[[:space:]]*"?seo"?.*?score:[[:space:]]*[0-9.]+' "$f" 2>/dev/null \
          | grep -oE '[0-9.]+$' | head -n1)
    BASE=$(basename "$f")
    printf "  %-40s  perf=%s  a11y=%s  bp=%s  seo=%s\n" \
      "${BASE#report-}" "${PERF:-?}" "${A11Y:-?}" "${BP:-?}" "${SEO:-?}" \
      >> "$REPORT_DIR/summary.txt"
  done

  if [ -s "$REPORT_DIR/summary.txt" ]; then
    cat "$REPORT_DIR/summary.txt"
  fi
else
  fail "lhci failed — see $REPORT_DIR/lighthouse.log"
  tail -n 20 "$REPORT_DIR/lighthouse.log"
  exit 1
fi

rm -rf "$TMPDIR_CFG"
ok "Lighthouse reports → $REPORT_DIR"
