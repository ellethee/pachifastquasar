import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

/**
 * The SVG logo (~83 KB) must not be inlined as base64 in the JS, but in lib mode Vite ALWAYS inlines assets
 * (`new URL('...logo.svg', import.meta.url)` becomes a data URL). This plugin, in build only, replaces the
 * data URL with a relative reference `./assets/logo.svg` and emits the file in `dist/assets/`: the app that installs
 * the package sees a literal `new URL('./assets/logo.svg', import.meta.url)` and handles it itself (dev server and
 * `quasar build` copy the asset with a hash). In development/test (source aliases) the plugin does nothing.
 */
function pachiLogoAsset(): Plugin {
  // rolldown emits `"" + import.meta.url` (Rollup: `import.meta.url`): accept both forms
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

// Main package build (browser): `dist/index.js` + `.d.ts`.
// Quasar: components used in templates become explicit imports (the app does not need to register them).
// The component CSS is injected into the JS; the global styles are in `dist/styles.css` (see scripts/build-styles.mjs).
// The Node `./quasar` entry has a separate build: vite.config.node.ts.
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
