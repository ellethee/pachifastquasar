# Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`),
a dark theme on `:root`, a light theme on `body.body--light` and a compact density on
`:root[data-density='compact']`. If the project defines the same `--pachi-*` variables, its values win. Styles are not
`scoped`; every class starts with `pachi-admin`.

| Variable | Used for |
| --- | --- |
| `--pachi-surface`, `--pachi-surface-2`, `--pachi-surface-3` | Cards, filter bar, badges |
| `--pachi-border` | Borders |
| `--pachi-ink`, `--pachi-ink-2`, `--pachi-muted` | Text |
| `--pachi-accent`, `--pachi-accent-soft`, `--pachi-accent-ink` | Selected model, success banner, "created" badge |
| `--pachi-red`, `--pachi-red-soft`, `--pachi-green`, `--pachi-amber`, `--pachi-blue` | Errors, diff, badges, info banner |
| `--pachi-card-r`, `--pachi-pad` | Radius and padding |
| `--pachi-font`, `--pachi-mono`, `--pachi-title-font` | Fonts |

## Layout

The layout of the shell is one viewport tall and does not scroll. The page therefore scrolls by itself
(`max-height: var(--pachi-page-height, none); overflow-y: auto`; the variable is defined by the shell) and the model list
stays sticky. The dialog body scrolls inside the dialog (`max-height: 62vh`), so the buttons are always reachable.
Below 760 px the model list goes on top of the table; below 600 px the form has one column.
