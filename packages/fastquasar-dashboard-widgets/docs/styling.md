# Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-pdw-`, `pachi-dac-` and `pachi-dsc-`). The card has a
minimum height of 230 px.

CSS variables read by the cards (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-surface` | `#10141b` | `#ffffff` | Card background |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Skeleton |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Skeleton shimmer |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Card border |
| `--pachi-border-hi` | `#2a3140` | `#b8c3cc` | Border on hover, background grid |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Title and values |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Row labels |
| `--pachi-faint` | `#525b6b` | `#9aa3b0` | Card code, empty state |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | "ok" status dot |
| `--pachi-accent-ink` | `#5eead4` | `#0f766e` | Icons |
| `--pachi-amber` | `#fbbf24` | `#d97706` | "warn" status dot |
| `--pachi-red` | `#f87171` | `#dc2626` | "error" status dot, error message |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Title |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | Code, times, values |

The defaults file also defines, for projects that share the same theme: `--pachi-bg`, `--pachi-ink-2`,
`--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-accent-deep`, `--pachi-blue`, `--pachi-blue-soft`,
`--pachi-amber-soft`, `--pachi-red-soft`, `--pachi-green`, `--pachi-title-font`, `--pachi-row-h`, `--pachi-pad` and
`--pachi-card-r`. The glow and the icon box of the card use a fixed teal (`rgba(45, 212, 191, ...)`) that does not follow
`--pachi-accent`.
