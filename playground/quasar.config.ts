// Playground of @ilpachi/pachifastquasar: the configuration is the package preset's.
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import { fileURLToPath } from 'node:url'
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

// Development: the package and its SCSS styles are resolved from the SOURCES (repo src/, with hot reload). To try the built
// package (dist/) use PACHI_PLAYGROUND_DIST=true (`pnpm build:playground` does it).
const useDist = process.env.PACHI_PLAYGROUND_DIST === 'true'
const srcOf = (pkg: string, entry = 'index'): string =>
  fileURLToPath(new URL(`../packages/${pkg}/src/${entry}.ts`, import.meta.url))

export default definePachiQuasarConfig({
  // opt-in themes: they only take effect with `app.themes` (data-theme on <body>)
  css: ['~@ilpachi/pachifastquasar/themes.css'],
  build: {
    extendViteConf(viteConf) {
      if (useDist) return
      const alias = Array.isArray(viteConf.resolve?.alias) ? viteConf.resolve.alias : []
      alias.unshift({ find: /^@ilpachi\/pachifastquasar$/, replacement: srcOf('pachifastquasar') })
      // The workspace fastquasar-* packages, from the sources (entries: index, menu, routes)
      for (const pkg of ['fastquasar-settings', 'fastquasar-profile', 'fastquasar-admin']) {
        for (const entry of ['menu', 'routes']) {
          alias.unshift({
            find: new RegExp(`^@ilpachi/${pkg}/${entry}$`),
            replacement: srcOf(pkg, entry)
          })
        }
        alias.unshift({ find: new RegExp(`^@ilpachi/${pkg}$`), replacement: srcOf(pkg) })
      }
      // pachi-kit: one entry per area (no root import), from the sources
      alias.unshift({
        find: /^@ilpachi\/pachi-kit\/(ui|dialog|edit-dialog|fields|table|uploader)$/,
        replacement: fileURLToPath(new URL('../packages/pachi-kit/src/$1/index.ts', import.meta.url))
      })
      // shell styles from the SCSS sources (hot reload) instead of the compiled `dist/*.css`; dev only
      for (const [css, scss] of [['styles', 'index'], ['themes', 'themes']] as const) {
        alias.unshift({
          find: new RegExp(`^@ilpachi/pachifastquasar/${css}\\.css$`),
          replacement: fileURLToPath(new URL(`../packages/pachifastquasar/src/scss/${scss}.scss`, import.meta.url))
        })
      }
      viteConf.resolve = { ...viteConf.resolve, alias }
    }
  }
})
