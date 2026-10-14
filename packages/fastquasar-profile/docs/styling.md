# Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-profile-`).

CSS variables read by the page (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-bg` | `#0a0d12` | `#f0f4f8` | Initials colour on the accent gradient |
| `--pachi-surface` | `#10141b` | `#ffffff` | Cards |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Section header, skeleton |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Skeleton shimmer |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Borders |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Main text |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Labels, user id |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | Avatar gradient, glow |
| `--pachi-accent-deep` | `#0f766e` | `#0d9488` | Avatar gradient |
| `--pachi-green` | `#34d399` | `#059669` | "Active" badge |
| `--pachi-amber` | `#fbbf24` | `#d97706` | "Staff" badge |
| `--pachi-amber-soft` | `rgba(251,191,36,.14)` | `rgba(217,119,6,.1)` | "Staff" badge background |
| `--pachi-blue` | `#60a5fa` | `#2563eb` | "Email verified" badge |
| `--pachi-violet` | not defined (fallback `#a78bfa`) | same | "Superuser" badge (optional variable) |
| `--pachi-card-r` | `12px` (compact `8px`) | same | Card radius |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Text font |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | User id and dates |

The defaults file also defines, for projects that share the same theme: `--pachi-border-hi`, `--pachi-ink-2`,
`--pachi-faint`, `--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-accent-ink`, `--pachi-blue-soft`,
`--pachi-red`, `--pachi-red-soft`, `--pachi-title-font`, `--pachi-row-h` and `--pachi-pad`.
