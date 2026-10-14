# Changelog

All notable changes to `@ilpachi/fastquasar-profile` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.0] - 2026-10-14

Initial public release. User profile page receiving the user through a prop.

### Added

- `PachiProfilePage`: identity card (avatar or initials, name, badges, last login) and personal data.
- Security section: password change and two-factor authentication (TOTP with QR code, backup codes, email), when the backend exposes it.
- Menu entry and route discovered automatically by the shell.
- Avatar from the resolver provided by the shell, or from a custom slot.
- Self-contained styles (`--pachi-*` variables) and Italian / English texts.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.1.0...HEAD
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-profile@0.1.0
