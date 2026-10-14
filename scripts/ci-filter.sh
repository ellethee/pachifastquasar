#!/usr/bin/env bash
# Stampa il filtro pnpm per la CI selettiva: "...[<base>]..." (pacchetti toccati + dipendenti + dipendenze) oppure "*" (tutto).
# Uso: scripts/ci-filter.sh <base-ref>   (vuoto o non risolvibile => tutto)
# Se cambiano file fuori da packages/ e playground/ (lockfile, workspace, workflow, script) si costruisce tutto.
set -euo pipefail

# Stampa "*" (tutti i pacchetti).
all() {
  echo '*'
}

# Argomento: base-ref. Stampa il filtro da passare a `pnpm --filter`.
main() {
  local base="${1:-}"
  if [ -z "$base" ] || ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
    all
    return
  fi
  # `grep -q` chiude la pipe al primo risultato: senza `|| true` pipefail leggerebbe l'uscita di git diff (SIGPIPE) come falso
  local outside
  outside="$(git diff --name-only "$base"...HEAD | grep -vE '^(packages|playground)/' || true)"
  if [ -n "$outside" ]; then
    all
    return
  fi
  echo "...[$base]..."
}

main "$@"
