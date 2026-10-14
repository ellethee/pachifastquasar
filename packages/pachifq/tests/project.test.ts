import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertPachiProject, NotAPachiProjectError } from '../src/project-context.js'
import { ArgvError } from '../src/helper/argv.js'
import { buildEnvContent, buildEnvExample, resolveRegistry, GenerateError } from '../src/generate-project.js'
import { envValue } from '../src/helper/env-file.js'
import { mergeNpmrc } from '../src/helper/npmrc.js'
import { buildPnpmWorkspace } from '../src/helper/pnpm-workspace.js'
import {
  assertPlainProjectName,
  packageNameFromProject,
  ProjectNameError,
  resolveTargetDir,
  slugify,
} from '../src/helper/project-name.js'
import { parseArgv as parseCreate, errorMessagesHint } from '../src/commands/create.js'
import { parseArgv as parseFeature } from '../src/commands/new/feature.js'

describe('slugify / project name', () => {
  it('produces valid slugs', () => {
    expect(slugify('  My Cool App! ')).toBe('my-cool-app')
    expect(slugify('Café__New')).toBe('caf-new')
    expect(slugify('---')).toBe('')
  })

  it('packageNameFromProject validates the slug', () => {
    expect(packageNameFromProject('My App')).toBe('my-app')
    expect(() => packageNameFromProject('!!!')).toThrow(ProjectNameError)
  })

  it('rejects paths', () => {
    for (const bad of ['..', '.', '../x', 'a/b', 'a\\b', '/abs']) {
      expect(() => assertPlainProjectName(bad)).toThrow(ProjectNameError)
    }
    expect(() => assertPlainProjectName('my-app')).not.toThrow()
  })

  it('resolveTargetDir stays inside cwd', () => {
    expect(resolveTargetDir('/work', 'my-app')).toBe('/work/my-app')
    expect(() => resolveTargetDir('/work', '..')).toThrow(ProjectNameError)
    expect(() => resolveTargetDir('/work', 'a/b')).toThrow(ProjectNameError)
  })
})

describe('buildPnpmWorkspace', () => {
  it('allows build scripts, excludes @ilpachi from the release age and has no packages/overrides', () => {
    const out = buildPnpmWorkspace()
    expect(out).toContain('allowBuilds:')
    expect(out).toContain('esbuild: true')
    expect(out).toMatch(/minimumReleaseAgeExclude:\n {2}- '@ilpachi\/\*'\n$/)
    expect(out).not.toMatch(/^packages:/m)
    expect(out).not.toContain('overrides')
    expect(out).not.toContain('link:')
  })
})

describe('resolveRegistry', () => {
  it('default, npm and URL', () => {
    delete process.env.PACHI_NPM_REGISTRY
    expect(resolveRegistry()).toBeUndefined() // default: public npm registry
    expect(resolveRegistry('npm')).toBeUndefined()
    expect(resolveRegistry(' https://r.example/npm/ ')).toBe('https://r.example/npm/')
  })

  it('uses PACHI_NPM_REGISTRY and rejects non-URL values', () => {
    process.env.PACHI_NPM_REGISTRY = 'https://env.example/'
    expect(resolveRegistry()).toBe('https://env.example/')
    process.env.PACHI_NPM_REGISTRY = 'npm'
    expect(resolveRegistry()).toBeUndefined()
    delete process.env.PACHI_NPM_REGISTRY
    expect(() => resolveRegistry('--evil')).toThrow(GenerateError)
  })
})

describe('mergeNpmrc', () => {
  it('creates, updates and does not write with the public registry', () => {
    expect(mergeNpmrc(undefined, 'https://r/')).toEqual({ content: '@ilpachi:registry=https://r/\n', action: 'created' })
    expect(mergeNpmrc(undefined, undefined)).toEqual({ content: null, action: 'none' })
    expect(mergeNpmrc('a=b\n@ilpachi:registry=old\n', 'https://r')).toEqual({
      content: 'a=b\n@ilpachi:registry=https://r/\n',
      action: 'updated',
    })
    expect(mergeNpmrc('@ilpachi:registry=old\n', undefined)).toEqual({ content: null, action: 'removed' })
    expect(mergeNpmrc('a=b\n', undefined)).toEqual({ content: 'a=b\n', action: 'none' })
  })
})

