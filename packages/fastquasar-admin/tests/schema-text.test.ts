import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPachiAdminOptions, setPachiAdminOptions, isModelHidden } from '../src/helpers/options'
import { actionLabel, fieldLabel, fieldOptions, modelTitle, resolveText } from '../src/helpers/schema-text'
import { itemSchema } from './fixtures'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, pachiT: (k: string) => k }))

const tr = (map: Record<string, string>) => ({ te: (k: string) => k in map, t: (k: string) => map[k]! })

afterEach(() => resetPachiAdminOptions())

describe('schema-text', () => {
  it('translated key, otherwise backend text', () => {
    expect(resolveText('k', 'Fallback', tr({ k: 'Translated' }))).toBe('Translated')
    expect(resolveText('k', 'Fallback', tr({}))).toBe('Fallback')
    expect(resolveText(undefined, 'Fallback', tr({}))).toBe('Fallback')
  })

  it('titles, labels and options', () => {
    const r = tr({ 'admin.demo.item.title': 'Article', 'admin.demo.item.status.options.draft': 'Draft (translated)' })
    expect(modelTitle(itemSchema, r)).toBe('Article')
    expect(fieldOptions(itemSchema.fields.status!, r).map((o) => o.label)).toEqual(['Draft (translated)', 'Active'])
    expect(actionLabel({ name: 'x', label: 'L', labelKey: 'zz' }, r)).toBe('L')
    expect(fieldLabel('demo.item.name', { label: 'Name' }, r)).toBe('Name')
  })

  it('the `labels` options win (by key and by field)', () => {
    setPachiAdminOptions({ labels: { 'admin.demo.item.title': 'My title', 'demo.item.name': 'Custom name' } })
    expect(modelTitle(itemSchema, tr({ 'admin.demo.item.title': 'X' }))).toBe('My title')
    expect(fieldLabel('demo.item.name', { label: 'Name' }, tr({}))).toBe('Custom name')
  })

  it('hides models by list or predicate', () => {
    const m = { app: 'demo', model: 'file', title: 'F', permissions: { view: true, add: true, change: true, delete: true } }
    expect(isModelHidden(m)).toBe(false)
    setPachiAdminOptions({ hideModels: ['demo.file'] })
    expect(isModelHidden(m)).toBe(true)
    setPachiAdminOptions({ hideModels: (x) => x.app === 'other' })
    expect(isModelHidden(m)).toBe(false)
  })
})
