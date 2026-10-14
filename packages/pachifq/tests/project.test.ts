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

describe('slugify / nome progetto', () => {
  it('produce slug validi', () => {
    expect(slugify('  My Cool App! ')).toBe('my-cool-app')
    expect(slugify('Città__Nuova')).toBe('citt-nuova')
    expect(slugify('---')).toBe('')
  })

  it('packageNameFromProject valida lo slug', () => {
    expect(packageNameFromProject('My App')).toBe('my-app')
    expect(() => packageNameFromProject('!!!')).toThrow(ProjectNameError)
  })

  it('rifiuta percorsi', () => {
    for (const bad of ['..', '.', '../x', 'a/b', 'a\\b', '/abs']) {
      expect(() => assertPlainProjectName(bad)).toThrow(ProjectNameError)
    }
    expect(() => assertPlainProjectName('my-app')).not.toThrow()
  })

  it('resolveTargetDir resta dentro cwd', () => {
    expect(resolveTargetDir('/work', 'my-app')).toBe('/work/my-app')
    expect(() => resolveTargetDir('/work', '..')).toThrow(ProjectNameError)
    expect(() => resolveTargetDir('/work', 'a/b')).toThrow(ProjectNameError)
  })
})

describe('buildPnpmWorkspace', () => {
  it('consente i build script, esclude @ilpachi dal release age e non ha packages/overrides', () => {
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
  it('default, npm e URL', () => {
    delete process.env.PACHI_NPM_REGISTRY
    expect(resolveRegistry()).toBeUndefined() // default: registry pubblico npm
    expect(resolveRegistry('npm')).toBeUndefined()
    expect(resolveRegistry(' https://r.example/npm/ ')).toBe('https://r.example/npm/')
  })

  it('usa PACHI_NPM_REGISTRY e rifiuta valori non URL', () => {
    process.env.PACHI_NPM_REGISTRY = 'https://env.example/'
    expect(resolveRegistry()).toBe('https://env.example/')
    process.env.PACHI_NPM_REGISTRY = 'npm'
    expect(resolveRegistry()).toBeUndefined()
    delete process.env.PACHI_NPM_REGISTRY
    expect(() => resolveRegistry('--evil')).toThrow(GenerateError)
  })
})

describe('mergeNpmrc', () => {
  it('crea, aggiorna e non scrive con registry pubblico', () => {
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
  it('quota solo quando serve', () => {
    expect(envValue('My App')).toBe('My App')
    expect(envValue('')).toBe('')
    expect(envValue('a # b')).toBe('"a # b"')
    expect(envValue('riga1\nriga2')).toBe('riga1 riga2')
    expect(envValue('say "hi"')).toBe("'say \"hi\"'")
    expect(envValue('cost $5')).toBe('"cost \\$5"')
  })

  it('scrive QCLI_PROXY_TARGET solo se impostato', () => {
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
  it('documenta tutte le variabili con il default in commento', () => {
    const example = buildEnvExample()
    expect(example).toContain('# QCLI_AUTH_ENABLED=true\n')
    expect(example).toContain('# QCLI_PROXY_TARGET=http://localhost:8000\n')
    expect(example).toContain('# QCLI_HTTP_ENVELOPE=true\n')
    expect(example).toContain('# QCLI_APP_LOCALE=\n')
    expect(example.split('\n').filter((l) => /^QCLI_/.test(l))).toEqual([])
  })
})

describe('parseArgv create', () => {
  it('legge opzioni e nome', () => {
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

  it('legge --link, --locale, --no-auto-dashboard e --with', () => {
    const r = parseCreate(['a', '--link', '../shell', '--locale=it', '--no-auto-dashboard', '--with', 'settings,profile,settings'])
    expect(r).toMatchObject({ link: '../shell', locale: 'it', autoDashboard: false, extras: ['settings', 'profile'] })
    expect(() => parseCreate(['--with', 'foo'])).toThrow(/sconosciuto/)
  })

  it('--ref e --template non esistono più', () => {
    expect(() => parseCreate(['--ref', 'dev'])).toThrow(/non esiste più/)
    expect(() => parseCreate(['--template=x'])).toThrow(/non esiste più/)
  })

  it('segnala errori chiari', () => {
    expect(() => parseCreate(['--link', '--yes'])).toThrow(ArgvError)
    expect(() => parseCreate(['--link'])).toThrow(/richiede un valore/)
    expect(() => parseCreate(['--bogus'])).toThrow(/sconosciuta/)
    expect(() => parseCreate(['a', 'b'])).toThrow(/inatteso/)
  })
})

describe('parseArgv new feature', () => {
  it('legge opzioni', () => {
    const r = parseFeature(['invoices', '--title', 'Fatture', '--order', '10', '--icon=mdiX', '--yes'])
    expect(r).toMatchObject({ name: 'invoices', title: 'Fatture', order: 10, icon: 'mdiX', yes: true })
  })

  it('--title --yes non consuma --yes', () => {
    expect(() => parseFeature(['a', '--title', '--yes'])).toThrow(/--title richiede un valore/)
  })

  it('--order non numerico è un errore', () => {
    expect(() => parseFeature(['a', '--order', 'abc'])).toThrow(/--order/)
    expect(() => parseFeature(['a', '--order'])).toThrow(ArgvError)
  })

  it('permette valori che iniziano con "-" con la forma =', () => {
    expect(parseFeature(['a', '--title=-x']).title).toBe('-x')
  })
})

describe('errorMessagesHint', () => {
  it('indica il comando di export dei messaggi del backend', () => {
    const text = errorMessagesHint().join('\n')
    expect(text).toContain('pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes')
    expect(text).toContain('--check')
    expect(text).toContain('fallback')
  })
})

describe('assertPachiProject (riconoscimento dipendenze)', () => {
  /** Crea una cartella con il solo `package.json` indicato. */
  function projectWith(deps: Record<string, string>): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-ctx-'))
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps }))
    return dir
  }

  it.each([['@ilpachi/pachifastquasar'], ['@ilpachi/use-alova'], ['@ilpachi/httpachi'], ['@ilpachi/pachi-i18n']])('riconosce %s', (name) => {
    const dir = projectWith({ [name]: '^1.0.0' })
    try {
      expect(assertPachiProject(dir).cwd).toBe(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('la sola dipendenza quasar non basta', () => {
    const dir = projectWith({ quasar: '^2.0.0' })
    try {
      expect(() => assertPachiProject(dir)).toThrow(NotAPachiProjectError)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
