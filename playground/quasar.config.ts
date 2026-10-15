// Playground of @ilpachi/pachifastquasar: the configuration is the package preset's.
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import { fileURLToPath } from 'node:url'
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

// Development: the package is resolved from the SOURCES (repo src/, with hot reload). To try the built
// package (dist/) use PACHI_PLAYGROUND_DIST=true (`pnpm build:playground` does it).
const useDist = process.env.PACHI_PLAYGROUND_DIST === 'true'
const srcOf = (pkg: string, entry = 'index'): string =>
  fileURLToPath(new URL(`../packages/${pkg}/src/${entry}.ts`, import.meta.url))

export default definePachiQuasarConfig({
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
      viteConf.resolve = { ...viteConf.resolve, alias }
    }
  }
})
