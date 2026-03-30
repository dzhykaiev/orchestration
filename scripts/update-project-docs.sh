#!/usr/bin/env bash
# Auto-updates README.md (Project Structure section) and CLAUDE.md (auto-generated section)
# Called by pre-commit hook

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ─── Generate project tree ───────────────────────────────────────────────────

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
    -not -name '*.lock' \
    -not -name 'pnpm-lock.yaml' \
    -not -name '.DS_Store' \
    -not -name '.env*' \
    -maxdepth 3 \
    -type d \
    | sort \
    | sed 's|^\./||' \
    | grep -v '^\.$' \
    | awk '{
      n = split($0, parts, "/")
      indent = ""
      for (i = 1; i < n; i++) indent = indent "  "
      printf "%s%s/\n", indent, parts[n]
    }'
}

TREE=$(generate_tree)

# ─── Collect package info ────────────────────────────────────────────────────

PACKAGES=""
for pkg in apps/*/package.json packages/*/package.json; do
  [ -f "$pkg" ] || continue
  dir=$(dirname "$pkg")
  name=$(grep -o '"name": *"[^"]*"' "$pkg" | head -1 | sed 's/"name": *"//;s/"//') || true
  desc=$(grep -o '"description": *"[^"]*"' "$pkg" | head -1 | sed 's/"description": *"//;s/"//') || true
  if [ -n "$desc" ]; then
    PACKAGES="${PACKAGES}- **${dir}** (\`${name}\`) — ${desc}
"
  else
    PACKAGES="${PACKAGES}- **${dir}** (\`${name}\`)
"
  fi
done

# ─── Replace content between markers using Python ────────────────────────────

replace_between() {
  local file="$1" start_marker="$2" end_marker="$3" new_content="$4"
  python3 -c "
import re, sys
with open('$file', 'r') as f:
    content = f.read()
pattern = r'(${start_marker}\n).*?(${end_marker})'
replacement = r'\1' + sys.stdin.read() + '${end_marker}'
result = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('$file', 'w') as f:
    f.write(result)
" <<< "$new_content"
}

# ─── Update README.md ────────────────────────────────────────────────────────

README="$ROOT_DIR/README.md"

if grep -q '<!-- PROJECT_STRUCTURE_START -->' "$README" 2>/dev/null; then
  README_CONTENT="\`\`\`
${TREE}
\`\`\`
"
  replace_between "$README" '<!-- PROJECT_STRUCTURE_START -->' '<!-- PROJECT_STRUCTURE_END -->' "$README_CONTENT"
fi

# ─── Update CLAUDE.md ────────────────────────────────────────────────────────

CLAUDE_MD="$ROOT_DIR/CLAUDE.md"

if [ -f "$CLAUDE_MD" ] && grep -q '<!-- AUTO_START -->' "$CLAUDE_MD" 2>/dev/null; then
  CLAUDE_CONTENT="## Project Structure (auto-generated)

\`\`\`
${TREE}
\`\`\`

## Packages

${PACKAGES}"
  replace_between "$CLAUDE_MD" '<!-- AUTO_START -->' '<!-- AUTO_END -->' "$CLAUDE_CONTENT"
fi

# ─── Stage updated files ─────────────────────────────────────────────────────

git add "$README" "$CLAUDE_MD" 2>/dev/null || true

echo "Project docs updated."
