import { execFileSync } from 'node:child_process'
import * as clack from '@clack/prompts'
import type { AuthMenuOptions, GenerateOptions } from './generate-project.js'
import { OPTIONAL_PACKAGES, type OptionalPackageKey } from './helper/app-package.js'
import { LocaleError, validateLocaleCode } from './helper/locales.js'
import { humanize, packageNameError, slugify } from './helper/project-name.js'

/**
 * Valida l'URL del backend per il proxy.
 *
 * @param value - testo inserito (vuoto = non impostato)
 * @returns il messaggio d'errore, oppure `undefined` se valido
 */
export function proxyUrlError(value: string): string | undefined {
  if (!value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Usa un URL http(s)'
  } catch {
    return 'URL non valido (es. https://api.example.com)'
  }
}

/**
 * Valida il codice lingua fissa.
 *
 * @param value - testo inserito (vuoto = lingua automatica)
 * @returns il messaggio d'errore, oppure `undefined` se valido
 */
export function localeCodeError(value: string): string | undefined {
  if (!value.trim()) return undefined
  try {
    validateLocaleCode(value.trim())
    return undefined
  } catch (error) {
    return error instanceof LocaleError ? error.message : String(error)
  }
}

export type PromptResult = Omit<GenerateOptions, 'targetDir'> & { projectName: string }

function gitDefaultAuthor(): string {
  try {
    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf-8' }).trim()
    const email = execFileSync('git', ['config', 'user.email'], { encoding: 'utf-8' }).trim()
    if (name && email) return `${name} <${email}>`
    return name || ''
  } catch {
    return ''
  }
}

function exitCancelled(): never {
  clack.cancel('Scaffold annullato.')
  process.exit(0)
}

export interface PromptDefaults {
  projectName?: string
  locale?: string
  autoDashboard?: boolean
  envelope?: boolean
  extras?: readonly OptionalPackageKey[]
  installDeps?: boolean
  gitInit?: boolean
}

export async function runPrompts(defaults: PromptDefaults = {}): Promise<PromptResult> {
  clack.intro('pachifq')

  let projectName: string
  if (defaults.projectName) {
    projectName = defaults.projectName
  } else {
    const result = await clack.text({
      message: 'Nome del progetto (userà anche il nome della cartella)',
      placeholder: 'my-app',
      validate: (value) => (value && value.trim() ? undefined : 'Il nome non può essere vuoto'),
    })
    if (clack.isCancel(result)) exitCancelled()
    projectName = result
  }

  const packageNameResult = await clack.text({
    message: 'Nome del pacchetto (package.json#name)',
    initialValue: slugify(projectName),
    validate: (value) => packageNameError(value ?? ''),
  })
  if (clack.isCancel(packageNameResult)) exitCancelled()
  const packageName = packageNameResult

  const productNameResult = await clack.text({
    message: 'Nome prodotto (visualizzato nell\'app)',
    initialValue: humanize(projectName),
  })
  if (clack.isCancel(productNameResult)) exitCancelled()
  const productName = productNameResult

  const descriptionResult = await clack.text({
    message: 'Descrizione',
    initialValue: '',
  })
  if (clack.isCancel(descriptionResult)) exitCancelled()
  const description = descriptionResult

  const authorResult = await clack.text({
    message: 'Autore',
    initialValue: gitDefaultAuthor(),
  })
  if (clack.isCancel(authorResult)) exitCancelled()
  const author = authorResult

  const authEnabledResult = await clack.confirm({
    message: 'Abilitare il layer di autenticazione?',
    initialValue: true,
  })
  if (clack.isCancel(authEnabledResult)) exitCancelled()
  const authEnabled = authEnabledResult

  let authMenu: AuthMenuOptions = { profile: true, settings: true, home: true }
  if (authEnabled) {
    const useDefaultsResult = await clack.confirm({
      message: 'Usare i default per i sottomenu auth (profilo/impostazioni/home tutti visibili)?',
      initialValue: true,
    })
    if (clack.isCancel(useDefaultsResult)) exitCancelled()
    if (!useDefaultsResult) {
      const profileResult = await clack.confirm({ message: 'Mostrare voce menu "Profilo"?', initialValue: true })
      if (clack.isCancel(profileResult)) exitCancelled()
      const settingsResult = await clack.confirm({ message: 'Mostrare voce menu "Impostazioni"?', initialValue: true })
      if (clack.isCancel(settingsResult)) exitCancelled()
      const homeResult = await clack.confirm({ message: 'Mostrare voce menu "Home"?', initialValue: true })
      if (clack.isCancel(homeResult)) exitCancelled()
      authMenu = { profile: profileResult, settings: settingsResult, home: homeResult }
    }
  }

  let locale: string
  if (defaults.locale !== undefined) {
    locale = defaults.locale
  } else {
    const localeResult = await clack.text({
      message: 'Lingua fissa dell\'app (QCLI_APP_LOCALE, es. it; vuoto = automatica con selettore lingua)',
      placeholder: 'it',
      initialValue: '',
      validate: (value) => localeCodeError(value ?? ''),
    })
    if (clack.isCancel(localeResult)) exitCancelled()
    locale = localeResult.trim()
  }

  let extras: readonly OptionalPackageKey[]
  if (defaults.extras !== undefined) {
    extras = defaults.extras
  } else {
    const extrasResult = await clack.multiselect<OptionalPackageKey>({
      message: 'Package @ilpachi opzionali (spazio per selezionare, invio per confermare)',
      options: (Object.keys(OPTIONAL_PACKAGES) as OptionalPackageKey[]).map((key) => ({
        value: key,
        label: OPTIONAL_PACKAGES[key].name,
        hint: OPTIONAL_PACKAGES[key].label,
      })),
      required: false,
    })
    if (clack.isCancel(extrasResult)) exitCancelled()
    extras = extrasResult
  }

  const envelope =
    defaults.envelope ??
    (await (async () => {
      const result = await clack.confirm({
        message: 'Il backend usa l\'envelope delle risposte (success/message/data)? No = PACHIFAST_ENVELOPE_ENABLED=false',
        initialValue: true,
      })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  const proxyTargetResult = await clack.text({
    message: 'URL backend per il proxy dev, scritto come QCLI_PROXY_TARGET in .env (vuoto = http://localhost:8000)',
    placeholder: 'https://api.example.com',
    initialValue: '',
    validate: (value) => proxyUrlError(value ?? ''),
  })
  if (clack.isCancel(proxyTargetResult)) exitCancelled()
  const proxyTarget = proxyTargetResult.trim()

  const gitInitResult =
    defaults.gitInit ??
    (await (async () => {
      const result = await clack.confirm({ message: 'Inizializzare un nuovo repo git?', initialValue: true })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  const installDepsResult =
    defaults.installDeps ??
    (await (async () => {
      const result = await clack.confirm({ message: 'Eseguire "pnpm install" al termine?', initialValue: true })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  clack.outro('Configurazione completata, avvio scaffold…')

  return {
    projectName,
    packageName,
    productName,
    description,
    author,
    authEnabled,
    authMenu,
    proxyTarget,
    locale,
    autoDashboard: defaults.autoDashboard ?? true,
    envelope,
    extras,
    gitInit: gitInitResult,
    installDeps: installDepsResult,
  }
}
