#!/usr/bin/env bash
# Management of the test pachifast backend for the compatibility smoke.
# Usage: compat/backend.sh <setup|prepare|start|stop|version|all>
# Variabili (tutte opzionali):
#   COMPAT_PORT         backend port (default 8030)
#   COMPAT_DATA_DIR     data folder (sqlite, log, pid); default: new temporary folder
#   PACHIFAST_VERSION   pachifast version from the registry (default: the latest)
#   PACHIFAST_SOURCE    local path of pachifast (local TESTING only: replaces the registry)
#   PACHIFAST_INDEX_URL URL of an alternative PyPI index (default: PyPI)
#   UV_INDEX_NAME       name of the alternative uv index (default ilpachi); credentials are in
#                       UV_INDEX_<NAME>_USERNAME/PASSWORD (never printed)
#   COMPAT_PASSWORD     password of the test users (throwaway local credential; default below)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${HERE}/backend"
VENV="${BACKEND_DIR}/.venv"
PORT="${COMPAT_PORT:-8030}"
STATE_FILE="${HERE}/.state"
COMPAT_PASSWORD="${COMPAT_PASSWORD:-Compat-Test-1234!}"

# Loads/initializes the data folder (persisted in .state for subsequent commands).
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

# Creates the venv and installs pachifast (from the registry, or from PACHIFAST_SOURCE).
setup_backend() {
  uv venv --quiet "${VENV}"
  if [ -n "${PACHIFAST_SOURCE:-}" ]; then
    echo "WARNING: pachifast from local source (${PACHIFAST_SOURCE}), not from the registry"
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

# Prints the installed pachifast version.
version_backend() {
  "${VENV}/bin/pachifast" --version
}

# Initializes the database, migrations and test users.
prepare_backend() {
  load_state
  cd "${BACKEND_DIR}"
  rm -f .env
  export PATH="${VENV}/bin:${PATH}"
  pachifast init --no-user --database-url "sqlite+aiosqlite:///${COMPAT_DATA_DIR}/compat.sqlite3" > /dev/null
  pachifast migrations upgrade --target-name compat > /dev/null
  pachifast users create admin --superuser --password "${COMPAT_PASSWORD}" --email admin@example.com > /dev/null
  pachifast users create limited --password "${COMPAT_PASSWORD}" --email limited@example.com > /dev/null
  echo "Backend prepared (data in ${COMPAT_DATA_DIR})"
}

# Starts the backend in the background and waits for it to respond.
start_backend() {
  load_state
  cd "${BACKEND_DIR}"
  nohup "${VENV}/bin/pachifast" serve --host 127.0.0.1 --port "${PORT}" \
    > "${COMPAT_DATA_DIR}/backend.log" 2>&1 &
  echo $! > "${COMPAT_DATA_DIR}/backend.pid"
  local i
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health/" > /dev/null 2>&1; then
      echo "Backend ready at http://127.0.0.1:${PORT} (pid $(cat "${COMPAT_DATA_DIR}/backend.pid"))"
      return 0
    fi
    sleep 1
  done
  echo "Backend unreachable; last log lines:" >&2
  tail -n 30 "${COMPAT_DATA_DIR}/backend.log" >&2 || true
  return 1
}

# Stops the backend by PID.
stop_backend() {
  load_state
  local pidfile="${COMPAT_DATA_DIR}/backend.pid"
  if [ -f "${pidfile}" ]; then
    kill "$(cat "${pidfile}")" 2> /dev/null || true
    rm -f "${pidfile}"
    echo "Backend stopped"
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
    *) echo "Usage: $0 <setup|prepare|start|stop|version|all>" >&2; exit 2 ;;
  esac
}

main "$@"
