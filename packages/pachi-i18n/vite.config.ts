import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'

// Quasar: i componenti usati nei template diventano import espliciti (il consumatore non deve registrarli).
export default defineConfig({
  plugins: [vue(), quasar(), dts({ tsconfigPath: './tsconfig.json', processor: 'vue' })],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    sourcemap: true,
    rolldownOptions: {
      external: [/^vue($|\/)/, /^vue-i18n($|\/)/, /^quasar($|\/)/, /^@quasar\/extras($|\/)/],
    },
  },
})
