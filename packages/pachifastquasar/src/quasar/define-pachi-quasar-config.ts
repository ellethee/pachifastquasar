import path from 'node:path'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import checker from 'vite-plugin-checker'
import { mergeQuasarConfig } from './merge'
import { readIlpachiDependencies, readPrebundleDependencies } from './ilpachi-deps'
import type {
  PachiQuasarConfig,
  PachiQuasarContext,
  PachiQuasarOptions,
  PachiQuasarOverrides,
  PachiViteConf
} from './types'

/** Alias "v2" ricreati a mano: Quasar v3/Vite non li fornisce più. */
const V2_ALIASES = ['src', 'assets', 'boot', 'stores', 'features']

/** Pacchetti che devono essere un'unica istanza (il pacchetto e l'app non devono averne due copie). */
const SINGLETONS = [
  'vue',
  'vue-router',
  'vue-i18n',
  'quasar',
  'pinia',
  'alova',
  '@quasar/extras',
  '@ilpachi/use-alova',
  '@ilpachi/pachi-i18n'
]

/**
 * Configurazione di base di Quasar per un'app che usa la shell Pachi (SPA).
 *
 * @param ctx - contesto di Quasar (serve `appPaths.appDir`; senza si usa `process.cwd()`)
 * @param options - opzioni del preset
 * @returns configurazione di Quasar
 */
export function createPachiQuasarBase(
  ctx: PachiQuasarContext = {},
  options: PachiQuasarOptions = {}
): PachiQuasarConfig {
  const appDir = ctx.appPaths?.appDir ?? process.cwd()
  const srcDir = ctx.appPaths?.srcDir ?? path.join(appDir, 'src')
  const proxyTarget = options.proxyTarget ?? process.env.QCLI_PROXY_TARGET ?? 'http://localhost:8000'
  const aliases = [...new Set([...V2_ALIASES, ...(options.aliases ?? [])])]

  return {
    // boot file dell'app (src/boot/pachi.ts): `createPachiApp(ctx, { ... })`
    boot: ['pachi'],
    // stili globali della shell (compilati): vengono dopo il CSS di Quasar e prima di quello dell'app
    css: ['~@ilpachi/pachifastquasar/styles.css'],
    extras: ['roboto-font'],
    build: {
      distDir: 'dist/spa',
      typescript: {
        strict: true,
        vueShim: true,
        // `src/*` per il codice dell'app nel tsconfig generato in .quasar/
        extendTsConfig(tsConfig: Record<string, any>) {
          const qAppPath = tsConfig.compilerOptions?.paths?.['#q-app']
          tsConfig.compilerOptions ??= {}
          tsConfig.compilerOptions.paths = {
            ...tsConfig.compilerOptions.paths,
            'src/*': ['./../src/*'],
            ...(qAppPath ? { '#q-app/wrappers': qAppPath } : {})
          }
        }
      },
      vueRouterMode: 'history',
      // Env locali dell'app (`pachiConfigFromEnv(import.meta.env)` legge QCLI_*): cartella src/ dell'app
      extendViteConf(viteConf: PachiViteConf) {
        viteConf.envDir = srcDir
        viteConf.envPrefix = ['VITE_', 'QCLI_']
        // lightningcss (default Vite 8) rifiuta CSS non valido in qcalendar; esbuild è più permissivo
        viteConf.build = viteConf.build ?? {}
        viteConf.build.cssMinify = 'esbuild'

        viteConf.resolve = viteConf.resolve ?? {}
        const existing = Array.isArray(viteConf.resolve.alias)
          ? (viteConf.resolve.alias as { find: string | RegExp; replacement: string }[])
          : Object.entries((viteConf.resolve.alias ?? {}) as Record<string, string>).map(
              ([find, replacement]) => ({ find, replacement })
            )
        for (const alias of aliases) {
          const target = alias === 'src' ? srcDir : path.join(srcDir, alias)
          existing.push({ find: new RegExp(`^${alias}/`), replacement: `${target}/` })
        }
        viteConf.resolve.alias = existing
        viteConf.resolve.dedupe = [...new Set([...(viteConf.resolve.dedupe ?? []), ...SINGLETONS])]
        // i package @ilpachi/* (rotte, menu, stato di modulo) restano file grezzi: una sola copia in sviluppo
        const optimizeDeps = (viteConf.optimizeDeps ??= {})
        optimizeDeps.exclude = [
          ...new Set([...(optimizeDeps.exclude ?? []), ...readIlpachiDependencies(appDir)])
        ]
        // ...ma le loro dipendenze condivise (alova) vanno prebundlate insieme a quelle dell'app
        optimizeDeps.include = [
          ...new Set([...(optimizeDeps.include ?? []), ...readPrebundleDependencies(appDir)])
        ]

        viteConf.plugins = viteConf.plugins ?? []
        viteConf.plugins.push(
          // i messaggi sono oggetti TS (non precompilati dal plugin): serve il message compiler a runtime
          VueI18nPlugin({ runtimeOnly: false, include: [path.join(srcDir, 'i18n')] })
        )
        if (options.checker !== false) viteConf.plugins.push(checker({ vueTsc: true }))
      }
    },
    devServer: {
      port: options.port ?? 9001,
      open: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewriteWsOrigin: true
        }
      }
    },
    framework: {
      config: { dark: 'auto' },
      iconSet: 'svg-mdi-v7',
      lang: options.lang ?? 'it',
      plugins: ['Dialog', 'Notify', 'Loading', 'Dark']
    },
    animations: 'all'
  }
}

/**
 * Preset di `quasar.config.ts` per le app basate su `@ilpachi/pachifastquasar`. Riproduce la configurazione
 * del boilerplate originale: boot `pachi`, stili della shell, alias `src/`, `assets/`, `boot/`, `stores/`,
 * `features/`, env `QCLI_*`/`VITE_*` in `src/`, plugin `unplugin-vue-i18n` (con `runtimeOnly: false`),
 * `vite-plugin-checker`, proxy `/api` verso `QCLI_PROXY_TARGET`, icone `svg-mdi-v7`, plugin Quasar
 * `Dialog`, `Notify`, `Loading`, `Dark`.
 *
 * Gli override si uniscono alla base: oggetti in merge ricorsivo, array concatenati, `extendViteConf` e
 * `extendTsConfig` eseguite dopo quelle del preset; con una funzione `(base, ctx) => config` si ha il controllo
 * completo.
 *
 * @example
 * export default definePachiQuasarConfig({ build: { vueRouterMode: 'hash' } })
 *
 * @param overrides - configurazione dell'app (oggetto o funzione)
 * @param options - opzioni del preset (`proxyTarget`, `port`, `checker`, `lang`, `aliases`)
 * @returns funzione di configurazione per Quasar (`export default`)
 */
export function definePachiQuasarConfig(
  overrides: PachiQuasarOverrides = {},
  options: PachiQuasarOptions = {}
): (ctx: PachiQuasarContext) => PachiQuasarConfig {
  return ctx => {
    const base = createPachiQuasarBase(ctx, options)
    return typeof overrides === 'function'
      ? overrides(base, ctx)
      : mergeQuasarConfig(base, overrides as Record<string, unknown>)
  }
}

/** Alias di {@link definePachiQuasarConfig}. */
export const pachiQuasarConfig = definePachiQuasarConfig
