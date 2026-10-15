import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'

/** Tests: `node` by default, components use `// @vitest-environment happy-dom` in the file. */
export default defineConfig({
  plugins: [vue(), quasar()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
