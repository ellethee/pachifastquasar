import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Quasar: i componenti usati nei template diventano import espliciti (il consumatore non deve registrarli).
// Il CSS dei componenti è iniettato nel JS (per chunk): importare un sotto-percorso carica solo i suoi stili.
// Un entry per area (sotto-percorsi di `exports`), i moduli condivisi finiscono in chunk comuni.
export default defineConfig({
  plugins: [
    vue(),
    quasar(),
    dts({ tsconfigPath: './tsconfig.json', processor: 'vue' }),
    cssInjectedByJsPlugin({ relativeCSSInjection: true }),
  ],
  build: {
    lib: {
      entry: {
        'ui/index': 'src/ui/index.ts',
        'ui/PachiPopupEdit': 'src/ui/PachiPopupEdit.vue',
        'dialog/index': 'src/dialog/index.ts',
        'dialog/composables/usePachiDialogToolbar': 'src/dialog/composables/usePachiDialogToolbar.ts',
        'dialog/composables/editor-defaults': 'src/dialog/composables/editor-defaults.ts',
        'edit-dialog/index': 'src/edit-dialog/index.ts',
        'fields/index': 'src/fields/index.ts',
        'table/index': 'src/table/index.ts',
        'uploader/index': 'src/uploader/index.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
      external: [
        /^vue($|\/)/,
        /^vue-i18n($|\/)/,
        /^quasar($|\/)/,
        /^@quasar\/extras($|\/)/,
        /^alova($|\/)/,
        /^@ilpachi\//,
      ],
    },
  },
})
