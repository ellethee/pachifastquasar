#!/usr/bin/env bash
# Prints the pnpm filter for the selective CI: "...[<base>]..." (touched packages + dependents + dependencies) or "*" (everything).
# Usage: scripts/ci-filter.sh <base-ref>   (empty or unresolvable => everything)
# If files outside packages/ and playground/ change (lockfile, workspace, workflow, scripts) everything is built.
set -euo pipefail

# Prints "*" (all packages).
all() {
  echo '*'
}

# Argument: base-ref. Prints the filter to pass to `pnpm --filter`.
main() {
  local base="${1:-}"
  if [ -z "$base" ] || ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
    all
    return
  fi
  # `grep -q` closes the pipe at the first match: without `|| true` pipefail would read git diff's exit (SIGPIPE) as a failure
  local outside
  outside="$(git diff --name-only "$base"...HEAD | grep -vE '^(packages|playground)/' || true)"
  if [ -n "$outside" ]; then
    all
    return
  fi
  echo "...[$base]..."
}

main "$@"
