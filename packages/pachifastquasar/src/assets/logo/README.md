# Logo

Pachifast Quasar logo (elephant head). Master sources live in the repository root `assets/`:

| File                      | Use                                                            |
| ------------------------- | -------------------------------------------------------------- |
| `logo.svg`                | shell logo (`pachiLogo`: bar, login, home); also in `dist/assets/` |
| `favicon.svg`             | browser tab favicon (head only)                                |
| `favicon.ico`             | 16/32/48 px fallback                                           |
| `favicon-32.png`          | PNG fallback                                                   |
| `favicon-192.png`         | PWA/Android icon                                               |
| `apple-touch-icon.png`    | iOS 180x180, white background (iOS fills transparency black)   |

Only `logo.svg` ships in the package. The `favicon*` and `apple-touch-icon.png` files serve `playground/public/` and the
`pachifq` app template (`templates/app/public/`); an app changes its favicon by replacing the files in `public/`.

The PNG/ICO files are rendered from `assets/favicon.svg` (squared with a transparent border) with `inkscape` and
ImageMagick (`convert`).
