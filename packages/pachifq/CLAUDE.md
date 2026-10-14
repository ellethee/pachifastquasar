# CLAUDE.md

Guida per Claude Code in questo repo (CLI `@ilpachi/pachifq`).

## Cos'è

CLI di scaffold per le app basate su `@ilpachi/pachifastquasar` (nel monorepo: `packages/pachifastquasar`, pacchetto npm, e `playground/` in radice). `create` NON clona più il boilerplate: genera l'app dai template embedded in `templates/app/` (derivati da `playground/` della radice del monorepo), con `package.json` che dipende dal pacchetto.

## Comandi

```bash
pnpm typecheck && pnpm test && pnpm build
```

Mai `publish`/tag senza ordine esplicito (per la pubblicazione `npm`, non pnpm).

## Architettura

- `src/commands/{create,info,list}.ts`, `src/commands/new/{feature,locale}.ts`: comandi (parsing argomenti in `src/helper/argv.ts`).
- `src/generate-project.ts`: `generateProject` (template → file, `package.json`, `pnpm-workspace.yaml`, `.npmrc` (solo con `--registry <url>`; default registry pubblico npm), `src/.env`/`.env.example`, verifica `npm view` in sola lettura, `git init`, `pnpm install`). `--link` → `linkDir`; `--dry-run` → `dryRun` (elenco file + package.json, nessuna scrittura).
- `src/helper/app-package.ts`: range delle dipendenze `@ilpachi/*` (shell, base, opzionali `settings|profile|widgets`) e `buildAppPackageJson`. I range sono costanti da aggiornare quando i package cambiano major/minor.
- `src/helper/template.ts`: lettura/rendering dei template (`{{segnaposto}}`, `_gitignore` → `.gitignore`). `templates/app/` va tenuto allineato al playground del pacchetto (anche `public/`: favicon della mascotte Pachi; i `.png`/`.ico` sono copiati come binari).
- `src/helper/env-content.ts`: `.env` con SOLO le scelte dell'utente, `.env.example` con tutte le `QCLI_*` in commento (la shell ≥1.1.0 fa sovrascrivere la base solo alle variabili impostate: non scrivere mai i default in `.env`).
- `src/helper/boot-blocks.ts`: blocchi condizionali di `templates/app/src/boot/pachi.ts` (`{{bootShellImports}}`, `{{bootImports}}`, `{{bootSetup}}`) per i package `--with` (oggi `profile` → `setPachiProfileUser`). Nuove iniezioni necessarie a un package vanno aggiunte lì.
- `create` stampa a fine run il comando `pachifast locale export` per i messaggi `errors.codes` (`errorMessagesHint` in `src/commands/create.ts`).
- `src/helper/pachi-options.ts`: opzioni `QCLI_*` e default (per `info`, inclusa `QCLI_HTTP_ENVELOPE`; `--no-envelope` di `create` la scrive in `.env`); l'`envDir` dell'app è `src/`.
- `src/generate-feature.ts`: `new feature` (importa i componenti di stato da `@ilpachi/pachifastquasar`, HTTP da `@ilpachi/use-alova`; `@ilpachi/httpachi` resta solo come riconoscimento legacy in `project-context.ts`).
- `src/helper/locales.ts`: `new locale` (app, feature, `packages/*`; per i package in `node_modules` non scrive; bozza vuota per l'app se manca `en.ts`/`it.ts`).

## Stile

Niente punto e virgola finale, apici singoli, 100 colonne, JSDoc su funzioni ed export, ES modules, messaggi in italiano. Test in `tests/` (Vitest); i test della generazione simulano `isPublishedOnRegistry` (nessuna rete).

## Prove end-to-end

In una cartella sotto `/tmp`: `node dist/index.js create demo --yes --no-git --no-install --link <path pachifastquasar>`, poi `pnpm install`, `pnpm typecheck`, `QCLI_AUTH_ENABLED=false pnpm build`. Cancellare la cartella a fine prova.