describe('envValue / buildEnvContent', () => {
  it('quotes only when needed', () => {
    expect(envValue('My App')).toBe('My App')
    expect(envValue('')).toBe('')
    expect(envValue('a # b')).toBe('"a # b"')
    expect(envValue('line1\nline2')).toBe('line1 line2')
    expect(envValue('say "hi"')).toBe("'say \"hi\"'")
    expect(envValue('cost $5')).toBe('"cost \\$5"')
  })

  it('writes QCLI_PROXY_TARGET only if set', () => {
    const base = {
      targetDir: '/x',
      packageName: 'x',
      productName: 'X # app',
      description: 'a\nb',
      author: '',
      authEnabled: true,
      authMenu: { profile: true, settings: true, home: true },
      locale: '',
      autoDashboard: true,
      envelope: true,
      extras: [],
      gitInit: false,
      installDeps: false,
    }
    const withProxy = buildEnvContent({ ...base, proxyTarget: 'https://b.example.com' })
    expect(withProxy).toContain('QCLI_PROXY_TARGET=https://b.example.com\n')
    expect(withProxy).toContain('QCLI_APP_TITLE="X # app"\n')
    expect(withProxy).toContain('QCLI_APP_DESCRIPTION=a b\n')
    const none = buildEnvContent({ ...base, proxyTarget: '', description: '' })
    expect(none).not.toContain('QCLI_PROXY_TARGET')
    expect(none).not.toContain('QCLI_AUTH_ENABLED')
    expect(none).not.toContain('QCLI_APP_LOCALE')
    expect(none).not.toContain('QCLI_APP_AUTO_DASHBOARD')
    expect(none).not.toContain('QCLI_HTTP_ENVELOPE')
    expect(buildEnvContent({ ...base, proxyTarget: '', envelope: false })).toContain('QCLI_HTTP_ENVELOPE=false\n')
    expect(none).not.toContain('QCLI_APP_SHOW_LOGO')
    const fixed = buildEnvContent({ ...base, proxyTarget: '', locale: 'it', autoDashboard: false, authEnabled: false })
    expect(fixed).toContain('QCLI_APP_LOCALE=it\n')
    expect(fixed).toContain('QCLI_APP_AUTO_DASHBOARD=false\n')
    expect(fixed).toContain('QCLI_AUTH_ENABLED=false\n')
  })
})

describe('buildEnvExample', () => {
  it('documents all the variables with the default in a comment', () => {
    const example = buildEnvExample()
    expect(example).toContain('# QCLI_AUTH_ENABLED=true\n')
    expect(example).toContain('# QCLI_PROXY_TARGET=http://localhost:8000\n')
    expect(example).toContain('# QCLI_HTTP_ENVELOPE=true\n')
    expect(example).toContain('# QCLI_APP_LOCALE=\n')
    expect(example.split('\n').filter((l) => /^QCLI_/.test(l))).toEqual([])
  })
})

describe('parseArgv create', () => {
  it('reads options and name', () => {
    const r = parseCreate(['my-app', '--registry=npm', '--yes', '--no-git'])
    expect(r).toMatchObject({ projectName: 'my-app', registry: 'npm', yes: true, git: false, install: true, autoDashboard: true, envelope: true, extras: [] })
  })

  it('--dry-run', () => {
    expect(parseCreate(['a'])).toMatchObject({ dryRun: false })
    expect(parseCreate(['a', '--dry-run'])).toMatchObject({ dryRun: true })
  })

  it('--no-envelope', () => {
    expect(parseCreate(['a', '--no-envelope'])).toMatchObject({ envelope: false })
  })

  it('reads --link, --locale, --no-auto-dashboard and --with', () => {
    const r = parseCreate(['a', '--link', '../shell', '--locale=it', '--no-auto-dashboard', '--with', 'settings,profile,settings'])
    expect(r).toMatchObject({ link: '../shell', locale: 'it', autoDashboard: false, extras: ['settings', 'profile'] })
    expect(() => parseCreate(['--with', 'foo'])).toThrow(/Unknown/)
  })

  it('--ref and --template no longer exist', () => {
    expect(() => parseCreate(['--ref', 'dev'])).toThrow(/no longer exists/)
    expect(() => parseCreate(['--template=x'])).toThrow(/no longer exists/)
  })

  it('reports clear errors', () => {
    expect(() => parseCreate(['--link', '--yes'])).toThrow(ArgvError)
    expect(() => parseCreate(['--link'])).toThrow(/requires a value/)
    expect(() => parseCreate(['--bogus'])).toThrow(/Unknown/)
    expect(() => parseCreate(['a', 'b'])).toThrow(/Unexpected/)
  })
})

describe('parseArgv new feature', () => {
  it('reads options', () => {
    const r = parseFeature(['invoices', '--title', 'Invoices', '--order', '10', '--icon=mdiX', '--yes'])
    expect(r).toMatchObject({ name: 'invoices', title: 'Invoices', order: 10, icon: 'mdiX', yes: true })
  })

  it('--title --yes does not consume --yes', () => {
    expect(() => parseFeature(['a', '--title', '--yes'])).toThrow(/--title option requires a value/)
  })

  it('non-numeric --order is an error', () => {
    expect(() => parseFeature(['a', '--order', 'abc'])).toThrow(/--order/)
    expect(() => parseFeature(['a', '--order'])).toThrow(ArgvError)
  })

  it('allows values that start with "-" with the = form', () => {
    expect(parseFeature(['a', '--title=-x']).title).toBe('-x')
  })
})

describe('errorMessagesHint', () => {
  it('shows the backend messages export command', () => {
    const text = errorMessagesHint().join('\n')
    expect(text).toContain('pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes')
    expect(text).toContain('--check')
    expect(text).toContain('fallback')
  })
})

describe('assertPachiProject (dependency detection)', () => {
  /** Creates a folder with only the given `package.json`. */
  function projectWith(deps: Record<string, string>): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-ctx-'))
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps }))
    return dir
  }

  it.each([['@ilpachi/pachifastquasar'], ['@ilpachi/use-alova'], ['@ilpachi/httpachi'], ['@ilpachi/pachi-i18n']])('recognizes %s', (name) => {
    const dir = projectWith({ [name]: '^1.0.0' })
    try {
      expect(assertPachiProject(dir).cwd).toBe(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the quasar dependency alone is not enough', () => {
    const dir = projectWith({ quasar: '^2.0.0' })
    try {
      expect(() => assertPachiProject(dir)).toThrow(NotAPachiProjectError)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
