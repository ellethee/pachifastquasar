import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  generateFeature,
  GenerateFeatureError,
  msg,
  tsString,
  validateChildren,
  validateFeatureName,
  validateIcon,
  validateTitle,
} from '../src/generate-feature.js'

describe('validateFeatureName', () => {
  it('accetta kebab-case', () => {
    expect(() => validateFeatureName('invoices')).not.toThrow()
    expect(() => validateFeatureName('time-tracking')).not.toThrow()
    expect(() => validateFeatureName('a1-b2')).not.toThrow()
  })

  it.each(['', 'Invoices', 'my_feature', '-a', 'a-', 'a--b', '1abc', 'a b', '../x'])('rifiuta "%s"', (name) => {
    expect(() => validateFeatureName(name)).toThrow(GenerateFeatureError)
  })

  it('rifiuta i nomi riservati', () => {
    expect(() => validateFeatureName('auth')).toThrow(/riservato/)
    expect(() => validateFeatureName('login')).toThrow(/riservato/)
  })
})

describe('validateChildren', () => {
  it('rifiuta duplicati e chiavi i18n riservate', () => {
    expect(() => validateChildren(['billing', 'reports'])).not.toThrow()
    expect(() => validateChildren(['billing', 'billing'])).toThrow(/duplicata/)
    expect(() => validateChildren(['title'])).toThrow(/non ammesso/)
    expect(() => validateChildren(['placeholder-title'])).toThrow(/non ammesso/)
    expect(() => validateChildren(['Bad'])).toThrow(GenerateFeatureError)
  })
})

describe('validateIcon / validateTitle', () => {
  it('valida identificatori mdi', () => {
    expect(() => validateIcon('mdiFileDocumentOutline')).not.toThrow()
    expect(() => validateIcon('mdi123')).toThrow()
    expect(() => validateIcon('foo')).toThrow()
    expect(() => validateIcon("mdiX } from 'evil'; //")).toThrow()
  })

  it('rifiuta il titolo vuoto', () => {
    expect(() => validateTitle('  ')).toThrow()
    expect(() => validateTitle('Fatture')).not.toThrow()
  })
})

describe('tsString / msg', () => {
  it('fa escape di apici, backslash e newline', () => {
    expect(tsString("l'app")).toBe("'l\\'app'")
    expect(tsString('a\\b')).toBe("'a\\\\b'")
    expect(tsString('a\nb\r')).toBe("'a\\nb\\r'")
    expect(tsString('a b')).toBe("'a\\u2028b'")
  })

  it('il risultato è letterale TS valido', () => {
    const value = "x'y\\z\n {}"
    expect(new Function(`return ${tsString(value)}`)()).toBe(value)
  })

  it('msg rende letterali i caratteri speciali di vue-i18n', () => {
    expect(msg('a@b|c')).toBe("'a{\\'@\\'}b{\\'|\\'}c'")
  })
})

describe('generateFeature', () => {
  it('importa i componenti di stato dal pacchetto della shell, non da src/core', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-test-'))
    try {
      const result = await generateFeature({ featuresDir: dir, name: 'clients', title: 'Clienti', description: '' })
      const page = readFileSync(path.join(result.featureDir, 'pages', 'ClientsIndexPage.vue'), 'utf-8')
      expect(page).toContain("import { PachiEmptyState, PachiErrorState, PachiLoadingState } from '@ilpachi/pachifastquasar'")
      expect(page).not.toContain('src/core')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('genera service con use-alova e rotte con titleKey', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-test-'))
    try {
      const result = await generateFeature({
        featuresDir: dir,
        name: 'invoices',
        title: 'Fatture\nnuove',
        description: 'Gestione',
        children: ['billing'],
      })
      const read = (rel: string): string => readFileSync(path.join(result.featureDir, rel), 'utf-8')
      expect(read('services/invoices-api.ts')).toContain("getUseAlovaInstance()({ url: '/api/invoices' }).alova")
      expect(read('services/invoices-api.ts')).toContain("from '@ilpachi/use-alova'")
      expect(read('services/invoices-api.ts')).not.toContain('httpachi')
      expect(read('services/invoices-api.ts')).not.toContain('createAlova')
      const routes = read('routes.ts')
      expect(routes).toContain("titleKey: 'invoices.title'")
      expect(routes).toContain("titleKey: 'invoices.billing.title'")
      expect(routes).toContain("title: 'Fatture\\nnuove'")
      expect(read('locales/it.ts')).toContain('description:')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
