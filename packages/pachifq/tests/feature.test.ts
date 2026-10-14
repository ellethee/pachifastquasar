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
  it('accepts kebab-case', () => {
    expect(() => validateFeatureName('invoices')).not.toThrow()
    expect(() => validateFeatureName('time-tracking')).not.toThrow()
    expect(() => validateFeatureName('a1-b2')).not.toThrow()
  })

  it.each(['', 'Invoices', 'my_feature', '-a', 'a-', 'a--b', '1abc', 'a b', '../x'])('rejects "%s"', (name) => {
    expect(() => validateFeatureName(name)).toThrow(GenerateFeatureError)
  })

  it('rejects reserved names', () => {
    expect(() => validateFeatureName('auth')).toThrow(/Reserved/)
    expect(() => validateFeatureName('login')).toThrow(/Reserved/)
  })
})

describe('validateChildren', () => {
  it('rejects duplicates and reserved i18n keys', () => {
    expect(() => validateChildren(['billing', 'reports'])).not.toThrow()
    expect(() => validateChildren(['billing', 'billing'])).toThrow(/Duplicate/)
    expect(() => validateChildren(['title'])).toThrow(/not allowed/)
    expect(() => validateChildren(['placeholder-title'])).toThrow(/not allowed/)
    expect(() => validateChildren(['Bad'])).toThrow(GenerateFeatureError)
  })
})

describe('validateIcon / validateTitle', () => {
  it('validates mdi identifiers', () => {
    expect(() => validateIcon('mdiFileDocumentOutline')).not.toThrow()
    expect(() => validateIcon('mdi123')).toThrow()
    expect(() => validateIcon('foo')).toThrow()
    expect(() => validateIcon("mdiX } from 'evil'; //")).toThrow()
  })

  it('rejects an empty title', () => {
    expect(() => validateTitle('  ')).toThrow()
    expect(() => validateTitle('Invoices')).not.toThrow()
  })
})

describe('tsString / msg', () => {
  it('escapes quotes, backslashes and newlines', () => {
    expect(tsString("l'app")).toBe("'l\\'app'")
    expect(tsString('a\\b')).toBe("'a\\\\b'")
    expect(tsString('a\nb\r')).toBe("'a\\nb\\r'")
    expect(tsString('a b')).toBe("'a\\u2028b'")
  })

  it('the result is a valid TS literal', () => {
    const value = "x'y\\z\n {}"
    expect(new Function(`return ${tsString(value)}`)()).toBe(value)
  })

  it('msg makes vue-i18n special characters literal', () => {
    expect(msg('a@b|c')).toBe("'a{\\'@\\'}b{\\'|\\'}c'")
  })
})

describe('generateFeature', () => {
  it('imports the state components from the shell package, not from src/core', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-test-'))
    try {
      const result = await generateFeature({ featuresDir: dir, name: 'clients', title: 'Clients', description: '' })
      const page = readFileSync(path.join(result.featureDir, 'pages', 'ClientsIndexPage.vue'), 'utf-8')
      expect(page).toContain("import { PachiEmptyState, PachiErrorState, PachiLoadingState } from '@ilpachi/pachifastquasar'")
      expect(page).not.toContain('src/core')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('generates a service with use-alova and routes with titleKey', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-test-'))
    try {
      const result = await generateFeature({
        featuresDir: dir,
        name: 'invoices',
        title: 'Invoices\nnew',
        description: 'Management',
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
      expect(routes).toContain("title: 'Invoices\\nnew'")
      expect(read('locales/it.ts')).toContain('description:')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
