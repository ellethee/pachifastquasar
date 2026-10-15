/**
 * Structural types for `quasar.config.ts`: the package does not import `#q-app` (it only exists inside
 * a Quasar app), so it describes only what it uses.
 */

/** Context Quasar passes to the configuration function (the part used here). */
export interface PachiQuasarContext {
  appPaths?: { appDir?: string; srcDir?: string }
  dev?: boolean
  prod?: boolean
  [key: string]: unknown
}

/** Vite configuration (the part used by `extendViteConf`). */
export interface PachiViteConf {
  envDir?: string
  envPrefix?: string | string[]
  build?: { cssMinify?: boolean | string; [key: string]: unknown }
  resolve?: {
    alias?: unknown
    dedupe?: string[]
    [key: string]: unknown
  }
  optimizeDeps?: { exclude?: string[]; include?: string[]; [key: string]: unknown }
  plugins?: unknown[]
  [key: string]: unknown
}

/** Quasar configuration (object returned by `quasar.config.ts`). */
export interface PachiQuasarConfig {
  boot?: (string | Record<string, unknown>)[]
  css?: (string | Record<string, unknown>)[]
  extras?: string[]
  build?: {
    extendViteConf?: (viteConf: PachiViteConf, invokeParams?: unknown) => void
    typescript?: {
      extendTsConfig?: (tsConfig: Record<string, any>) => void
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  devServer?: Record<string, unknown>
  framework?: Record<string, unknown>
  [key: string]: unknown
}

/** Overrides accepted by {@link definePachiQuasarConfig}: object (merge) or function `(base, ctx) => config`. */
export type PachiQuasarOverrides =
  | PachiQuasarConfig
  | ((base: PachiQuasarConfig, ctx: PachiQuasarContext) => PachiQuasarConfig)

/** Preset options (not part of the Quasar configuration). */
export interface PachiQuasarOptions {
  /** `/api` proxy target (default `QCLI_PROXY_TARGET` or `http://localhost:8000`). */
  proxyTarget?: string
  /** Dev server port (default 9001). */
  port?: number
  /** Enables `vite-plugin-checker` with vue-tsc (default true; requires `vue-tsc` and `typescript` in the app). */
  checker?: boolean
  /** Quasar language pack language at startup (default `it`). */
  lang?: string
  /** Additional aliases to the app sources, besides `src`, `assets`, `boot`, `stores`, `features`. */
  aliases?: string[]
}
