# Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-st-`).

CSS variables read by the page (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-bg` | `#0a0d12` | `#f0f4f8` | Background of inset elements |
| `--pachi-surface` | `#10141b` | `#ffffff` | Cards, sidebar |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Section headers, hover |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Hover of secondary controls |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Borders |
| `--pachi-border-hi` | `#2a3140` | `#b8c3cc` | Highlighted borders |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Main text |
| `--pachi-ink-2` | `#b7becc` | `#3a4252` | Secondary text |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Descriptions |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | Active section, selection |
| `--pachi-accent-soft` | `rgba(45,212,191,.12)` | `rgba(45,212,191,.1)` | Active backgrounds |
| `--pachi-accent-ink` | `#5eead4` | `#0f766e` | Accent text |
| `--pachi-red` | `#f87171` | `#dc2626` | Reset box |
| `--pachi-red-soft` | `rgba(248,113,113,.14)` | `rgba(220,38,38,.1)` | Reset box background |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Text font |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | Monospace text |

The defaults file also defines, for projects that share the same theme: `--pachi-faint`, `--pachi-accent-mid`,
`--pachi-accent-deep`, `--pachi-blue`, `--pachi-blue-soft`, `--pachi-amber`, `--pachi-amber-soft`, `--pachi-green`,
`--pachi-title-font`, `--pachi-row-h` (40px, compact 32px), `--pachi-pad` (22px, compact 16px) and `--pachi-card-r`
(12px, compact 8px).

Besides reading them, the `accent` applier **writes** `--pachi-accent`, `--pachi-accent-soft`, `--pachi-accent-mid`,
`--pachi-accent-ink` and `--pachi-accent-deep` on `<html>` when the user picks an accent colour (`teal` removes them), so
those variables cannot be overridden permanently by the stylesheet of the project. The `density`, `fontScale` and
`reduceMotion` appliers write the attributes `data-density`, `data-font-scale` (`sm` | `lg`, with `--pachi-font-scale`)
and `data-reduce-motion="true"` on `<html>`; the default styles react to them (the font-scale and reduced-motion rules
are slightly more specific than `:where` because they must beat Quasar's `body` font size and transitions).
