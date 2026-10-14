# fastquasar-profile

A read-only **user profile page** for Vue 3 / Quasar apps: identity card (avatar or initials, name, user id, status
badges, last login, account creation date) and personal data (first name, last name, username, email).

- `PachiProfilePage`: the page. It receives the user through a prop, so it does not depend on any authentication code.
- A menu entry ("Profile") and a route (`/user/profile`) that the `@ilpachi/pachifastquasar` shell discovers
  automatically. The route reads the user from a getter you register once with `setPachiProfileUser`.
- Avatar from the `pachiAvatarUrl` function provided by the shell (Gravatar, opt-in with `app.gravatar: true`), with the initials as a fallback, or from
  your own `avatar` slot.
- A **Security** section: change password (on by default) and, if the backend exposes it, two-factor authentication
  (TOTP with QR code, backup codes, disable, regenerate).
- Self-contained styles (`--pachi-*` CSS variables with zero-specificity defaults), responsive layout, and translated
  texts (Italian and English, via `@ilpachi/pachi-i18n`).

## Requirements

Peer dependencies (declared in `package.json`, installed by your app):

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | The personal data fields are `QInput` components. |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |
| `@ilpachi/use-alova` | `^2.1.1` | Required: HTTP client of the Security section (instance registered by `createPachiApp`). |

The package ships ES modules only (`"type": "module"`) with TypeScript declarations. Unlike the settings package it
needs neither Pinia nor an HTTP client.
