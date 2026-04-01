#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_violations=0

check_rule() {
  local label="$1"
  local search_root="$2"
  local pattern="$3"

  if [[ ! -d "$search_root" ]]; then
    return 0
  fi

  local matches
  matches=$(rg -n --no-heading --color never "$pattern" "$search_root" || true)
  if [[ -n "$matches" ]]; then
    echo "[boundary] FAIL: $label"
    echo "$matches"
    echo
    has_violations=1
  fi
}

# apps/web must not import runtime sources from api/orchestrator.
check_rule \
  "apps/web cannot import from api/orchestrator runtimes" \
  "apps/web/src" \
  "(from|import\\s*\\()\\s*[\"'][^\"']*(@orchestration/(api|orchestrator)|apps/(api|orchestrator)/src)"

# apps/api must not import orchestrator internals.
check_rule \
  "apps/api cannot import orchestrator runtime internals" \
  "apps/api/src" \
  "(from|import\\s*\\()\\s*[\"'][^\"']*(@orchestration/orchestrator|apps/orchestrator/src)"

# apps/orchestrator must not import API internals.
check_rule \
  "apps/orchestrator cannot import api runtime internals" \
  "apps/orchestrator/src" \
  "(from|import\\s*\\()\\s*[\"'][^\"']*(@orchestration/api|apps/api/src)"

# packages/shared must remain pure contracts/state machine.
check_rule \
  "packages/shared cannot import apps or db" \
  "packages/shared/src" \
  "(from|import\\s*\\()\\s*[\"'][^\"']*(@orchestration/db|apps/)"

# packages/db must not import app runtimes.
check_rule \
  "packages/db cannot import apps" \
  "packages/db/src" \
  "(from|import\\s*\\()\\s*[\"'][^\"']*(@orchestration/(api|orchestrator|web)|apps/)"

if [[ "$has_violations" -eq 1 ]]; then
  echo "[boundary] Import boundary check failed"
  exit 1
fi

echo "[boundary] OK"
