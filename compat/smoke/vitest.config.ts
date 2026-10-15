import { defineConfig } from 'vitest/config'

export default defineConfig({
  // the packages' dist imports the Quasar sources (which expect the Vite plugin defines)
  define: { __QUASAR_SSR__: false, __QUASAR_SSR_SERVER__: false, __QUASAR_SSR_CLIENT__: false, __QUASAR_SSR_PWA__: false, __QUASAR_VERSION__: JSON.stringify('2') },
  test: {
    // Node environment with happy-dom's DOM but native fetch (see tests/setup-dom.ts)
    environment: 'node',
    setupFiles: ['tests/setup-dom.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    // tests share the backend state: run sequentially
    fileParallelism: false,
  },
})
