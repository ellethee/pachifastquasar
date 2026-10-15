import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// Build of the Node `./quasar` entry (helpers for quasar.config.ts): `dist/quasar.js`, without Vue nor components.
// It runs in Node (quasar.config.ts), so all dependencies stay external.
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src/quasar'],
      entryRoot: 'src'
    })
  ],
  build: {
    emptyOutDir: false,
    ssr: true,
    target: 'node20',
    sourcemap: true,
    lib: { entry: 'src/quasar/index.ts', formats: ['es'], fileName: 'quasar' },
    rolldownOptions: {
      output: { entryFileNames: 'quasar.js' },
      external: [/^node:/, /^@intlify\//, /^vite-plugin-checker/, /^vite($|\/)/]
    }
  }
})
