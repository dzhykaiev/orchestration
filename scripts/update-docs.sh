#!/usr/bin/env bash
# Auto-updates VitePress documentation from codebase state
# Called by pre-commit hook alongside update-project-docs.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

GUIDE_STRUCTURE="$ROOT_DIR/docs/guide/project-structure.md"
DB_DOC="$ROOT_DIR/docs/database.md"

# ─── Update project structure tree ──────────────────────────────────────────

generate_tree() {
  find . \
    -not -path './node_modules*' \
    -not -path './.git*' \
    -not -path './.next*' \
    -not -path '*/node_modules*' \
    -not -path '*/dist*' \
    -not -path '*/.next*' \
    -not -path '*/.turbo*' \
    -not -path './.claude*' \
    -not -path '*/coverage*' \
    -not -path '*/docs/.vitepress/cache*' \
    -not -path '*/docs/.vitepress/dist*' \
    -not -name '*.lock' \
    -not -name 'pnpm-lock.yaml' \
    -not -name '.DS_Store' \
    -not -name '.env*' \
    -maxdepth 3 \
    -type d \
    | sort \
    | sed 's|^\./||' \
    | grep -v '^\.$'
}

# ─── Collect API routes ────────────────────────────────────────────────────

collect_routes() {
  local routes_dir="$ROOT_DIR/apps/api/src/routes"
  if [ -d "$routes_dir" ]; then
    echo "## Auto-detected Route Files"
    echo ""
    for f in "$routes_dir"/*.ts; do
      [ -f "$f" ] || continue
      name=$(basename "$f" .ts)
      echo "- \`/api/${name}\` — \`apps/api/src/routes/${name}.ts\`"
    done
  fi
}

# ─── Collect DB tables from schema ─────────────────────────────────────────

collect_tables() {
  local schema="$ROOT_DIR/packages/db/src/schema.ts"
  if [ -f "$schema" ]; then
    grep -oP 'export const \K\w+(?= = pgTable)' "$schema" 2>/dev/null || true
  fi
}

# ─── Update the last-updated timestamp in docs index ───────────────────────

update_timestamp() {
  local index_file="$ROOT_DIR/docs/index.md"
  local today
  today=$(date +%Y-%m-%d)

  # Update or add last-updated info — no-op if file doesn't have the marker
  if grep -q 'Last auto-updated:' "$index_file" 2>/dev/null; then
    sed -i '' "s/Last auto-updated: .*/Last auto-updated: ${today}/" "$index_file" 2>/dev/null || true
  fi
}

# ─── Run updates ───────────────────────────────────────────────────────────

update_timestamp

# Stage any changed doc files
git add docs/ 2>/dev/null || true

echo "VitePress docs updated."
