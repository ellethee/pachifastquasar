# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.1] - 2026-10-13

### Changed

- `QCLI_APP_GRAVATAR` now defaults to `false` (shell privacy default); the app template comment shows the opt-in `gravatar: true`.

## [0.7.0] - 2026-10-13

### Changed

- **Breaking:** `pachifq create` no longer writes a private-registry `.npmrc`: dependencies resolve from npmjs by default.
  Use `--registry <url>` (or `PACHI_NPM_REGISTRY`) for a private registry; `--registry npm` forces the default.
- Templates, placeholders (`https://api.example.com`) and README are in English; CLI output is still Italian.
- New app template logo and favicons (elephant head).

### Added

- `--dry-run`: lists the files that would be written without creating anything.

## [0.6.11] - 2026-10-12

### Changed

- `pachifq create --with` resolves `@ilpachi/fastquasar-profile` `^0.6.0` (SMS MFA, profile editing).

## [0.6.10] - 2026-10-12

### Changed

- `pachifq create --with` resolves the new majors of the optional packages (settings `^0.7.0`, profile `^0.5.0`, widgets `^0.3.0`),
  which require `@ilpachi/use-alova` (already a dependency of every generated app).

## [0.6.9] - 2026-10-12

### Fixed

- The optional packages of `pachifq create --with` resolve to the current versions (settings `^0.6.0`, profile `^0.4.0`,
  widgets `^0.2.3`): the old ranges (`^0.5.0`, `^0.3.0`, `^0.2.1`) pinned new apps to old releases.

## [0.6.8] - 2026-10-08

### Added

- `QCLI_APP_TITLE_ANIMATION` in the known shell options, aligned with `@ilpachi/pachifastquasar` 2.10.0.

## [0.6.7] - 2026-10-08

### Added

- `QCLI_APP_DASHBOARD_MAX_WIDTH` and `QCLI_APP_DASHBOARD_COLUMNS` in the known shell options (`pachifq options`), aligned with `@ilpachi/pachifastquasar` 2.9.0.

## [0.6.6] - 2026-10-06

### Changed

- Generated apps now depend on `@ilpachi/fastquasar-settings` `^0.5.0` (schema actions in the `{action, args}` format, compact density fix).

## [0.6.5] - 2026-10-06

### Documentation

- README rewritten in English (commands, options, backend contract, troubleshooting) and new `docs/` guides with a Material for MkDocs configuration; `CHANGELOG.md` and `LICENSE` are listed in the npm package files (`docs/` is not).

## [0.6.4] - 2026-10-05

### Fixed

- `new feature` validates `--icon` against the real exports of `@quasar/extras/mdi-v7` and suggests similar names; if the package cannot be resolved only the syntax is checked.

## [0.6.3] - 2026-10-05

### Added

- `QCLI_APP_LOGO_OVERLAP` among the documented options (`info`, `.env.example`).

## [0.6.2] - 2026-10-05

### Added

- `QCLI_APP_LOGO_SIZE` among the documented options.

## [0.6.1] - 2026-10-05

### Added

- Template: Pachi mascot favicons (`favicon.svg`, `.ico`, `-32.png`, `-192.png`, `apple-touch-icon.png`); binary copy for `.png`/`.ico` template files.

## [0.6.0] - 2026-10-05

### Changed

- Breaking: generated apps use `@ilpachi/use-alova` as HTTP client and `@ilpachi/pachifastquasar` 2.x.
- Generated services use `getUseAlovaInstance()`.
- Ranges of the optional packages (`settings` `^0.4.0`, `widgets` `^0.2.1`).

### Added

- `create --no-envelope` for backends without the `{success,message,data}` envelope (`QCLI_HTTP_ENVELOPE=false`).

## [0.5.2] - 2026-10-05

Not tagged.

### Added

- `create` wires the profile in the boot file (`setPachiProfileUser`) when `profile` is selected.
- `src/.env` contains only the options chosen by the user.
- Instructions for exporting the backend error messages after `create`.

## [0.5.1] - 2026-10-05

### Changed

- The app template uses `definePachiConfig` (base + overrides from the environment).

## [0.5.0] - 2026-10-05

### Changed

- Breaking: an app is no longer a copy of the boilerplate. `create` generates a few files from templates embedded in the CLI and depends on `@ilpachi/pachifastquasar`. The `--ref` and `--template` options were removed.

### Added

- `--link`, `--with`, `--locale` and `--no-auto-dashboard` options of `create`.

## [0.4.2] - 2026-10-05

### Fixed

- Audit fixes: backend proxy through `.env`, input validations, strict argument parsing, cleanup on failure, Vitest tests.

### Changed

- CI skips the publish step when the version already exists.

## [0.4.1] - 2026-10-02

### Fixed

- Generated projects exclude `@ilpachi/*` from pnpm 11 `minimumReleaseAge`.

## [0.4.0] - 2026-10-02

### Added

- First release as a standalone repository (moved out of the `pachifastquasar` workspace): `create`, `new feature`, `new locale`, `info`, `list`.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.7.1...HEAD
[0.7.1]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.7.0...pachifq@0.7.1
[0.7.0]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.11...pachifq@0.7.0
[0.6.11]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.10...pachifq@0.6.11
[0.6.10]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.9...pachifq@0.6.10
[0.6.9]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.8...pachifq@0.6.9
[0.6.8]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.7...pachifq@0.6.8
[0.6.7]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.6...pachifq@0.6.7
[0.6.6]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.5...pachifq@0.6.6
[0.6.5]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.4...pachifq@0.6.5
[0.6.4]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.3...pachifq@0.6.4
[0.6.3]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.2...pachifq@0.6.3
[0.6.2]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.1...pachifq@0.6.2
[0.6.1]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.6.0...pachifq@0.6.1
[0.6.0]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.5.1...pachifq@0.6.0
[0.5.2]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.5.1...pachifq@0.5.2
[0.5.1]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.5.0...pachifq@0.5.1
[0.5.0]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.4.2...pachifq@0.5.0
[0.4.2]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.4.1...pachifq@0.4.2
[0.4.1]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.4.0...pachifq@0.4.1
[0.4.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachifq@0.4.0
