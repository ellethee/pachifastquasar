# Changelog

All notable changes to `@ilpachi/pachifq` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.2] - 2026-10-14

### Changed

- CLI output, help, prompts and generated file comments are now in English.

## [0.1.1] - 2026-10-14

### Changed

- First release published from GitHub Actions with trusted publishing (npm provenance); no code changes.

### Changed

- Generated apps use `@quasar/app-vite` `^3.10.2` (Vite 8) and `@quasar/vite-plugin` `^2.0.2`.

## [0.1.0] - 2026-10-14

Initial public release. Scaffolding CLI for apps and features built on `@ilpachi/pachifastquasar`.

### Added

- `pachifq create`: generates a small app that depends on the shell, from embedded templates (`--yes`, `--dry-run`, `--with`, `--link`, `--locale`, `--registry`).
- `pachifq new feature`: generates `src/features/<name>/` (routes, pages, stores, services, locales), optionally with child routes.
- `pachifq new locale`: adds a language to the app and to its features.
- `pachifq info` and `pachifq list`: diagnostics of the project and list of the features, also as JSON.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.1.2...HEAD
[0.1.2]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.1.1...pachifq@0.1.2
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachifq@0.1.0...pachifq@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachifq@0.1.0
