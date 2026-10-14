# Compat pachifast

Smoke OPZIONALE dei package frontend contro un backend `pachifast` reale. Non blocca nessuna pipeline.

- `backend/`: app pachifast minima (sqlite, `core_module` + `AdminModule`, modello `compat.item` registrato nell'admin,
  migrazione `compat` versionata; utenti `admin` (superuser) e `limited` (senza permessi) creati da `backend.sh`).
- `backend.sh`: `setup | prepare | start | stop | version | all` (venv uv in `backend/.venv`, dati in una cartella
  temporanea, `.state` ricorda quale; il backend gira in background e si ferma per PID).
- `smoke/`: pacchetto workspace privato `ilpachi-compat-smoke` (Vitest) che usa i `dist` di `fastquasar-settings`
  (`SettingsManager`), `fastquasar-admin` (`createAdminApi`, `buildPayload`) e `@ilpachi/use-alova` contro il backend:
  profilo (`PATCH /auth/user`: 200, `422` su dato non valido, `400 user.email_exists`, cambio password uguale ->
  `422 auth.password_unchanged`) e paginazione di `/admin/user`;
  auth (`/auth/token`, refresh rotante, logout, envelope), user settings (schema con `apply`/`default`, `PUT`
  valido/invalido `422 user.settings_value_invalid`, `PATCH`), admin generico (modelli, `_schema`, lista con
  ordinamento/filtro/ricerca, CRUD, `_options`, azione in blocco, cronologia, `403`, errori `404`/`422`).
  L'`AuthManager` della shell non e' coperto (richiede il browser): login e refresh sono verificati sul contratto HTTP.

## In CI

Un workflow opzionale puo' lanciare lo stesso flusso (manuale o schedulato, con `continue-on-error`), passando
`PACHIFAST_VERSION` e, se serve un indice privato, `PACHIFAST_INDEX_URL`/`UV_INDEX_NAME` con le credenziali in
`UV_INDEX_<NOME>_USERNAME/PASSWORD` (secret della CI, mai nel repo).

## In locale

```bash
# default: pachifast da PyPI; alternative: PACHIFAST_INDEX_URL (+ credenziali UV_INDEX_<NOME>_*) o PACHIFAST_SOURCE=<percorso>
pnpm install && pnpm --filter "ilpachi-compat-smoke..." --filter '!ilpachi-compat-smoke' build
COMPAT_PORT=8030 compat/backend.sh all          # installa pachifast, prepara i dati, avvia
COMPAT_PORT=8030 pnpm -C compat/smoke smoke
compat/backend.sh stop
```

`COMPAT_PASSWORD` cambia la password degli utenti di prova (default `Compat-Test-1234!`, credenziale locale usa e getta
del backend temporaneo, non un segreto; deve coincidere tra `backend.sh` e `smoke`, che leggono la stessa variabile).

`COMPAT_STRICT_DEFAULTS=1` rende bloccante il controllo sui `default` dello schema admin (vedi sotto).

## Stato

Testato con pachifast 0.15.0 (indice interno `ilpachi`). Il disallineamento noto di 0.6.0 (`_schema`:
`fields.<campo>.default` pari a `5`, cioe' `DONT_SET` di SQLAlchemy) e' risolto: il controllo passa anche con
`COMPAT_STRICT_DEFAULTS=1`.

Dalla 0.15 `GET /admin/user` pagina di default a 25 righe (max 200) con envelope `{items,total,page,pageSize,pages}`;
`fastquasar-admin` invia sempre `page`/`pageSize` e legge `total`, quindi non e' toccato (smoke in `profile.test.ts`).
L'app minima non monta il modulo audit (`/admin/audit/logs`), che il frontend non usa.
