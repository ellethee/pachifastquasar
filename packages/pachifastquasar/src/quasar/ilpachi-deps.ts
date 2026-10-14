import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Pacchetti `@ilpachi/*` dichiarati dall'app (dependencies e devDependencies).
 *
 * In sviluppo Vite pre-impacchetta le dipendenze (optimizeDeps) ma serve file grezzi quelli caricati da
 * `import.meta.glob` (rotte e menu dei package): lo stato di modulo (es. `setPachiProfileUser`) finirebbe in
 * due copie diverse. Escluderli dalla pre-ottimizzazione li fa servire tutti come file grezzi, una sola copia.
 *
 * @param appDir - cartella dell'app (contiene `package.json`)
 * @returns i nomi dei pacchetti `@ilpachi/*` (vuoto se non c'è `package.json`)
 */
export function readIlpachiDependencies(appDir: string): string[] {
  const file = path.join(appDir, 'package.json')
  if (!existsSync(file)) return []
  try {
    const json = JSON.parse(readFileSync(file, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return Object.keys({ ...json.devDependencies, ...json.dependencies }).filter(name =>
      name.startsWith('@ilpachi/')
    )
  } catch {
    return []
  }
}

/** Entry di `alova` usati dai package `@ilpachi/*` (che restano esclusi dal prebundle: lo scanner non li vede). */
export const ALOVA_PREBUNDLE_ENTRIES = ['alova', 'alova/client', 'alova/fetch', 'alova/vue']

/**
 * Entry da prebundlare insieme in sviluppo. I package `@ilpachi/*` sono esclusi da `optimizeDeps` e quindi
 * Vite non scopre i loro import di `alova/client`: l'app finirebbe con due copie di alova (una prebundlata, una
 * grezza) e `usePagination` fallirebbe con "`statesHook` is not set in alova instance".
 *
 * @param appDir - cartella dell'app (con il suo `package.json`)
 * @returns le entry di alova se l'app dipende da `alova`, altrimenti `[]`
 */
export function readPrebundleDependencies(appDir: string): string[] {
  const file = path.join(appDir, 'package.json')
  if (!existsSync(file)) return []
  try {
    const json = JSON.parse(readFileSync(file, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = { ...json.devDependencies, ...json.dependencies }
    return 'alova' in names ? ALOVA_PREBUNDLE_ENTRIES : []
  } catch {
    return []
  }
}
