import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Nessuna rete: la verifica `npm view` è simulata (i package risultano pubblicati).
vi.mock('../src/helper/workspace-packages.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/helper/workspace-packages.js')>()),
  isPublishedOnRegistry: vi.fn(async () => true),
}))

import { buildPresetOptions, generateProject, GenerateError, type GenerateOptions } from '../src/generate-project.js'
import { isPublishedOnRegistry } from '../src/helper/workspace-packages.js'
import { renderTemplate, listTemplateFiles, appTemplateDir } from '../src/helper/template.js'
import { buildAppPackageJson } from '../src/helper/app-package.js'
import { addLocale } from '../src/helper/locales.js'

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'pachifq-test-'))
  vi.mocked(isPublishedOnRegistry).mockResolvedValue(true)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    targetDir: path.join(tmp, 'my-app'),
    packageName: 'my-app',
    productName: 'My App',
    description: "L'app di prova",
    author: 'Tester',
    authEnabled: true,
    authMenu: { profile: true, settings: true, home: true },
    proxyTarget: '',
    locale: '',
    autoDashboard: true,
    envelope: true,
    extras: [],
    gitInit: false,
    installDeps: false,
    registry: 'https://r.example/npm/',
    ...overrides,
  }
}

/** Finta cartella della shell (con una sorella `use-alova`) per `--link`. */
function fakeShell(): string {
  const shell = path.join(tmp, 'libs', 'pachifastquasar')
  mkdirSync(shell, { recursive: true })
  writeFileSync(path.join(shell, 'package.json'), JSON.stringify({ name: '@ilpachi/pachifastquasar', version: '1.0.0' }))
  mkdirSync(path.join(tmp, 'libs', 'use-alova'))
  writeFileSync(path.join(tmp, 'libs', 'use-alova', 'package.json'), JSON.stringify({ name: '@ilpachi/use-alova' }))
  return shell
}

const read = (...parts: string[]): string => readFileSync(path.join(...parts), 'utf-8')

describe('template', () => {
  it('renderTemplate sostituisce i segnaposto e rifiuta quelli ignoti', () => {
    expect(renderTemplate('a {{x}} b {{ y }}', { x: '1', y: '2' })).toBe('a 1 b 2')
    expect(() => renderTemplate('{{zzz}}', {})).toThrow(/zzz/)
  })

  it('i template embedded contengono i file del modello playground', async () => {
    const files = await listTemplateFiles(appTemplateDir())
    for (const f of ['quasar.config.ts', 'index.html', 'postcss.config.js', 'tsconfig.json', '_gitignore', 'src/App.vue', 'src/pachi-config.ts', 'src/boot/pachi.ts', 'src/router/index.ts', 'src/stores/index.ts', 'src/css/app.scss', 'src/css/quasar.variables.scss', 'src/env.d.ts', 'public/favicon.svg', 'public/favicon.ico', 'public/apple-touch-icon.png']) {
      expect(files).toContain(f)
    }
  })
})

