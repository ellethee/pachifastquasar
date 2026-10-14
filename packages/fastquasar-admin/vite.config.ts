import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Quasar: i componenti usati nei template diventano import espliciti (il consumatore non deve registrarli).
// Il CSS dei componenti è iniettato nel JS: il consumatore non deve importare nulla.
export default defineConfig({
  plugins: [
    vue(),
    quasar(),
    dts({ tsconfigPath: './tsconfig.json', processor: 'vue' }),
    // il CSS va nel chunk del componente (condiviso da `index` e `routes`), non in un entry a caso
    cssInjectedByJsPlugin({
      jsAssetsFilterFunction: (chunk) =>
        Object.keys(chunk.modules).some((id) => id.includes('PachiAdminPage.vue')),
    }),
  ],
  build: {
    // tre entry: `index`, `menu` (voce del menu account) e `routes` (scoperti dalla shell come `dist/menu.js`, `dist/routes.js`)
    lib: {
      entry: { index: 'src/index.ts', menu: 'src/menu.ts', routes: 'src/routes.ts' },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^vue($|\/)/,
        /^vue-i18n($|\/)/,
        /^quasar($|\/)/,
        /^@quasar\/extras($|\/)/,
        /^pinia($|\/)/,
        /^@ilpachi\/.*/,
      ],
    },
  },
})
