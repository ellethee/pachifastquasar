import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'

/** Test unitari (TS puro in `node`; i componenti usano `// @vitest-environment happy-dom` nel file): alias `src/` come in quasar.config.ts. */
export default defineConfig({
  plugins: [vue(), quasar()],
  resolve: {
    alias: [{ find: /^src\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
