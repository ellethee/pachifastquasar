import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// Build dell'entry Node `./quasar` (helper per quasar.config.ts): `dist/quasar.js`, senza Vue né componenti.
// Gira in Node (quasar.config.ts), quindi tutte le dipendenze restano esterne.
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
