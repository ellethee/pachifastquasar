# CLAUDE.md

Guide for Claude Code in this repo (`@ilpachi/pachifq` CLI).

## What it is

Scaffolding CLI for apps based on `@ilpachi/pachifastquasar` (in the monorepo: `packages/pachifastquasar`, the npm package, and `playground/` at the root). `create` no longer clones the boilerplate: it generates the app from the templates embedded in `templates/app/` (derived from the monorepo root `playground/`), with a `package.json` that depends on the package.

## Commands

```bash
pnpm typecheck && pnpm test && pnpm build
```

Never `publish`/tag without an explicit order (to publish use `npm`, not pnpm).

## Architecture

- `src/commands/{create,info,list}.ts`, `src/commands/new/{feature,locale}.ts`: commands (argument parsing in `src/helper/argv.ts`).
- `src/generate-project.ts`: `generateProject` (template → files, `package.json`, `pnpm-workspace.yaml`, `.npmrc` (only with `--registry <url>`; default is the public npm registry), `src/.env`/`.env.example`, read-only `npm view` check, `git init`, `pnpm install`). `--link` → `linkDir`; `--dry-run` → `dryRun` (file list + package.json, nothing written).
- `src/helper/app-package.ts`: ranges of the `@ilpachi/*` dependencies (shell, base, optional `settings|profile|widgets`) and `buildAppPackageJson`. The ranges are constants to update when the packages change major/minor.
- `src/helper/template.ts`: reading/rendering of the templates (`{{placeholder}}`, `_gitignore` → `.gitignore`). `templates/app/` must be kept aligned with the package playground (also `public/`: favicons of the Pachi mascot; `.png`/`.ico` are copied as binaries).
- `src/helper/env-content.ts`: `.env` with ONLY the user's choices, `.env.example` with all the `QCLI_*` commented out (shell ≥1.1.0 lets only the variables that are set override the base: never write the defaults into `.env`).
- `src/helper/boot-blocks.ts`: conditional blocks of `templates/app/src/boot/pachi.ts` (`{{bootShellImports}}`, `{{bootImports}}`, `{{bootSetup}}`) for the `--with` packages (today `profile` → `setPachiProfileUser`). New injections a package needs must be added there.
- `create` prints at the end the `pachifast locale export` command for the `errors.codes` messages (`errorMessagesHint` in `src/commands/create.ts`).
- `src/helper/pachi-options.ts`: `QCLI_*` options and defaults (for `info`, including `QCLI_HTTP_ENVELOPE`; `create --no-envelope` writes it to `.env`); the app `envDir` is `src/`.
- `src/generate-feature.ts`: `new feature` (imports the state components from `@ilpachi/pachifastquasar`, HTTP from `@ilpachi/use-alova`; `@ilpachi/httpachi` remains only as legacy detection in `project-context.ts`).
- `src/helper/locales.ts`: `new locale` (app, features, `packages/*`; it does not write to packages in `node_modules`; empty draft for the app if `en.ts`/`it.ts` is missing).

## Style

No trailing semicolons, single quotes, 100 columns, JSDoc on functions and exports, ES modules, messages in English. Tests in `tests/` (Vitest); the generation tests mock `isPublishedOnRegistry` (no network).

## End-to-end checks

In a folder under `/tmp`: `node dist/index.js create demo --yes --no-git --no-install --link <pachifastquasar path>`, then `pnpm install`, `pnpm typecheck`, `QCLI_AUTH_ENABLED=false pnpm build`. Delete the folder afterwards.
