#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-jira}"
errors=0

check_pattern() {
  local file="$1"
  local pattern="$2"
  local msg="$3"
  if ! rg -q "$pattern" "$file"; then
    echo "[ERROR] $file: $msg"
    errors=$((errors + 1))
  fi
}

check_ticket_sections_base() {
  local file="$1"
  check_pattern "$file" '^# JIRA-[0-9]{3} ' 'missing/invalid title format (# JIRA-XXX ...)'
  check_pattern "$file" '^## Purpose$' 'missing section: Purpose'
  check_pattern "$file" '^## Scope$' 'missing section: Scope'
  check_pattern "$file" '^## Files/Modules Likely Affected$' 'missing section: Files/Modules Likely Affected'
  check_pattern "$file" '^## Dependencies$' 'missing section: Dependencies'
  check_pattern "$file" '^## Risks$' 'missing section: Risks'
  check_pattern "$file" '^## Validation$' 'missing section: Validation'
  check_pattern "$file" '^## Definition of Done$' 'missing section: Definition of Done'
}

check_ticket_sections_active() {
  local file="$1"
  check_ticket_sections_base "$file"
  check_pattern "$file" '^## Owner$' 'missing section: Owner'
  check_pattern "$file" '^## Progress \([0-9]{4}-[0-9]{2}-[0-9]{2}.*\)$' 'missing section: Progress (YYYY-MM-DD)'
  check_pattern "$file" '^## Remaining$' 'missing section: Remaining'
}

check_filename() {
  local file="$1"
  local base
  base="$(basename "$file")"
  if [[ ! "$base" =~ ^JIRA-[0-9]{3}-[a-z0-9-]+\.md$ ]]; then
    echo "[ERROR] $file: invalid filename format"
    errors=$((errors + 1))
  fi
}

for dir in todo inprogress blocked; do
  while IFS= read -r file; do
    check_filename "$file"
    check_ticket_sections_active "$file"
  done < <(find "$ROOT/$dir" -maxdepth 1 -type f -name '*.md' | sort)
done

while IFS= read -r file; do
  check_filename "$file"
  check_ticket_sections_base "$file"
  check_pattern "$file" '^## Owner$' 'missing section: Owner'
  check_pattern "$file" '^## Result$' 'done ticket must include section: Result'
done < <(find "$ROOT/done" -maxdepth 1 -type f -name '*.md' | sort)

if [[ $errors -gt 0 ]]; then
  echo
  echo "jira audit failed: $errors issue(s) found"
  exit 1
fi

echo "jira audit passed"
