# Theming and styles

## What ships

| Output                                | Source (`src/scss/`)          | Content                                                                  |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `@ilpachi/pachifastquasar/styles.css` | `index.scss` (fonts + `app`)  | fonts, `--pachi-*` tokens (light and dark), card styles, Quasar tweaks   |
| `@ilpachi/pachifastquasar/scss/*`     | all Sass sources              | `quasar-variables`, `tokens`, `app`, `fonts`, ...                        |

`definePachiQuasarConfig` loads `styles.css` after Quasar's own CSS and before the application's. The styles of
`.vue` components are injected into the package JavaScript and need no import.

## Rules

- Component styles are **not** `scoped`.
- Every CSS custom property is `--pachi-*` and every class defined by the package starts with `pachi-`
  (Quasar's `q-*` and `--q-*` are left alone).
- Defaults are declared with zero specificity (`:where`), so the application only needs to redefine the
  variable.
- `!important` is used only to beat Quasar.

## Design tokens

Tokens are custom properties on `body.body--dark` and `body.body--light`. Redefine them in the application CSS:

```css
/* src/css/app.scss */
body.body--dark {
  --pachi-accent: #f59e0b;
  --pachi-accent-soft: rgb(245 158 11 / 12%);
}
body.body--light {
  --pachi-accent: #b45309;
}
```

Main groups: surfaces (`--pachi-bg`, `--pachi-surface`, `--pachi-surface-2`, `--pachi-surface-3`), borders
(`--pachi-border`, `--pachi-border-hi`), text (`--pachi-ink`, `--pachi-ink-2`, `--pachi-muted`,
`--pachi-faint`), accent (`--pachi-accent`, `-soft`, `-mid`, `-ink`, `-deep`) and semantic colors
(`--pachi-blue`, `--pachi-amber`, `--pachi-red`, `--pachi-green` with `-soft` variants), plus the card and
avatar variables used by the dashboard (`--pachi-app-card-*`, `--pachi-app-avatar-*`, `--pachi-app-grid-bg`).
`tokens.scss` lists them all.

Dark and light mode follow Quasar's `Dark` plugin (default `auto`). `ToggleThemeButton` switches the mode and
persists the choice in `localStorage` under `pachi-prefs-theme` and emits the window event `pachi:theme-changed`
(`{ theme: 'dark' | 'light' }`): `@ilpachi/fastquasar-settings` listens to it to save the theme in the user's settings
(`appearance.theme`) when authenticated. Likewise `AuthManager` emits `pachi:auth-changed`
(`{ authenticated, userId, username }`) on login, session restore, change of user and logout, so that packages can load
or clear per-user data without importing the shell.

## Quasar palette (Sass)

Quasar's colors (`$primary`, `$secondary`, ...) are compile-time Sass variables. Define overrides first and
import the shell defaults (declared with `!default`) in the application's `src/css/quasar.variables.scss`:

```scss
$primary: #7c3aed;
@import '@ilpachi/pachifastquasar/scss/quasar-variables';
```

Three values (`$dark-page`, `$light-page`, `$light-color`) also feed the CSS tokens. To change them, compile the
styles in the application instead of loading `styles.css`:

```scss
@use '@ilpachi/pachifastquasar/scss/app' with ($dark-page: #000, $light-page: #fafafa);
```

## Logo

The default logo is the Pachi mascot, a fixed-color SVG readable on light and dark backgrounds. It is exported
as `pachiLogo` (the string `img:<url>`). The SVG is not inlined in the JavaScript: it is shipped as
`dist/assets/logo.svg` and resolved by the Vite of the consuming application, which emits it with a hash.

Replace it with the `logo` option (`definePachiConfig`), which accepts an SVG path (`M...`), `img:<url>` pointing
to a file in `public/` or imported, or a Vue component. `PachiLogo` also accepts a `value` prop.

### Size and overlap

| Setting                                 | Effect                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app.logoSize` / `QCLI_APP_LOGO_SIZE`   | logo size in the bar (CSS length, default `36px`); sets `--pachi-app-logo-size`                  |
| `--pachi-app-logo-size` (CSS variable)  | same, usable from application CSS                                                                |
| `--pachi-appbar-height`                 | bar height, derived: `max(52px, logo size + 16px)`                                               |
| `--pachi-page-height`                   | usable page height under the bar (`calc(100vh - 48px - var(--pachi-appbar-height))`)             |
| `app.logoOverlap` / `QCLI_APP_LOGO_OVERLAP` | `false` (default): the bar grows to contain the logo, nothing is clipped. `true`: the bar stays 52px and the logo hangs below it, with its top always inside the page |

`app.showAppLogo` / `QCLI_APP_SHOW_LOGO=false` removes the logo from the bar.

## Favicon

A package cannot impose the favicon on the application. Applications created with `pachifq create` start with
`favicon.svg`, `favicon.ico`, `favicon-32.png`, `favicon-192.png` and `apple-touch-icon.png` in `public/`,
linked from `index.html`. Replace those files to change them. The optimized sources and the commands used to
regenerate them from the original PNG are in `src/assets/logo/README.md` of this repository.

## Hover effects

`QCLI_APP_HOVER_EFFECTS=false` (`app.hoverEffectsEnabled: false`) adds `pachi-hover-fx-disabled` to `body`,
which turns off card scaling and hover animations. Reduced-motion preferences are respected.


## Scrollable pages

The layout is exactly one viewport tall and never scrolls as a whole, so a page taller than the screen is clipped.
Three opt-in tools keep long content inside the bottom edge of the page.

### `PachiScrollArea`: scroll part of a page

Wrap the tall block in `PachiScrollArea`. Everything above it (titles, intros, toolbars) stays fixed; the area
fills the space left under it and scrolls when its content is taller:

```vue
<template>
  <div class="q-pa-md">
    <h1 class="text-h5">Title</h1>
    <p>Intro</p>
    <pachi-scroll-area>
      <div class="row q-col-gutter-md"><!-- tall content --></div>
    </pachi-scroll-area>
  </div>
</template>
<script setup lang="ts">
import { PachiScrollArea } from '@ilpachi/pachifastquasar'
</script>
```

The maximum height is measured from the element's position down to the bottom of the viewport (minus the page
padding) and is updated on window resize and when the container changes size. Props: `tag` (element, default `div`),
`offset` (extra pixels to leave below, default 0), `minHeight` (default 120 px: below it the page itself overflows).

### Dashboard width and columns

The dashboard (home and routes with children) is `1080px` wide with a 3-column card grid. Change it globally with
`app.dashboardMaxWidth` / `app.dashboardColumns` (or `QCLI_APP_DASHBOARD_MAX_WIDTH` / `QCLI_APP_DASHBOARD_COLUMNS`)
and per route with `meta.dashboardMaxWidth` / `meta.dashboardColumns` (the route wins):

```ts
{ path: '/reports', meta: { dashboardMaxWidth: '1400px', dashboardColumns: 3, title: 'Reports' }, children: [/* ... */] }
```

`dashboardMaxWidth` is a CSS length (`'1400px'`, `'90%'`, `'none'`; a number means pixels). `dashboardColumns` is a number
(`3` = `repeat(3, 1fr)`) or a full `grid-template-columns` (`'repeat(auto-fill, minmax(220px, 1fr))'`). Both are applied
as the CSS variables `--pachi-hub-max-width` and `--pachi-hub-columns` on `.pachi-hub-dash`.

### Card title animation

The title of a dashboard card (`.pachi-dc-title`) animates on hover (`rubber-band`). Pick another one, or turn it off,
with `app.titleAnimation` (`QCLI_APP_TITLE_ANIMATION`) and, per card, with `meta.titleAnimation` on the route (the route
wins): `rubber-band`, `pulse`, `shake`, `wobble`, `tada`, `bounce` or `none`. The value reaches the CSS as
`--pachi-dc-title-animation`, so a project can also set that variable (any `animation` value) in its own styles.
`hoverEffectsEnabled: false` and `prefers-reduced-motion` switch every title animation off regardless of the setting.

### `meta.pageScroll`: scroll the whole page

`meta: { pageScroll: true }` on a route wraps the entire routed page in a `pachi-page-scroll` container.

### `pachi-page-scroll` class and `--pachi-page-height`

`.pachi-page-scroll` is `max-height: var(--pachi-page-height); overflow-y: auto` and can be used on any container.
`--pachi-page-height` is the usable page height under the app bar; to give an inner block its own scroll area use
`max-height: calc(var(--pachi-page-height) - 120px)`.

