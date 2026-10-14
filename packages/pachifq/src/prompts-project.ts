import { execFileSync } from 'node:child_process'
import * as clack from '@clack/prompts'
import type { AuthMenuOptions, GenerateOptions } from './generate-project.js'
import { OPTIONAL_PACKAGES, type OptionalPackageKey } from './helper/app-package.js'
import { LocaleError, validateLocaleCode } from './helper/locales.js'
import { humanize, packageNameError, slugify } from './helper/project-name.js'

/**
 * Validates the backend URL for the proxy.
 *
 * @param value - entered text (empty = not set)
 * @returns the error message, or `undefined` if valid
 */
export function proxyUrlError(value: string): string | undefined {
  if (!value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Use an http(s) URL'
  } catch {
    return 'Invalid URL (e.g. https://api.example.com)'
  }
}

/**
 * Validates the fixed language code.
 *
 * @param value - entered text (empty = automatic language)
 * @returns the error message, or `undefined` if valid
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
  clack.cancel('Scaffolding cancelled.')
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
      message: 'Project name (also used as the folder name)',
      placeholder: 'my-app',
      validate: (value) => (value && value.trim() ? undefined : 'The name cannot be empty'),
    })
    if (clack.isCancel(result)) exitCancelled()
    projectName = result
  }

  const packageNameResult = await clack.text({
    message: 'Package name (package.json#name)',
    initialValue: slugify(projectName),
    validate: (value) => packageNameError(value ?? ''),
  })
  if (clack.isCancel(packageNameResult)) exitCancelled()
  const packageName = packageNameResult

  const productNameResult = await clack.text({
    message: 'Product name (shown in the app)',
    initialValue: humanize(projectName),
  })
  if (clack.isCancel(productNameResult)) exitCancelled()
  const productName = productNameResult

  const descriptionResult = await clack.text({
    message: 'Description',
    initialValue: '',
  })
  if (clack.isCancel(descriptionResult)) exitCancelled()
  const description = descriptionResult

  const authorResult = await clack.text({
    message: 'Author',
    initialValue: gitDefaultAuthor(),
  })
  if (clack.isCancel(authorResult)) exitCancelled()
  const author = authorResult

  const authEnabledResult = await clack.confirm({
    message: 'Enable the authentication layer?',
    initialValue: true,
  })
  if (clack.isCancel(authEnabledResult)) exitCancelled()
  const authEnabled = authEnabledResult

  let authMenu: AuthMenuOptions = { profile: true, settings: true, home: true }
  if (authEnabled) {
    const useDefaultsResult = await clack.confirm({
      message: 'Use the defaults for the auth submenus (profile/settings/home all visible)?',
      initialValue: true,
    })
    if (clack.isCancel(useDefaultsResult)) exitCancelled()
    if (!useDefaultsResult) {
      const profileResult = await clack.confirm({ message: 'Show the "Profile" menu entry?', initialValue: true })
      if (clack.isCancel(profileResult)) exitCancelled()
      const settingsResult = await clack.confirm({ message: 'Show the "Settings" menu entry?', initialValue: true })
      if (clack.isCancel(settingsResult)) exitCancelled()
      const homeResult = await clack.confirm({ message: 'Show the "Home" menu entry?', initialValue: true })
      if (clack.isCancel(homeResult)) exitCancelled()
      authMenu = { profile: profileResult, settings: settingsResult, home: homeResult }
    }
  }

  let locale: string
  if (defaults.locale !== undefined) {
    locale = defaults.locale
  } else {
    const localeResult = await clack.text({
      message: 'Fixed app language (QCLI_APP_LOCALE, e.g. it; empty = automatic with language selector)',
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
      message: 'Optional @ilpachi packages (space to select, enter to confirm)',
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
        message: 'Does the backend use the response envelope (success/message/data)? No = PACHIFAST_ENVELOPE_ENABLED=false',
        initialValue: true,
      })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  const proxyTargetResult = await clack.text({
    message: 'Backend URL for the dev proxy, written as QCLI_PROXY_TARGET in .env (empty = http://localhost:8000)',
    placeholder: 'https://api.example.com',
    initialValue: '',
    validate: (value) => proxyUrlError(value ?? ''),
  })
  if (clack.isCancel(proxyTargetResult)) exitCancelled()
  const proxyTarget = proxyTargetResult.trim()

  const gitInitResult =
    defaults.gitInit ??
    (await (async () => {
      const result = await clack.confirm({ message: 'Initialize a new git repo?', initialValue: true })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  const installDepsResult =
    defaults.installDeps ??
    (await (async () => {
      const result = await clack.confirm({ message: 'Run "pnpm install" at the end?', initialValue: true })
      if (clack.isCancel(result)) exitCancelled()
      return result
    })())

  clack.outro('Configuration complete, starting scaffolding…')

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
