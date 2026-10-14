import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPachiAdminOptions, setPachiAdminOptions, isModelHidden } from '../src/helpers/options'
import { actionLabel, fieldLabel, fieldOptions, modelTitle, resolveText } from '../src/helpers/schema-text'
import { itemSchema } from './fixtures'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, pachiT: (k: string) => k }))

const tr = (map: Record<string, string>) => ({ te: (k: string) => k in map, t: (k: string) => map[k]! })

afterEach(() => resetPachiAdminOptions())

describe('schema-text', () => {
  it('chiave tradotta, altrimenti testo del backend', () => {
    expect(resolveText('k', 'Fallback', tr({ k: 'Tradotto' }))).toBe('Tradotto')
    expect(resolveText('k', 'Fallback', tr({}))).toBe('Fallback')
    expect(resolveText(undefined, 'Fallback', tr({}))).toBe('Fallback')
  })

  it('titoli, etichette e opzioni', () => {
    const r = tr({ 'admin.demo.item.title': 'Articolo', 'admin.demo.item.status.options.draft': 'Bozza' })
    expect(modelTitle(itemSchema, r)).toBe('Articolo')
    expect(fieldOptions(itemSchema.fields.status!, r).map((o) => o.label)).toEqual(['Bozza', 'Active'])
    expect(actionLabel({ name: 'x', label: 'L', labelKey: 'zz' }, r)).toBe('L')
    expect(fieldLabel('demo.item.name', { label: 'Name' }, r)).toBe('Name')
  })

  it('le opzioni `labels` vincono (per chiave e per campo)', () => {
    setPachiAdminOptions({ labels: { 'admin.demo.item.title': 'Mio titolo', 'demo.item.name': 'Nome' } })
    expect(modelTitle(itemSchema, tr({ 'admin.demo.item.title': 'X' }))).toBe('Mio titolo')
    expect(fieldLabel('demo.item.name', { label: 'Name' }, tr({}))).toBe('Nome')
  })

  it('nasconde modelli per elenco o predicato', () => {
    const m = { app: 'demo', model: 'file', title: 'F', permissions: { view: true, add: true, change: true, delete: true } }
    expect(isModelHidden(m)).toBe(false)
    setPachiAdminOptions({ hideModels: ['demo.file'] })
    expect(isModelHidden(m)).toBe(true)
    setPachiAdminOptions({ hideModels: (x) => x.app === 'other' })
    expect(isModelHidden(m)).toBe(false)
  })
})
