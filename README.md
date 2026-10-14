<p align="center"><img src="assets/logo.svg" alt="pachifastquasar logo" width="160"></p>

# pachifastquasar

Frontend companion packages for [pachifast](https://github.com/ellethee/pachifast), a Python backend framework by the same author. A pnpm monorepo of Vue 3 / Quasar / TypeScript packages published under the `@ilpachi` npm scope: an application shell, generic UI components, backend-driven pages (settings, profile, admin) and a scaffolding CLI.

> **Beta.** APIs are unstable and may change between minor versions. Pin versions and read each package's `CHANGELOG.md` before upgrading.
>
> Provided "as is", without warranty of any kind (see [LICENSE](LICENSE)). This is beta software and is not recommended for production use without pinning versions and testing against your pachifast backend.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@ilpachi/pachifastquasar`](packages/pachifastquasar) | 0.1.0 (beta) | Vue 3 / Quasar application shell (layout, optional auth, dashboard, i18n, router). |
| [`@ilpachi/pachifq`](packages/pachifq) | 0.1.0 (beta) | CLI that scaffolds apps and features for the shell. |
| [`@ilpachi/pachi-i18n`](packages/pachi-i18n) | 0.1.0 (beta) | vue-i18n based i18n: instance creation, language detection and persistence, per-package messages. |
| [`@ilpachi/pachi-kit`](packages/pachi-kit) | 0.1.0 (beta) | Generic Vue 3 / Quasar component kit, one sub-path per area: `ui` (date/time picker, confirm dialog, popup edit), `dialog`, `edit-dialog` (sections), `fields` (declarative form fields), `table` (server-side QTable with CRUD), `uploader`. |
| [`@ilpachi/fastquasar-settings`](packages/fastquasar-settings) | 0.1.0 (beta) | User settings page driven by a backend JSON schema, with an Appearance section. |
| [`@ilpachi/fastquasar-profile`](packages/fastquasar-profile) | 0.1.0 (beta) | User profile page (identity, badges, personal data). |
| [`@ilpachi/fastquasar-admin`](packages/fastquasar-admin) | 0.1.0 (beta) | Generic Admin page driven by the backend schema (table, filters, forms, bulk actions, history). |
| [`@ilpachi/fastquasar-dashboard-widgets`](packages/fastquasar-dashboard-widgets) | 0.1.0 (beta) | Dashboard widgets (recent activity, system status) fed by injectable HTTP endpoints. |

Versions are independent per package. The HTTP client `@ilpachi/use-alova` lives in its own repository.

## Quick start

```bash
pnpm dlx @ilpachi/pachifq create my-app
cd my-app
pnpm install
pnpm dev
```

See the [getting started guide](packages/pachifastquasar/docs/getting-started.md).

## Requirements

- Node.js >= 20 and pnpm >= 10
- Vue 3.5 and Quasar 2.20
- A pachifast backend (needed for auth, settings, profile and admin):

| Frontend packages | pachifast |
| --- | --- |
| current | >= 0.10 (tested against 0.15.0) |

## Development

```bash
pnpm install
pnpm dev                 # playground app, packages from sources, hot reload
pnpm typecheck           # type-check all packages
pnpm test                # unit tests
pnpm build               # build all packages
pnpm check               # typecheck + test + build
pnpm check:changed       # same, only for packages changed vs origin/main
pnpm docs:build          # documentation site (requires uv)
```

An optional smoke suite against a real pachifast backend is in [compat](compat/README.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). For vulnerabilities see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) (c) ilPachi
