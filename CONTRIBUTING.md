# Contributing

Thanks for your interest. This is a pnpm monorepo of the `@ilpachi/*` frontend packages (beta, unstable APIs).

## Setup

Requirements: Node.js >= 20, pnpm >= 10.

```bash
pnpm install
pnpm dev          # playground app with packages from sources
```

Layout: `packages/<name>` (one npm package each), `playground/` (Quasar app consuming the shell), `compat/` (optional smoke against a real backend), `docs/` and `mkdocs.yml` (documentation site).

## Commands

```bash
pnpm typecheck | test | build     # all packages
pnpm check                        # typecheck + test + build
pnpm check:changed                # only packages changed vs origin/main (and dependents)
pnpm -C packages/<name> <script>  # a single package
pnpm docs:build                   # mkdocs --strict (requires uv)
```

Run `pnpm check` (or `check:changed`) before opening a pull request. CI (`.github/workflows/ci.yml`) runs typecheck, tests, build and `npm pack --dry-run` on the touched packages and their dependents.

## Code style

- No trailing semicolons; single quotes in TS/JS, double quotes in HTML/Vue attributes; lines up to 100 columns.
- Use `import type` for type-only imports. Components are kebab-case in templates. Unused variables are prefixed with `_`.
- ES Modules and TypeScript everywhere; JSDoc on functions and classes. Split code into modules (`helpers`, `utils`, `services`...).
- CSS: variables `--pachi-*` and classes `pachi-*`; do not touch `q-*` / `--q-*`. Package styles are not `scoped` and use zero specificity (`:where`).
- Icons: mdi SVG from `@quasar/extras/mdi-v7` passed as values, never strings.
- Bash scripts use functions.
- Linter and formatter configs (eslint, oxlint, prettier, stylelint) are kept local and are not versioned; follow the rules above and `.editorconfig`.

## Workspace rules

- Dependencies between monorepo packages use `workspace:^` (`workspace:*` in the playground); peer dependencies keep the published ranges. Never `link:` or `overrides`.
- Version ranges between monorepo packages: while the packages are `0.x`, a caret range such as `^0.1.0` means `>=0.1.0 <0.2.0`, so it would break at the first minor bump. `peerDependencies` towards other monorepo packages (for example `@ilpachi/pachi-i18n`) therefore use `>=0.1.0 <1.0.0`; raise the lower bound only when the package really needs a newer release. Apps (and the templates of `pachifq`) depend on `^0.1.0` and bump it themselves. Once a package reaches `1.0.0` its peers switch to `^1.0.0`.
- Only one `pnpm-lock.yaml`, at the root. The whole workspace is on Vite 8 (rolldown): use `build.rolldownOptions` in package configs, and keep a single `vite` in the lockfile (`pnpm dedupe`). Packages that build `.vue` declarations with `vite-plugin-dts` 5 pass `processor: 'vue'` and keep `@vue/language-core` at `~2.2.12` as a devDependency (language-core 3 emits `.vue.d.ts` that break consumers using `exactOptionalPropertyTypes`).
- Packages must not import shell services; they peer on `vue`, `quasar` and `@ilpachi/pachi-i18n`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/), with the package as scope: `feat(pachi-kit): ...`, `fix(fastquasar-admin): ...`, `docs: ...`, `chore(pachifq): ...`.

## Changelog and tests

- Every user-visible change updates `packages/<name>/CHANGELOG.md` (Keep a Changelog format, `## [Unreleased]` section).
- New features and bug fixes need tests (Vitest) in the affected package. Public API changes need documentation updates.

## Releases

Maintainers only. Versions are independent per package with tags `<name>@<version>`.

1. Update `packages/<name>/CHANGELOG.md` (section `## [x.y.z]`).
2. `pnpm release <name> <patch|minor|major|x.y.z> [--dry-run]` bumps the version, commits and tags (no push, no publish).
3. `git push --follow-tags` (from `main`): the GitHub Actions workflow `.github/workflows/release.yml` builds and publishes only that package to npmjs, with provenance. It refuses tags that are not on `main`, tags that do not match `package.json`, and skips versions that already exist.

Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): there is no npm token in the repository. One-time setup for every package on npmjs: package settings, "Trusted publisher", GitHub Actions, repository `ellethee/pachifastquasar`, workflow `release.yml`. The workflow can also be started by hand ("Run workflow") for a dry-run of one package.

## Running the compat suite

The smoke suite in `compat/` runs the packages against a real pachifast backend:

```bash
pnpm install && pnpm --filter "ilpachi-compat-smoke..." --filter '!ilpachi-compat-smoke' build
COMPAT_PORT=8030 compat/backend.sh all   # install pachifast, prepare data, start
COMPAT_PORT=8030 pnpm -C compat/smoke smoke
compat/backend.sh stop
```

See [compat/README.md](compat/README.md) for variables (`PACHIFAST_VERSION`, `PACHIFAST_SOURCE`, ...).
