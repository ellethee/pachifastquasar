import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'

/** Unit tests (plain TS in `node`; components use `// @vitest-environment happy-dom` in the file): `src/` alias as in quasar.config.ts. */
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
