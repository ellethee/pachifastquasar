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
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
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
