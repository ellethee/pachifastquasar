import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Quasar: the components used in templates become explicit imports (the consumer does not need to register them).
// The components' CSS is injected into the JS: the consumer does not need to import anything.
export default defineConfig({
  plugins: [
    vue(),
    quasar(),
    dts({ tsconfigPath: './tsconfig.json', processor: 'vue' }),
    // the CSS goes into the component chunk (shared by `index` and `routes`), not into a random entry
    cssInjectedByJsPlugin({
      jsAssetsFilterFunction: (chunk) =>
        Object.keys(chunk.modules).some((id) => id.includes('PachiAdminPage.vue')),
    }),
  ],
  build: {
    // three entries: `index`, `menu` (account menu item) and `routes` (discovered by the shell as `dist/menu.js`, `dist/routes.js`)
    lib: {
      entry: { index: 'src/index.ts', menu: 'src/menu.ts', routes: 'src/routes.ts' },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
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