describe('generateProject', () => {
  it('genera i file dell\'app con i segnaposto sostituiti', async () => {
    const o = options({ proxyTarget: "https://b.example.com", locale: 'it', autoDashboard: false, authEnabled: false })
    await expect(generateProject(o)).resolves.toEqual({ installDeps: false })
    const dir = o.targetDir

    for (const f of ['package.json', 'pnpm-workspace.yaml', '.npmrc', '.gitignore', 'quasar.config.ts', 'index.html', 'src/.env', 'src/.env.example', 'src/App.vue', 'src/pachi-config.ts', 'src/boot/pachi.ts', 'src/router/index.ts', 'src/stores/index.ts', 'src/features/.gitkeep', 'src/i18n/generated/.gitkeep', 'README.md']) {
      expect(existsSync(path.join(dir, f)), f).toBe(true)
    }
    expect(existsSync(path.join(dir, '_gitignore'))).toBe(false)
    // i file binari del favicon sono copiati byte per byte
    for (const f of ['favicon.ico', 'favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png']) {
      expect(readFileSync(path.join(dir, 'public', f)).equals(readFileSync(path.join(appTemplateDir(), 'public', f))), f).toBe(true)
    }
    expect(read(dir, 'index.html')).toContain('rel="apple-touch-icon"')
    expect(existsSync(path.join(dir, 'packages'))).toBe(false)

    const html = read(dir, 'index.html')
    expect(html).toContain('<html lang="it">')
    expect(html).toContain('<%= productName %>') // EJS di Quasar intatto
    expect(read(dir, 'README.md')).toContain('# My App')
    expect(read(dir, 'quasar.config.ts')).toContain("definePachiQuasarConfig({}, { proxyTarget: process.env.QCLI_PROXY_TARGET ?? 'https://b.example.com' })")
    expect(read(dir, 'src/.env')).toContain('QCLI_AUTH_ENABLED=false')
    expect(read(dir, 'src/.env')).toContain('QCLI_APP_LOCALE=it')
    expect(read(dir, 'src/.env')).toContain('QCLI_PROXY_TARGET=https://b.example.com')
    expect(read(dir, 'src/.env.example')).toContain('# QCLI_AUTH_ENABLED=true')
    expect(read(dir, 'src/.env')).toContain('QCLI_APP_AUTO_DASHBOARD=false')
    expect(read(dir, '.npmrc')).toBe('@ilpachi:registry=https://r.example/npm/\n')
    expect(read(dir, '.npmrc')).not.toMatch(/token/i)
    expect(read(dir, 'pnpm-workspace.yaml')).toContain("minimumReleaseAgeExclude:\n  - '@ilpachi/*'")

    // nessun segnaposto rimasto nei file generati
    for (const f of ['index.html', 'quasar.config.ts', 'README.md']) expect(read(dir, f)).not.toMatch(/\{\{\s*\w+\s*\}\}/)

    const pkg = JSON.parse(read(dir, 'package.json')) as { name: string; private: boolean; dependencies: Record<string, string> }
    expect(pkg).toMatchObject({ name: 'my-app', private: true, productName: 'My App', description: "L'app di prova" })
    expect(pkg.dependencies['@ilpachi/pachifastquasar']).toBe('^0.1.0')
    expect(pkg.dependencies['@ilpachi/use-alova']).toBe('^2.1.1')
    expect(pkg.dependencies['@ilpachi/httpachi']).toBeUndefined()
    expect(pkg.dependencies['@ilpachi/pachi-i18n']).toBe('^0.1.0')
    expect(pkg.dependencies['@ilpachi/fastquasar-settings']).toBeUndefined()
  })

  it('--no-envelope: QCLI_HTTP_ENVELOPE=false in .env, riga commentata in .env.example, commento in pachi-config', async () => {
    const o = options({ envelope: false })
    await generateProject(o)
    expect(read(o.targetDir, 'src/.env')).toMatch(/^QCLI_HTTP_ENVELOPE=false$/m)
    expect(read(o.targetDir, 'src/.env.example')).toContain('# QCLI_HTTP_ENVELOPE=true')
    expect(read(o.targetDir, 'src/pachi-config.ts')).toContain('// http: { envelope: false }')
    const base = options({ targetDir: path.join(tmp, 'altra') })
    await generateProject(base)
    expect(read(base.targetDir, 'src/.env')).not.toContain('QCLI_HTTP_ENVELOPE')
  })

  it('senza proxy né lingua il quasar.config non ha opzioni e la lingua HTML è it', async () => {
    const o = options()
    await generateProject(o)
    expect(read(o.targetDir, 'quasar.config.ts')).toContain('definePachiQuasarConfig({})')
    expect(read(o.targetDir, 'index.html')).toContain('<html lang="it">')
    const env = read(o.targetDir, 'src/.env')
    expect(env).not.toMatch(/^QCLI_(PROXY_TARGET|AUTH_ENABLED|APP_LOCALE|APP_AUTO_DASHBOARD)=/m)
    expect(env).toMatch(/^QCLI_APP_TITLE=My App$/m)
    expect(read(o.targetDir, 'src/.env.example')).not.toMatch(/^QCLI_/m)
  })

  it('il boot non ha blocchi condizionali senza package che li richiedono', async () => {
    const o = options({ extras: ['settings', 'widgets'] })
    await generateProject(o)
    const boot = read(o.targetDir, 'src/boot/pachi.ts')
    expect(boot).not.toMatch(/\{\{|setPachiProfileUser/)
    expect(boot).toContain("import { pachiConfig } from 'src/pachi-config'")
    expect(boot.trimEnd().endsWith('})\n})')).toBe(true)
  })

  it('con profile il boot imposta la sorgente utente dell\'AuthManager', async () => {
    const o = options({ extras: ['profile'] })
    await generateProject(o)
    const boot = read(o.targetDir, 'src/boot/pachi.ts')
    expect(boot).toContain("import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'")
    expect(boot).toContain("import { composePachiMessages, createPachiApp, AuthManager } from '@ilpachi/pachifastquasar'")
    expect(boot).toContain('setPachiProfileUser(() => {')
    expect(boot).toContain('AuthManager.getInstance().userInfo')
    expect(boot).not.toMatch(/\{\{/)
  })

  it('--with aggiunge i package opzionali con le versioni dal registry', async () => {
    const o = options({ extras: ['settings', 'profile', 'widgets'] })
    await generateProject(o)
    const deps = (JSON.parse(read(o.targetDir, 'package.json')) as { dependencies: Record<string, string> }).dependencies
    expect(deps['@ilpachi/fastquasar-settings']).toMatch(/^\^\d/)
    expect(deps['@ilpachi/fastquasar-profile']).toMatch(/^\^\d/)
    expect(deps['@ilpachi/fastquasar-dashboard-widgets']).toMatch(/^\^\d/)
  })

  it('--link scrive link: per la shell e per le sorelle presenti, senza verificare la shell sul registry', async () => {
    const shell = fakeShell()
    const o = options({ linkDir: shell })
    await generateProject(o)
    const deps = (JSON.parse(read(o.targetDir, 'package.json')) as { dependencies: Record<string, string> }).dependencies
    expect(deps['@ilpachi/pachifastquasar']).toBe('link:../libs/pachifastquasar')
    expect(deps['@ilpachi/use-alova']).toBe('link:../libs/use-alova')
    expect(deps['@ilpachi/pachi-i18n']).toBe('^0.1.0') // nessuna cartella sorella: resta dal registry
    const config = read(o.targetDir, 'quasar.config.ts')
    expect(config).toContain('const SINGLETONS')
    expect(config).toContain('`./../node_modules/${name}`')
    const checked = vi.mocked(isPublishedOnRegistry).mock.calls.map((c) => c[0])
    expect(checked).toEqual(['@ilpachi/pachi-i18n'])
  })

  it('--link rifiuta cartelle che non sono la shell', async () => {
    const dir = path.join(tmp, 'altro')
    mkdirSync(dir)
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'altro' }))
    await expect(generateProject(options({ linkDir: dir }))).rejects.toThrow(GenerateError)
    await expect(generateProject(options({ linkDir: path.join(tmp, 'non-esiste') }))).rejects.toThrow(/--link/)
    expect(existsSync(path.join(tmp, 'my-app'))).toBe(false)
  })

  it('senza --registry (default) non genera .npmrc e non lo passa a npm view', async () => {
    delete process.env.PACHI_NPM_REGISTRY
    const o = options()
    delete o.registry
    await generateProject(o)
    expect(existsSync(path.join(o.targetDir, '.npmrc'))).toBe(false)
    expect(vi.mocked(isPublishedOnRegistry).mock.calls.every((c) => c[2] === undefined)).toBe(true)
  })

  it('--registry npm equivale al default: nessun .npmrc', async () => {
    const o = options({ registry: 'npm' })
    await generateProject(o)
    expect(existsSync(path.join(o.targetDir, '.npmrc'))).toBe(false)
  })

  it('--registry con URL scrive il .npmrc dello scope e verifica su quel registry', async () => {
    const o = options({ registry: 'https://mirror.example/npm' })
    await generateProject(o)
    expect(read(o.targetDir, '.npmrc')).toBe('@ilpachi:registry=https://mirror.example/npm/\n')
    expect(vi.mocked(isPublishedOnRegistry).mock.calls.every((c) => c[2] === 'https://mirror.example/npm')).toBe(true)
  })

  it('--dry-run elenca file e package.json senza scrivere nulla', async () => {
    const o = options({ dryRun: true, registry: 'https://mirror.example/npm/', installDeps: true, gitInit: true })
    const result = await generateProject(o)
    expect(existsSync(o.targetDir)).toBe(false)
    expect(result.installDeps).toBe(false)
    expect(result.files).toEqual(expect.arrayContaining(['.gitignore', '.npmrc', 'package.json', 'pnpm-workspace.yaml', 'src/.env', 'src/.env.example', 'README.md', 'public/favicon.ico']))
    expect(result.files).not.toContain('_gitignore')
    expect(result.packageJson).toMatchObject({ name: 'my-app', private: true })
    expect(isPublishedOnRegistry).not.toHaveBeenCalled()
    const noNpmrc = await generateProject({ ...o, registry: 'npm' })
    expect(noNpmrc.files).not.toContain('.npmrc')
  })

  it('--dry-run rifiuta comunque una cartella non vuota', async () => {
    mkdirSync(path.join(tmp, 'my-app'))
    writeFileSync(path.join(tmp, 'my-app', 'x'), '')
    await expect(generateProject(options({ dryRun: true }))).rejects.toThrow(/non è vuota/)
  })

  it('i file generati non contengono riferimenti interni', async () => {
    const o = options({ registry: 'npm' })
    await generateProject(o)
    for (const f of ['package.json', 'README.md', 'quasar.config.ts', 'src/pachi-config.ts', 'src/boot/pachi.ts', '.gitignore']) {
      expect(read(o.targetDir, f), f).not.toMatch(new RegExp(['\\.intern' + 'al', 'git' + 'ea', '/da' + 'ti/'].join('|'), 'i'))
    }
  })

  it('salta pnpm install se un package non è pubblicato', async () => {
    vi.mocked(isPublishedOnRegistry).mockResolvedValue(false)
    await expect(generateProject(options({ installDeps: true }))).resolves.toEqual({ installDeps: false })
  })

  it('rifiuta lingua non valida e cartella non vuota', async () => {
    await expect(generateProject(options({ locale: 'xx_YY' }))).rejects.toThrow(/Codice lingua/)
    mkdirSync(path.join(tmp, 'my-app'))
    writeFileSync(path.join(tmp, 'my-app', 'x'), '')
    await expect(generateProject(options())).rejects.toThrow(/non è vuota/)
  })
})

describe('buildPresetOptions / buildAppPackageJson', () => {
  it('quota il proxy come letterale TypeScript', () => {
    expect(buildPresetOptions('')).toBe('')
    expect(buildPresetOptions("http://a/b'c")).toContain("'http://a/b\\'c'")
  })

  it('i package @ilpachi sono ordinati e la shell è presente', () => {
    const pkg = buildAppPackageJson({ packageName: 'x', productName: 'X', description: '', author: '', extras: ['profile'], targetDir: '/t' })
    const names = Object.keys(pkg.dependencies as Record<string, string>)
    expect(names.filter((n) => n.startsWith('@ilpachi/'))).toEqual(['@ilpachi/fastquasar-profile', '@ilpachi/pachi-i18n', '@ilpachi/pachifastquasar', '@ilpachi/use-alova'])
  })
})

describe('addLocale su un\'app generata', () => {
  it('crea una bozza vuota se l\'app non ha en.ts/it.ts e non scrive in node_modules', async () => {
    const o = options()
    await generateProject(o)
    mkdirSync(path.join(o.targetDir, 'src', 'features', 'inv', 'locales'), { recursive: true })
    writeFileSync(path.join(o.targetDir, 'src', 'features', 'inv', 'locales', 'en.ts'), "const en = { title: 'x' }\nexport default en\n")
    const result = await addLocale(o.targetDir, 'fr')
    expect(result.app.status).toBe('created')
    expect(read(o.targetDir, 'src/i18n/locales/fr.ts')).toContain('TODO: traduci')
    expect(result.features).toHaveLength(1)
    expect(read(o.targetDir, 'src/features/inv/locales/fr.ts')).toContain('const messages')
    expect(result.packages).toEqual([])
  })
})
