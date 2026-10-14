import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { GenerateFeatureError, generateFeature, validateIcon } from '../src/generate-feature.js'
import { loadMdiIconNames, parseMdiExports, suggestIcons } from '../src/helper/mdi-icons.js'

const SOURCE = `/* MDI */
export const mdiApi = 'M0 0'
export const mdiLan = 'M1 1'
export const mdiLanCheck = 'M2 2'
export const mdiLanConnect = 'M3 3'
export const mdiWebSync = 'M4 4'
export const mdiFileDocumentOutline = 'M5 5'
`

const KNOWN = new Set(parseMdiExports(SOURCE))

describe('parseMdiExports', () => {
  it('estrae i nomi degli export', () => {
    expect([...KNOWN]).toEqual(['mdiApi', 'mdiLan', 'mdiLanCheck', 'mdiLanConnect', 'mdiWebSync', 'mdiFileDocumentOutline'])
  })
})

describe('validateIcon con elenco reale', () => {
  it('accetta un export esistente', () => {
    expect(() => validateIcon('mdiLan', KNOWN)).not.toThrow()
  })

  it('rifiuta mdiLanApi con suggerimenti', () => {
    expect(() => validateIcon('mdiLanApi', KNOWN)).toThrow(GenerateFeatureError)
    expect(() => validateIcon('mdiLanApi', KNOWN)).toThrow(/inesistente.*mdiLanApi.*Forse intendevi:.*mdiLan/)
  })

  it('senza elenco resta solo sintattica', () => {
    expect(() => validateIcon('mdiLanApi', null)).not.toThrow()
    expect(() => validateIcon('foo', null)).toThrow()
  })
})

describe('suggestIcons', () => {
  it('limita a 5 e ordina per somiglianza', () => {
    const many = Array.from({ length: 20 }, (_, i) => `mdiLan${i}`)
    expect(suggestIcons('mdiLanX', many)).toHaveLength(5)
    expect(suggestIcons('mdiLanApi', KNOWN)).toContain('mdiLan')
  })

  it('nessun suggerimento se nulla è simile', () => {
    expect(suggestIcons('mdiZzzzzzzzzzz', KNOWN)).toEqual([])
  })
})

describe('loadMdiIconNames / generateFeature', () => {
  it('risolve il pacchetto dall\'app e blocca la generazione se l\'icona non esiste', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pachifq-mdi-'))
    try {
      const pkgDir = path.join(dir, 'node_modules', '@quasar', 'extras')
      mkdirSync(path.join(pkgDir, 'exports', 'mdi-v7'), { recursive: true })
      writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name: '@quasar/extras', version: '0.0.0', type: 'module', exports: { './mdi-v7': { default: './exports/mdi-v7/index.js' } } }),
      )
      writeFileSync(path.join(pkgDir, 'exports', 'mdi-v7', 'index.js'), SOURCE)
      writeFileSync(path.join(dir, 'package.json'), '{}')

      const names = loadMdiIconNames(dir)
      expect(names?.has('mdiLan')).toBe(true)

      const featuresDir = path.join(dir, 'src', 'features')
      await expect(
        generateFeature({ featuresDir, name: 'api', title: 'Api', description: '', icon: 'mdiLanApi', iconNames: names }),
      ).rejects.toThrow(/inesistente/)
      const ok = await generateFeature({ featuresDir, name: 'api', title: 'Api', description: '', icon: 'mdiLan', iconNames: names })
      expect(ok.files.length).toBeGreaterThan(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
