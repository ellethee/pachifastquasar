import { defineConfig } from 'vitest/config'

export default defineConfig({
  // il dist dei package importa i sorgenti di Quasar (che si aspettano i define del plugin Vite)
  define: { __QUASAR_SSR__: false, __QUASAR_SSR_SERVER__: false, __QUASAR_SSR_CLIENT__: false, __QUASAR_SSR_PWA__: false, __QUASAR_VERSION__: JSON.stringify('2') },
  test: {
    // ambiente Node con DOM di happy-dom ma fetch nativo (vedi tests/setup-dom.ts)
    environment: 'node',
    setupFiles: ['tests/setup-dom.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    // i test condividono lo stato del backend: in sequenza
    fileParallelism: false,
  },
})
