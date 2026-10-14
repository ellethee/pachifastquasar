import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PACKAGE_SCOPE } from './workspace-packages.js'

/** Codice lingua ammesso: BCP 47 semplificato (`fr`, `pt-BR`, `zh-Hans`). */
const LOCALE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/** Errore di validazione/generazione delle lingue. */
export class LocaleError extends Error {}

/**
 * Verifica che il codice lingua sia valido.
 *
 * @param code - codice (es. `fr`, `pt-BR`)
 */
export function validateLocaleCode(code: string): void {
  if (!LOCALE_CODE_RE.test(code)) {
    throw new LocaleError(`Codice lingua non valido: "${code}". Esempi: fr, de, pt-BR.`)
  }
}

/**
 * Elenca i codici lingua (nome file senza estensione) di una cartella `locales`.
 *
 * @param localesDir - cartella con i file `<codice>.ts`
 */
export function listLocaleCodes(localesDir: string): string[] {
  if (!existsSync(localesDir)) return []
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ts$/.test(entry.name) && !/^index\.ts$/.test(entry.name))
    .map((entry) => entry.name.replace(/\.ts$/, ''))
    .sort()
}

/**
 * Trasforma un file lingua sorgente (`en.ts`) in una bozza per una nuova lingua: stesse chiavi,
 * valori da tradurre, commento TODO.
 *
 * @param source - contenuto del file sorgente
 * @param code - codice della nuova lingua
 */
export function toLocaleDraft(source: string, code: string): string {
  const todo = `/** Messaggi "${code}". TODO: traduci i valori (le chiavi devono restare identiche a it.ts). */`
  const body = source
    .replace(/\/\*\*[\s\S]*?\*\//, todo)
    .replace(/\bconst en\b/, 'const messages')
    .replace(/export default en\b/, 'export default messages')
  return body.includes('TODO: traduci') ? body : `${todo}\n${body}`
}

/** Esito della creazione di un file lingua. */
export interface LocaleFileResult {
  /** Percorso assoluto del file. */
  file: string
  /** `created` se scritto, `exists` se già presente (non sovrascritto). */
  status: 'created' | 'exists'
}

/**
 * Crea `<localesDir>/<code>.ts` partendo da `en.ts` (o `it.ts`) della stessa cartella, senza sovrascrivere.
 * Restituisce `undefined` se nella cartella non c'è un sorgente da cui partire.
 *
 * @param localesDir - cartella `locales`
 * @param code - codice della nuova lingua
 */
export async function createLocaleFile(localesDir: string, code: string): Promise<LocaleFileResult | undefined> {
  const target = path.join(localesDir, `${code}.ts`)
  if (existsSync(target)) return { file: target, status: 'exists' }
  const source = ['en.ts', 'it.ts'].map((name) => path.join(localesDir, name)).find((file) => existsSync(file))
  if (!source) return undefined
  await mkdir(localesDir, { recursive: true })
  await writeFile(target, toLocaleDraft(await readFile(source, 'utf-8'), code), 'utf-8')
  return { file: target, status: 'created' }
}

/**
 * Bozza minima della lingua dell'app quando non esiste ancora né `en.ts` né `it.ts`: i messaggi della shell
 * (namespace `app`, `auth`, `menu`, `dashboard`, `errors`, `common`) vivono nel pacchetto e ripiegano su `en`;
 * l'app aggiunge qui solo ciò che vuole tradurre o ridefinire.
 *
 * @param code - codice della nuova lingua
 */
export function appLocaleStub(code: string): string {
  return `/**
 * Messaggi "${code}" dell'app. TODO: traduci.
 * Sono sovrapposti a quelli di @ilpachi/pachifastquasar (namespace \`app\`, \`auth\`, \`menu\`, \`dashboard\`,
 * \`errors\`, \`common\`): ridefinisci qui le chiavi che vuoi tradurre, le altre ripiegano su "en".
 */
const messages = {
  // auth: { login: { heading: 'TODO: traduci' } },
}

export default messages
`
}

/**
 * Crea `<localesDir>/<code>.ts` con {@link appLocaleStub} (senza sovrascrivere).
 *
 * @param localesDir - cartella `locales` dell'app
 * @param code - codice della nuova lingua
 */
async function createAppLocaleStub(localesDir: string, code: string): Promise<LocaleFileResult> {
  await mkdir(localesDir, { recursive: true })
  const target = path.join(localesDir, `${code}.ts`)
  await writeFile(target, appLocaleStub(code), 'utf-8')
  return { file: target, status: 'created' }
}

/** Risultato di {@link addLocale}. */
export interface AddLocaleResult {
  app: LocaleFileResult
  features: LocaleFileResult[]
  packages: LocaleFileResult[]
  /** Package `@ilpachi/*` in node_modules con messaggi propri: non vengono modificati. */
  externalPackages: string[]
}

/**
 * Aggiunge una lingua al progetto: app (`src/i18n/locales`, con una bozza vuota se l'app non ha ancora
 * `en.ts`/`it.ts`), feature (`src/features/*\/locales`) e package workspace in `packages/*` che hanno
 * `src/locales` (solo le app con package propri: se manca la cartella il passo è saltato). I package in
 * node_modules (shell compresa) non vengono toccati.
 *
 * @param cwd - root del progetto
 * @param code - codice della nuova lingua
 */
export async function addLocale(cwd: string, code: string): Promise<AddLocaleResult> {
  validateLocaleCode(code)
  const appLocalesDir = path.join(cwd, 'src', 'i18n', 'locales')
  const app = (await createLocaleFile(appLocalesDir, code)) ?? (await createAppLocaleStub(appLocalesDir, code))

  const features: LocaleFileResult[] = []
  const featuresDir = path.join(cwd, 'src', 'features')
  if (existsSync(featuresDir)) {
    for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const result = await createLocaleFile(path.join(featuresDir, entry.name, 'locales'), code)
      if (result) features.push(result)
    }
  }

  const packages: LocaleFileResult[] = []
  const packagesDir = path.join(cwd, 'packages')
  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const result = await createLocaleFile(path.join(packagesDir, entry.name, 'src', 'locales'), code)
      if (result) packages.push(result)
    }
  }

  const externalPackages: string[] = []
  const scopeDir = path.join(cwd, 'node_modules', PACKAGE_SCOPE)
  if (existsSync(scopeDir)) {
    for (const entry of readdirSync(scopeDir, { withFileTypes: true })) {
      const inWorkspace = existsSync(path.join(packagesDir, entry.name, 'package.json'))
      if (!inWorkspace && existsSync(path.join(scopeDir, entry.name, 'src', 'locales'))) {
        externalPackages.push(`${PACKAGE_SCOPE}${entry.name}`)
      }
    }
  }

  return { app, features, packages, externalPackages }
}
