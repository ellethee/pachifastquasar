# Themes and side menu

Two opt-in features. Neither changes anything for an app that does not enable them.

## Themes

Six ready-made palettes (`slate`, `zinc`, `emerald`, `cosmic`, `amber`, `teal`, each in dark and light) that
override the `--pachi-*` tokens of the shell. They are shipped **apart** from `styles.css`.

1. Load the stylesheet after the shell styles. With the preset, `css` arrays are concatenated:

    ```ts
    // quasar.config.ts
    export default definePachiQuasarConfig({
      css: ['~@ilpachi/pachifastquasar/themes.css']
    })
    ```

    (or `@use '@ilpachi/pachifastquasar/scss/themes';` in the application Sass).

2. Enable the manager in the configuration:

    ```ts
    const baseConfig: PachiConfigInput = {
      app: { themes: true } // or { themes: { default: 'teal' } }
    }
    ```

    Environment variables: `QCLI_APP_THEMES=true` and `QCLI_APP_THEME_DEFAULT=<id>` (setting only the second one also
    enables the themes, unless `QCLI_APP_THEMES=false`). `default` is the theme used until the user picks one
    (`slate` if omitted; an unknown id falls back to `slate` with a console warning).

With `app.themes` enabled `createPachiApp` initializes the `ThemeManager`: it restores the persisted choice, sets
`data-theme="<id>"` on `<body>`, applies Quasar's dark mode and the Quasar brand colors of the theme, and the app bar
shows a palette button (`PachiThemeSelector`) to choose theme and mode (dark, light, auto). The dark/light toggle
keeps working and uses the same persisted mode.

| localStorage key        | Content                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `pachi-prefs-theme`     | mode `dark` / `light` / `auto` (the key already used by the toggle and `fastquasar-settings`) |
| `pachi-prefs-theme-id`  | theme id                                                         |

Without `themes.css`, or without the `data-theme` attribute, the shell looks exactly as before.

### What a theme sets

Besides the existing tokens (`--pachi-bg`, `--pachi-surface*`, `--pachi-border*`, `--pachi-ink*`,
`--pachi-accent*`, ...), themes define tokens that only exist for them and that the components read with a
fallback to the classic look: `--pachi-btn-r`, `--pachi-input-r`, `--pachi-menu-r`, `--pachi-card-r`,
`--pachi-card-bg|border|border-hover|shadow|shadow-hover`, `--pachi-icon-bg|border|r|shadow`,
`--pachi-card-code-*`, `--pachi-card-footer-*`, `--pachi-card-grid-display`, `--pachi-card-glow-display`.

### Custom themes

```ts
import { registerPachiThemes } from '@ilpachi/pachifastquasar'

registerPachiThemes([
  {
    id: 'brand',
    label: 'Brand',
    tagline: 'Our palette',
    colors: { dark: { /* Quasar brand colors */ }, light: { /* ... */ } },
    preview: { dark: { /* swatch colors */ }, light: { /* ... */ } }
  }
])
```

Register before `createPachiApp` (so a persisted custom theme is restored) and provide the CSS
(`body.body--dark[data-theme='brand'] { --pachi-*: ... }` and the `body--light` twin). Public API:
`ThemeManager.getInstance()` (`init`, `setTheme`, `setMode`, `toggleMode`, `activeThemeId`, `activeMode`,
`isDark`), `getPachiThemes()`, `registerPachiThemes()`, `PACHI_BUILTIN_THEMES`.

## Side menu

`app.navigation` (env `QCLI_APP_NAVIGATION`) chooses how the app is navigated:

| Value                 | Behavior                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `'dashboard'` (default) | routes with children show the automatic card dashboard (see [Routing and menus](routing-and-menus.md)) |
| `'sidebar'`           | a tree menu in a left drawer; the automatic dashboards are **not** rendered                  |

Any other value falls back to `'dashboard'` with a console warning.

In `sidebar` mode:

- The tree is built from the children of the layout route, to any depth, in route order (`meta.order`). Titles come
  from `meta.title` / `meta.titleKey`, icons from `meta.icon`.
- Same filters as the dashboard cards: `meta.hidden !== true`, and `authManager.canAccess(meta)` when auth is
  enabled. Routes with an empty path, a catch-all or dynamic segments (`:id`) are not listed.
- Groups (routes with visible children) expand/collapse; they do not navigate. A group left with no visible
  children is shown as a plain item. The group containing the current route is open and the active item is
  highlighted.
- Keyboard and accessibility: it is a disclosure navigation, not an ARIA tree. Tab moves between links and group
  buttons, Enter/Space expands or collapses a group (`aria-expanded`), the current link has `aria-current="page"`
  and focus is shown with a ring. Arrow-key navigation is not provided.
- Under 1024 px the drawer is an overlay; the app bar shows a menu button that opens/closes it (`useSideMenu()`).
- **Home (`/`)**: if the app defines a page for `/` (a child route with an empty path) it is rendered as usual.
  Otherwise the home shows the `meta.widgets` of the layout route, or a short hint to use the menu.
- A group route is still reachable by URL; it renders its own component (or an empty `<router-view>`), so give a
  group a real page if users can land on it.
- `components.layout` still replaces the whole layout; a custom layout can render `PachiSideMenu` (it must be a child
  of the `q-layout`) and read the tree with `buildNavTree(routes, { title, canAccess })`.

Styles are not scoped: classes `pachi-side-menu*`, colors from `--pachi-*` (`--pachi-surface`, `--pachi-border`,
`--pachi-accent-soft`, `--pachi-accent-ink`, ...), which you can override in the application CSS.
The nodes (`label`, `icon`, `to`, `children`, `header`) are the `PachiNavItem` type.
