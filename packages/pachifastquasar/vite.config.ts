import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

/**
 * Il logo SVG (~83 KB) non va inlinato in base64 nel JS, ma in lib mode Vite inlina SEMPRE gli asset
 * (`new URL('...logo.svg', import.meta.url)` diventa un data URL). Questo plugin, solo in build, sostituisce il
 * data URL con un riferimento relativo `./assets/logo.svg` ed emette il file in `dist/assets/`: l'app che installa
 * il pacchetto vede un `new URL('./assets/logo.svg', import.meta.url)` letterale e lo gestisce lei (dev server e
 * `quasar build` copiano l'asset con hash). In sviluppo/test (alias ai sorgenti) il plugin non agisce.
 */
function pachiLogoAsset(): Plugin {
  // rolldown emette `"" + import.meta.url` (Rollup: `import.meta.url`): accetta entrambe le forme
  const dataUrl = /new URL\("data:image\/svg\+xml[^"]*", (?:"" \+ )?import\.meta\.url\)/g
  return {
    name: 'pachi-logo-asset',
    apply: 'build',
    renderChunk(code) {
      if (!dataUrl.test(code)) return null
      dataUrl.lastIndex = 0
      return { code: code.replace(dataUrl, 'new URL("./assets/logo.svg", import.meta.url)'), map: null }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/logo.svg',
        source: readFileSync(new URL('./src/assets/logo/logo.svg', import.meta.url))
      })
    }
  }
}

// Build principale del pacchetto (browser): `dist/index.js` + `.d.ts`.
// Quasar: i componenti usati nei template diventano import espliciti (l'app non deve registrarli).
// Il CSS dei componenti è iniettato nel JS; gli stili globali sono in `dist/styles.css` (vedi scripts/build-styles.mjs).
// L'entry Node `./quasar` ha una build separata: vite.config.node.ts.
export default defineConfig({
  plugins: [
    vue(),
    quasar(),
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src'],
      processor: 'vue',
      exclude: ['src/quasar']
    }),
    cssInjectedByJsPlugin(),
    pachiLogoAsset()
  ],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^vue($|\/)/,
        /^vue-router($|\/)/,
        /^vue-i18n($|\/)/,
        /^quasar($|\/)/,
        /^@quasar\/extras($|\/)/,
        /^pinia($|\/)/,
        /^pinia-plugin-persistedstate($|\/)/,
        /^alova($|\/)/,
        /^@ilpachi\/.*/
      ]
    }
  }
})
