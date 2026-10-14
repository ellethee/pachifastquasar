import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No network: the `npm view` check is simulated (the packages appear as published).
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
    description: "The test app's description",
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

/** Fake shell folder (with a `use-alova` sibling) for `--link`. */
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
  it('renderTemplate replaces the placeholders and rejects unknown ones', () => {
    expect(renderTemplate('a {{x}} b {{ y }}', { x: '1', y: '2' })).toBe('a 1 b 2')
    expect(() => renderTemplate('{{zzz}}', {})).toThrow(/zzz/)
  })

  it('the embedded templates contain the playground model files', async () => {
    const files = await listTemplateFiles(appTemplateDir())
    for (const f of ['quasar.config.ts', 'index.html', 'postcss.config.js', 'tsconfig.json', '_gitignore', 'src/App.vue', 'src/pachi-config.ts', 'src/boot/pachi.ts', 'src/router/index.ts', 'src/stores/index.ts', 'src/css/app.scss', 'src/css/quasar.variables.scss', 'src/env.d.ts', 'public/favicon.svg', 'public/favicon.ico', 'public/apple-touch-icon.png']) {
      expect(files).toContain(f)
    }
  })
})

describe('generateProject', () => {
  it('generates the app files with the placeholders replaced', async () => {
    const o = options({ proxyTarget: "https://b.example.com", locale: 'it', autoDashboard: false, authEnabled: false })
    await expect(generateProject(o)).resolves.toEqual({ installDeps: false })
    const dir = o.targetDir

    for (const f of ['package.json', 'pnpm-workspace.yaml', '.npmrc', '.gitignore', 'quasar.config.ts', 'index.html', 'src/.env', 'src/.env.example', 'src/App.vue', 'src/pachi-config.ts', 'src/boot/pachi.ts', 'src/router/index.ts', 'src/stores/index.ts', 'src/features/.gitkeep', 'src/i18n/generated/.gitkeep', 'README.md']) {
      expect(existsSync(path.join(dir, f)), f).toBe(true)
    }
    expect(existsSync(path.join(dir, '_gitignore'))).toBe(false)
    // the favicon binary files are copied byte by byte
    for (const f of ['favicon.ico', 'favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png']) {
      expect(readFileSync(path.join(dir, 'public', f)).equals(readFileSync(path.join(appTemplateDir(), 'public', f))), f).toBe(true)
    }
    expect(read(dir, 'index.html')).toContain('rel="apple-touch-icon"')
    expect(existsSync(path.join(dir, 'packages'))).toBe(false)

    const html = read(dir, 'index.html')
    expect(html).toContain('<html lang="it">')
    expect(html).toContain('<%= productName %>') // Quasar EJS untouched
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

    // no placeholder left in the generated files
    for (const f of ['index.html', 'quasar.config.ts', 'README.md']) expect(read(dir, f)).not.toMatch(/\{\{\s*\w+\s*\}\}/)

    const pkg = JSON.parse(read(dir, 'package.json')) as { name: string; private: boolean; dependencies: Record<string, string> }
    expect(pkg).toMatchObject({ name: 'my-app', private: true, productName: 'My App', description: "The test app's description" })
    expect(pkg.dependencies['@ilpachi/pachifastquasar']).toBe('^0.1.0')
    expect(pkg.dependencies['@ilpachi/use-alova']).toBe('^2.1.1')
    expect(pkg.dependencies['@ilpachi/httpachi']).toBeUndefined()
    expect(pkg.dependencies['@ilpachi/pachi-i18n']).toBe('^0.1.0')
    expect(pkg.dependencies['@ilpachi/fastquasar-settings']).toBeUndefined()
  })

  it('--no-envelope: QCLI_HTTP_ENVELOPE=false in .env, commented line in .env.example, comment in pachi-config', async () => {
    const o = options({ envelope: false })
    await generateProject(o)
    expect(read(o.targetDir, 'src/.env')).toMatch(/^QCLI_HTTP_ENVELOPE=false$/m)
    expect(read(o.targetDir, 'src/.env.example')).toContain('# QCLI_HTTP_ENVELOPE=true')
    expect(read(o.targetDir, 'src/pachi-config.ts')).toContain('// http: { envelope: false }')
    const base = options({ targetDir: path.join(tmp, 'other') })
    await generateProject(base)
    expect(read(base.targetDir, 'src/.env')).not.toContain('QCLI_HTTP_ENVELOPE')
  })

  it('without proxy or language quasar.config has no options and the HTML language is it', async () => {
    const o = options()
    await generateProject(o)
    expect(read(o.targetDir, 'quasar.config.ts')).toContain('definePachiQuasarConfig({})')
    expect(read(o.targetDir, 'index.html')).toContain('<html lang="it">')
    const env = read(o.targetDir, 'src/.env')
    expect(env).not.toMatch(/^QCLI_(PROXY_TARGET|AUTH_ENABLED|APP_LOCALE|APP_AUTO_DASHBOARD)=/m)
    expect(env).toMatch(/^QCLI_APP_TITLE=My App$/m)
    expect(read(o.targetDir, 'src/.env.example')).not.toMatch(/^QCLI_/m)
  })

  it('the boot has no conditional blocks without packages that require them', async () => {
    const o = options({ extras: ['settings', 'widgets'] })
    await generateProject(o)
    const boot = read(o.targetDir, 'src/boot/pachi.ts')
    expect(boot).not.toMatch(/\{\{|setPachiProfileUser/)
    expect(boot).toContain("import { pachiConfig } from 'src/pachi-config'")
    expect(boot.trimEnd().endsWith('})\n})')).toBe(true)
  })

  it('with profile the boot sets the user source of AuthManager', async () => {
    const o = options({ extras: ['profile'] })
    await generateProject(o)
    const boot = read(o.targetDir, 'src/boot/pachi.ts')
    expect(boot).toContain("import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'")
    expect(boot).toContain("import { composePachiMessages, createPachiApp, AuthManager } from '@ilpachi/pachifastquasar'")
    expect(boot).toContain('setPachiProfileUser(() => {')
    expect(boot).toContain('AuthManager.getInstance().userInfo')
    expect(boot).not.toMatch(/\{\{/)
  })

  it('--with adds the optional packages with the versions from the registry', async () => {
    const o = options({ extras: ['settings', 'profile', 'widgets'] })
    await generateProject(o)
    const deps = (JSON.parse(read(o.targetDir, 'package.json')) as { dependencies: Record<string, string> }).dependencies
    expect(deps['@ilpachi/fastquasar-settings']).toMatch(/^\^\d/)
    expect(deps['@ilpachi/fastquasar-profile']).toMatch(/^\^\d/)
    expect(deps['@ilpachi/fastquasar-dashboard-widgets']).toMatch(/^\^\d/)
  })

  it('--link writes link: for the shell and for the sibling packages present, without checking the shell on the registry', async () => {
    const shell = fakeShell()
    const o = options({ linkDir: shell })
    await generateProject(o)
    const deps = (JSON.parse(read(o.targetDir, 'package.json')) as { dependencies: Record<string, string> }).dependencies
    expect(deps['@ilpachi/pachifastquasar']).toBe('link:../libs/pachifastquasar')
    expect(deps['@ilpachi/use-alova']).toBe('link:../libs/use-alova')
    expect(deps['@ilpachi/pachi-i18n']).toBe('^0.1.0') // no sibling folder: stays on the registry
    const config = read(o.targetDir, 'quasar.config.ts')
    expect(config).toContain('const SINGLETONS')
    expect(config).toContain('`./../node_modules/${name}`')
    const checked = vi.mocked(isPublishedOnRegistry).mock.calls.map((c) => c[0])
    expect(checked).toEqual(['@ilpachi/pachi-i18n'])
  })

  it('--link rejects folders that are not the shell', async () => {
    const dir = path.join(tmp, 'other')
    mkdirSync(dir)
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'other' }))
    await expect(generateProject(options({ linkDir: dir }))).rejects.toThrow(GenerateError)
    await expect(generateProject(options({ linkDir: path.join(tmp, 'does-not-exist') }))).rejects.toThrow(/--link/)
    expect(existsSync(path.join(tmp, 'my-app'))).toBe(false)
  })

  it('without --registry (default) it generates no .npmrc and does not pass it to npm view', async () => {
    delete process.env.PACHI_NPM_REGISTRY
    const o = options()
    delete o.registry
    await generateProject(o)
    expect(existsSync(path.join(o.targetDir, '.npmrc'))).toBe(false)
    expect(vi.mocked(isPublishedOnRegistry).mock.calls.every((c) => c[2] === undefined)).toBe(true)
  })

  it('--registry npm is equivalent to the default: no .npmrc', async () => {
    const o = options({ registry: 'npm' })
    await generateProject(o)
    expect(existsSync(path.join(o.targetDir, '.npmrc'))).toBe(false)
  })

  it('--registry with a URL writes the scope .npmrc and checks on that registry', async () => {
    const o = options({ registry: 'https://mirror.example/npm' })
    await generateProject(o)
    expect(read(o.targetDir, '.npmrc')).toBe('@ilpachi:registry=https://mirror.example/npm/\n')
    expect(vi.mocked(isPublishedOnRegistry).mock.calls.every((c) => c[2] === 'https://mirror.example/npm')).toBe(true)
  })

  it('--dry-run lists files and package.json without writing anything', async () => {
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

  it('--dry-run still rejects a non-empty folder', async () => {
    mkdirSync(path.join(tmp, 'my-app'))
    writeFileSync(path.join(tmp, 'my-app', 'x'), '')
    await expect(generateProject(options({ dryRun: true }))).rejects.toThrow(/is not empty/)
  })

  it('the generated files contain no internal references', async () => {
    const o = options({ registry: 'npm' })
    await generateProject(o)
    for (const f of ['package.json', 'README.md', 'quasar.config.ts', 'src/pachi-config.ts', 'src/boot/pachi.ts', '.gitignore']) {
      expect(read(o.targetDir, f), f).not.toMatch(new RegExp(['\\.intern' + 'al', 'git' + 'ea', '/da' + 'ti/'].join('|'), 'i'))
    }
  })

  it('skips pnpm install if a package is not published', async () => {
    vi.mocked(isPublishedOnRegistry).mockResolvedValue(false)
    await expect(generateProject(options({ installDeps: true }))).resolves.toEqual({ installDeps: false })
  })

  it('rejects an invalid language and a non-empty folder', async () => {
    await expect(generateProject(options({ locale: 'xx_YY' }))).rejects.toThrow(/Invalid language code/)
    mkdirSync(path.join(tmp, 'my-app'))
    writeFileSync(path.join(tmp, 'my-app', 'x'), '')
    await expect(generateProject(options())).rejects.toThrow(/is not empty/)
  })
})

describe('buildPresetOptions / buildAppPackageJson', () => {
  it('quotes the proxy as a TypeScript literal', () => {
    expect(buildPresetOptions('')).toBe('')
    expect(buildPresetOptions("http://a/b'c")).toContain("'http://a/b\\'c'")
  })

  it('the @ilpachi packages are sorted and the shell is present', () => {
    const pkg = buildAppPackageJson({ packageName: 'x', productName: 'X', description: '', author: '', extras: ['profile'], targetDir: '/t' })
    const names = Object.keys(pkg.dependencies as Record<string, string>)
    expect(names.filter((n) => n.startsWith('@ilpachi/'))).toEqual(['@ilpachi/fastquasar-profile', '@ilpachi/pachi-i18n', '@ilpachi/pachifastquasar', '@ilpachi/use-alova'])
  })
})

describe('addLocale on a generated app', () => {
  it('creates an empty draft if the app has no en.ts/it.ts and does not write to node_modules', async () => {
    const o = options()
    await generateProject(o)
    mkdirSync(path.join(o.targetDir, 'src', 'features', 'inv', 'locales'), { recursive: true })
    writeFileSync(path.join(o.targetDir, 'src', 'features', 'inv', 'locales', 'en.ts'), "const en = { title: 'x' }\nexport default en\n")
    const result = await addLocale(o.targetDir, 'fr')
    expect(result.app.status).toBe('created')
    expect(read(o.targetDir, 'src/i18n/locales/fr.ts')).toContain('TODO: translate')
    expect(result.features).toHaveLength(1)
    expect(read(o.targetDir, 'src/features/inv/locales/fr.ts')).toContain('const messages')
    expect(result.packages).toEqual([])
  })
})
