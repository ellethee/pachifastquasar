#!/usr/bin/env bash
# Gestione del backend pachifast di prova per lo smoke di compatibilita'.
# Uso: compat/backend.sh <setup|prepare|start|stop|version|all>
# Variabili (tutte opzionali):
#   COMPAT_PORT         porta del backend (default 8030)
#   COMPAT_DATA_DIR     cartella dei dati (sqlite, log, pid); default: cartella temporanea nuova
#   PACHIFAST_VERSION   versione di pachifast dal registro (default: l'ultima)
#   PACHIFAST_SOURCE    percorso locale di pachifast (solo PROVA in locale: sostituisce il registro)
#   PACHIFAST_INDEX_URL URL di un indice PyPI alternativo (default: PyPI)
#   UV_INDEX_NAME       nome dell'indice uv alternativo (default ilpachi); le credenziali stanno in
#                       UV_INDEX_<NOME>_USERNAME/PASSWORD (mai stampate)
#   COMPAT_PASSWORD     password degli utenti di prova (credenziale locale usa e getta; default sotto)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${HERE}/backend"
VENV="${BACKEND_DIR}/.venv"
PORT="${COMPAT_PORT:-8030}"
STATE_FILE="${HERE}/.state"
COMPAT_PASSWORD="${COMPAT_PASSWORD:-Compat-Test-1234!}"

# Carica/inizializza la cartella dati (persistita in .state per i comandi successivi).
load_state() {
  if [ -z "${COMPAT_DATA_DIR:-}" ] && [ -f "${STATE_FILE}" ]; then
    COMPAT_DATA_DIR="$(cat "${STATE_FILE}")"
  fi
  if [ -z "${COMPAT_DATA_DIR:-}" ]; then
    COMPAT_DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/compat-pachifast.XXXXXX")"
  fi
  mkdir -p "${COMPAT_DATA_DIR}"
  printf '%s' "${COMPAT_DATA_DIR}" > "${STATE_FILE}"
}

# Crea il venv e installa pachifast (dal registro, oppure da PACHIFAST_SOURCE).
setup_backend() {
  uv venv --quiet "${VENV}"
  if [ -n "${PACHIFAST_SOURCE:-}" ]; then
    echo "ATTENZIONE: pachifast da sorgente locale (${PACHIFAST_SOURCE}), non dal registro"
    uv pip install --quiet --python "${VENV}/bin/python" "${PACHIFAST_SOURCE}"
  else
    local spec="pachifast"
    [ -n "${PACHIFAST_VERSION:-}" ] && spec="pachifast==${PACHIFAST_VERSION}"
    if [ -n "${PACHIFAST_INDEX_URL:-}" ]; then
      local name="${UV_INDEX_NAME:-ilpachi}"
      uv pip install --quiet --python "${VENV}/bin/python" --index "${name}=${PACHIFAST_INDEX_URL}" \
        --index-strategy first-index "${spec}"
    else
      uv pip install --quiet --python "${VENV}/bin/python" "${spec}"
    fi
  fi
  version_backend
}

# Stampa la versione di pachifast installata.
version_backend() {
  "${VENV}/bin/pachifast" --version
}

# Inizializza database, migrazioni e utenti di prova.
prepare_backend() {
  load_state
  cd "${BACKEND_DIR}"
  rm -f .env
  export PATH="${VENV}/bin:${PATH}"
  pachifast init --no-user --database-url "sqlite+aiosqlite:///${COMPAT_DATA_DIR}/compat.sqlite3" > /dev/null
  pachifast migrations upgrade --target-name compat > /dev/null
  pachifast users create admin --superuser --password "${COMPAT_PASSWORD}" --email admin@example.com > /dev/null
  pachifast users create limited --password "${COMPAT_PASSWORD}" --email limited@example.com > /dev/null
  echo "Backend preparato (dati in ${COMPAT_DATA_DIR})"
}

# Avvia il backend in background e attende che risponda.
start_backend() {
  load_state
  cd "${BACKEND_DIR}"
  nohup "${VENV}/bin/pachifast" serve --host 127.0.0.1 --port "${PORT}" \
    > "${COMPAT_DATA_DIR}/backend.log" 2>&1 &
  echo $! > "${COMPAT_DATA_DIR}/backend.pid"
  local i
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health/" > /dev/null 2>&1; then
      echo "Backend pronto su http://127.0.0.1:${PORT} (pid $(cat "${COMPAT_DATA_DIR}/backend.pid"))"
      return 0
    fi
    sleep 1
  done
  echo "Backend non raggiungibile; ultime righe del log:" >&2
  tail -n 30 "${COMPAT_DATA_DIR}/backend.log" >&2 || true
  return 1
}

# Ferma il backend per PID.
stop_backend() {
  load_state
  local pidfile="${COMPAT_DATA_DIR}/backend.pid"
  if [ -f "${pidfile}" ]; then
    kill "$(cat "${pidfile}")" 2> /dev/null || true
    rm -f "${pidfile}"
    echo "Backend fermato"
  fi
}

main() {
  case "${1:-}" in
    setup) setup_backend ;;
    prepare) prepare_backend ;;
    start) start_backend ;;
    stop) stop_backend ;;
    version) version_backend ;;
    all) setup_backend && prepare_backend && start_backend ;;
    *) echo "Uso: $0 <setup|prepare|start|stop|version|all>" >&2; exit 2 ;;
  esac
}

main "$@"
