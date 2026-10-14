import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'

/** Test: `node` di default, i componenti usano `// @vitest-environment happy-dom` nel file. */
export default defineConfig({
  plugins: [vue(), quasar()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
