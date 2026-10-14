/**
 * Tipi strutturali per `quasar.config.ts`: il pacchetto non importa `#q-app` (esiste solo dentro
 * un'app Quasar), quindi descrive solo ciò che usa.
 */

/** Contesto che Quasar passa alla funzione di configurazione (parte usata qui). */
export interface PachiQuasarContext {
  appPaths?: { appDir?: string; srcDir?: string }
  dev?: boolean
  prod?: boolean
  [key: string]: unknown
}

/** Configurazione di Vite (parte usata da `extendViteConf`). */
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

/** Configurazione di Quasar (oggetto restituito da `quasar.config.ts`). */
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

/** Override accettati da {@link definePachiQuasarConfig}: oggetto (merge) o funzione `(base, ctx) => config`. */
export type PachiQuasarOverrides =
  | PachiQuasarConfig
  | ((base: PachiQuasarConfig, ctx: PachiQuasarContext) => PachiQuasarConfig)

/** Opzioni del preset (non fanno parte della configurazione di Quasar). */
export interface PachiQuasarOptions {
  /** Target del proxy `/api` (default `QCLI_PROXY_TARGET` oppure `http://localhost:8000`). */
  proxyTarget?: string
  /** Porta del dev server (default 9001). */
  port?: number
  /** Attiva `vite-plugin-checker` con vue-tsc (default true; richiede `vue-tsc` e `typescript` nell'app). */
  checker?: boolean
  /** Lingua del language pack di Quasar all'avvio (default `it`). */
  lang?: string
  /** Alias aggiuntivi verso i sorgenti dell'app, oltre a `src`, `assets`, `boot`, `stores`, `features`. */
  aliases?: string[]
}
