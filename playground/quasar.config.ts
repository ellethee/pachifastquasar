// Playground di @ilpachi/pachifastquasar: la configurazione è quella del preset del pacchetto.
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import { fileURLToPath } from 'node:url'
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

// Sviluppo: il pacchetto si risolve dai SORGENTI (src/ del repo, con hot reload). Per provare il pacchetto
// buildato (dist/) usare PACHI_PLAYGROUND_DIST=true (lo fa `pnpm build:playground`).
const useDist = process.env.PACHI_PLAYGROUND_DIST === 'true'
const srcOf = (pkg: string, entry = 'index'): string =>
  fileURLToPath(new URL(`../packages/${pkg}/src/${entry}.ts`, import.meta.url))

export default definePachiQuasarConfig({
  build: {
    extendViteConf(viteConf) {
      if (useDist) return
      const alias = Array.isArray(viteConf.resolve?.alias) ? viteConf.resolve.alias : []
      alias.unshift({ find: /^@ilpachi\/pachifastquasar$/, replacement: srcOf('pachifastquasar') })
      // I package fastquasar-* del workspace, dai sorgenti (entry: index, menu, routes)
      for (const pkg of ['fastquasar-settings', 'fastquasar-profile', 'fastquasar-admin']) {
        for (const entry of ['menu', 'routes']) {
          alias.unshift({
            find: new RegExp(`^@ilpachi/${pkg}/${entry}$`),
            replacement: srcOf(pkg, entry)
          })
        }
        alias.unshift({ find: new RegExp(`^@ilpachi/${pkg}$`), replacement: srcOf(pkg) })
      }
      // pachi-kit: un entry per area (nessun import di radice), dai sorgenti
      alias.unshift({
        find: /^@ilpachi\/pachi-kit\/(ui|dialog|edit-dialog|fields|table|uploader)$/,
        replacement: fileURLToPath(new URL('../packages/pachi-kit/src/$1/index.ts', import.meta.url))
      })
      viteConf.resolve = { ...viteConf.resolve, alias }
    }
  }
})
