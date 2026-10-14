import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PACKAGE_SCOPE } from './workspace-packages.js'

/** Allowed language code: simplified BCP 47 (`fr`, `pt-BR`, `zh-Hans`). */
const LOCALE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/** Language validation/generation error. */
export class LocaleError extends Error {}

/**
 * Checks that the language code is valid.
 *
 * @param code - code (e.g. `fr`, `pt-BR`)
 */
export function validateLocaleCode(code: string): void {
  if (!LOCALE_CODE_RE.test(code)) {
    throw new LocaleError(`Invalid language code: "${code}". Examples: fr, de, pt-BR.`)
  }
}

/**
 * Lists the language codes (file name without extension) of a `locales` folder.
 *
 * @param localesDir - folder with the `<code>.ts` files
 */
export function listLocaleCodes(localesDir: string): string[] {
  if (!existsSync(localesDir)) return []
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ts$/.test(entry.name) && !/^index\.ts$/.test(entry.name))
    .map((entry) => entry.name.replace(/\.ts$/, ''))
    .sort()
}

/**
 * Turns a source language file (`en.ts`) into a draft for a new language: same keys,
 * values to translate, TODO comment.
 *
 * @param source - contents of the source file
 * @param code - code of the new language
 */
export function toLocaleDraft(source: string, code: string): string {
  const todo = `/** "${code}" messages. TODO: translate the values (the keys must stay identical to it.ts). */`
  const body = source
    .replace(/\/\*\*[\s\S]*?\*\//, todo)
    .replace(/\bconst en\b/, 'const messages')
    .replace(/export default en\b/, 'export default messages')
  return body.includes('TODO: translate') ? body : `${todo}\n${body}`
}

/** Result of creating a language file. */
export interface LocaleFileResult {
  /** Absolute path of the file. */
  file: string
  /** `created` if written, `exists` if already present (not overwritten). */
  status: 'created' | 'exists'
}

/**
 * Creates `<localesDir>/<code>.ts` starting from `en.ts` (or `it.ts`) in the same folder, without overwriting.
 * Returns `undefined` if the folder has no source to start from.
 *
 * @param localesDir - `locales` folder
 * @param code - code of the new language
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
 * Minimal draft of the app language when neither `en.ts` nor `it.ts` exists yet: the shell messages
 * (namespaces `app`, `auth`, `menu`, `dashboard`, `errors`, `common`) live in the package and fall back to `en`;
 * the app only adds here what it wants to translate or redefine.
 *
 * @param code - code of the new language
 */
export function appLocaleStub(code: string): string {
  return `/**
 * App "${code}" messages. TODO: translate.
 * They are layered over those of @ilpachi/pachifastquasar (namespaces \`app\`, \`auth\`, \`menu\`, \`dashboard\`,
 * \`errors\`, \`common\`): redefine here the keys you want to translate, the others fall back to "en".
 */
const messages = {
  // auth: { login: { heading: 'TODO: translate' } },
}

export default messages
`
}

/**
 * Creates `<localesDir>/<code>.ts` with {@link appLocaleStub} (without overwriting).
 *
 * @param localesDir - app `locales` folder
 * @param code - code of the new language
 */
async function createAppLocaleStub(localesDir: string, code: string): Promise<LocaleFileResult> {
  await mkdir(localesDir, { recursive: true })
  const target = path.join(localesDir, `${code}.ts`)
  await writeFile(target, appLocaleStub(code), 'utf-8')
  return { file: target, status: 'created' }
}

/** Result of {@link addLocale}. */
export interface AddLocaleResult {
  app: LocaleFileResult
  features: LocaleFileResult[]
  packages: LocaleFileResult[]
  /** `@ilpachi/*` packages in node_modules with their own messages: they are not modified. */
  externalPackages: string[]
}

/**
 * Adds a language to the project: app (`src/i18n/locales`, with an empty draft if the app has no
 * `en.ts`/`it.ts` yet), features (`src/features/*\/locales`) and workspace packages in `packages/*` that have
 * `src/locales` (only apps with their own packages: if the folder is missing the step is skipped). Packages in
 * node_modules (shell included) are not touched.
 *
 * @param cwd - project root
 * @param code - code of the new language
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
