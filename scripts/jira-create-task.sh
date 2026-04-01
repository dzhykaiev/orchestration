#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/jira-create-task.sh --title "Add registration button" [options]

Options:
  --title TEXT           Required. Human-readable title.
  --purpose TEXT         Optional. Why this task matters.
  --scope TEXT           Optional. Scope bullets separated by " ; ".
  --files TEXT           Optional. File/module hints separated by " ; ".
  --dependencies TEXT    Optional. Dependencies separated by comma.
  --risks TEXT           Optional. Risks text.
  --validation TEXT      Optional. Validation command/check.
  --definition TEXT      Optional. Definition of done.
  --owner TEXT           Optional. Responsible person/agent.
EOF
}

TITLE=""
PURPOSE=""
SCOPE=""
FILES=""
DEPENDENCIES=""
RISKS=""
VALIDATION=""
DEFINITION=""
OWNER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="${2:-}"; shift 2 ;;
    --purpose) PURPOSE="${2:-}"; shift 2 ;;
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --files) FILES="${2:-}"; shift 2 ;;
    --dependencies) DEPENDENCIES="${2:-}"; shift 2 ;;
    --risks) RISKS="${2:-}"; shift 2 ;;
    --validation) VALIDATION="${2:-}"; shift 2 ;;
    --definition) DEFINITION="${2:-}"; shift 2 ;;
    --owner) OWNER="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "--title is required" >&2
  usage
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JIRA_DIR="$ROOT_DIR/jira"
TODO_DIR="$JIRA_DIR/todo"
LOCK_DIR="$JIRA_DIR/.create-task.lock"
CAPTURE_LOG="$JIRA_DIR/_meta/CAPTURE_LOG.tsv"

mkdir -p "$TODO_DIR" "$JIRA_DIR/_meta"

lock_wait_attempts=120
attempt=0
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -ge "$lock_wait_attempts" ]]; then
    echo "Could not acquire task creation lock: $LOCK_DIR" >&2
    exit 1
  fi
  sleep 0.1
done
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

next_number="$(find "$JIRA_DIR" -type f -name 'JIRA-*.md' -print \
  | sed -E 's|.*/JIRA-([0-9]+)-.*|\1|' \
  | sed '/^[0-9][0-9]*$/!d' \
  | sort -n \
  | tail -n 1)"

if [[ -z "$next_number" ]]; then
  next_number=1
else
  next_number=$((10#$next_number + 1))
fi

ticket_id="$(printf 'JIRA-%03d' "$next_number")"

slug="$(printf '%s' "$TITLE" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
if [[ -z "$slug" ]]; then
  slug="task"
fi

task_file="$TODO_DIR/$ticket_id-$slug.md"
tmp_file="$task_file.tmp.$$"

scope_markdown="TBD"
if [[ -n "$SCOPE" ]]; then
  scope_markdown="$(printf '%s' "$SCOPE" | sed 's/ ; /\n- /g')"
  scope_markdown="- $scope_markdown"
fi

files_markdown="TBD"
if [[ -n "$FILES" ]]; then
  files_markdown="$(printf '%s' "$FILES" | sed 's/ ; /\n- /g')"
  files_markdown="- $files_markdown"
fi

dependencies_markdown="none"
if [[ -n "$DEPENDENCIES" ]]; then
  dependencies_markdown="$(printf '%s' "$DEPENDENCIES" | sed 's/, */, /g')"
fi

purpose_text="${PURPOSE:-TBD}"
risks_text="${RISKS:-TBD}"
validation_text="${VALIDATION:-TBD}"
definition_text="${DEFINITION:-TBD}"

{
  printf '# %s %s\n\n' "$ticket_id" "$TITLE"
  printf '## Purpose\n%s\n\n' "$purpose_text"
  printf '## Scope\n%s\n\n' "$scope_markdown"
  printf '## Files/Modules Likely Affected\n%s\n\n' "$files_markdown"
  printf '## Dependencies\n%s\n\n' "$dependencies_markdown"
  if [[ -n "$OWNER" ]]; then
    printf '## Owner\n%s\n\n' "$OWNER"
  fi
  printf '## Risks\n%s\n\n' "$risks_text"
  printf '## Validation\n%s\n\n' "$validation_text"
  printf '## Definition of Done\n%s\n' "$definition_text"
} > "$tmp_file"

mv "$tmp_file" "$task_file"

if [[ ! -f "$CAPTURE_LOG" ]]; then
  printf 'created_at\tticket_id\tstatus\tfile\ttitle\n' > "$CAPTURE_LOG"
fi

created_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf '%s\t%s\t%s\t%s\t%s\n' "$created_at" "$ticket_id" "todo" "jira/todo/$(basename "$task_file")" "$TITLE" >> "$CAPTURE_LOG"

printf '%s\t%s\n' "$ticket_id" "$task_file"
