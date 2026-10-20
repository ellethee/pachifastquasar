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

/** "v2" aliases recreated by hand: Quasar v3/Vite no longer provides them. */
const V2_ALIASES = ['src', 'assets', 'boot', 'stores', 'features']

/** Packages that must be a single instance (the package and the app must not have two copies). */
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

/** Minimal shape of the `http-proxy` objects used by the dev-proxy `configure` hook. */
interface ProxyReqLike {
  getHeader(name: string): unknown
  setHeader(name: string, value: string): void
}
interface ProxyLike {
  on(event: 'proxyReq', cb: (req: ProxyReqLike) => void): void
}

/**
 * Base Quasar configuration for an app that uses the Pachi shell (SPA).
 *
 * @param ctx - Quasar context (needs `appPaths.appDir`; without it `process.cwd()` is used)
 * @param options - preset options
 * @returns Quasar configuration
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
    // app boot file (src/boot/pachi.ts): `createPachiApp(ctx, { ... })`
    boot: ['pachi'],
    // shell global styles (compiled): they come after the Quasar CSS and before the app one
    css: ['~@ilpachi/pachifastquasar/styles.css'],
    extras: ['roboto-font'],
    build: {
      distDir: 'dist/spa',
      typescript: {
        strict: true,
        vueShim: true,
        // `src/*` for the app code in the tsconfig generated in .quasar/
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
      // App local envs (`pachiConfigFromEnv(import.meta.env)` reads QCLI_*): the app's src/ folder
      extendViteConf(viteConf: PachiViteConf) {
        viteConf.envDir = srcDir
        viteConf.envPrefix = ['VITE_', 'QCLI_']
        // lightningcss (default Vite 8) rejects invalid CSS in qcalendar; esbuild is more permissive
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
        // the @ilpachi/* packages (routes, menus, module state) stay raw files: a single copy in development
        const optimizeDeps = (viteConf.optimizeDeps ??= {})
        optimizeDeps.exclude = [
          ...new Set([...(optimizeDeps.exclude ?? []), ...readIlpachiDependencies(appDir)])
        ]
        // ...but their shared dependencies (alova) must be prebundled together with the app ones
        optimizeDeps.include = [
          ...new Set([...(optimizeDeps.include ?? []), ...readPrebundleDependencies(appDir)])
        ]

        viteConf.plugins = viteConf.plugins ?? []
        viteConf.plugins.push(
          // messages are TS objects (not precompiled by the plugin): the message compiler is needed at runtime
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
          rewriteWsOrigin: true,
          // changeOrigin rewrites Host but not Origin: pachifast (cookie refresh mode) compares them
          configure: (proxy: ProxyLike) => {
            proxy.on('proxyReq', (proxyReq: ProxyReqLike) => {
              if (proxyReq.getHeader('origin')) proxyReq.setHeader('origin', new URL(proxyTarget).origin)
            })
          }
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
 * `quasar.config.ts` preset for apps based on `@ilpachi/pachifastquasar`. It reproduces the configuration
 * of the original boilerplate: `pachi` boot, shell styles, `src/`, `assets/`, `boot/`, `stores/`,
 * `features/` aliases, `QCLI_*`/`VITE_*` envs in `src/`, `unplugin-vue-i18n` plugin (with `runtimeOnly: false`),
 * `vite-plugin-checker`, `/api` proxy to `QCLI_PROXY_TARGET`, `svg-mdi-v7` icons, Quasar plugins
 * `Dialog`, `Notify`, `Loading`, `Dark`.
 *
 * Overrides are merged into the base: objects are merged recursively, arrays concatenated, `extendViteConf` and
 * `extendTsConfig` run after the preset ones; with a function `(base, ctx) => config` you get full
 * control.
 *
 * @example
 * export default definePachiQuasarConfig({ build: { vueRouterMode: 'hash' } })
 *
 * @param overrides - app configuration (object or function)
 * @param options - preset options (`proxyTarget`, `port`, `checker`, `lang`, `aliases`)
 * @returns configuration function for Quasar (`export default`)
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

/** Alias of {@link definePachiQuasarConfig}. */
export const pachiQuasarConfig = definePachiQuasarConfig
