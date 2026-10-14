import { describe, expect, it, vi } from 'vitest'

const dict: Record<string, string> = {
  'settings.audit.title': 'Audit (tradotto)',
  'settings.a.label': 'Etichetta A',
  'settings.a.hint': 'Suggerimento',
  'settings.a.opt1': 'Opzione 1',
}

vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { te: (k: string) => k in dict } }),
  pachiT: (k: string) => dict[k],
}))

const { fieldProperties, resolveSchemaText, sectionTitle } = await import('../src/helpers/schema-text')

describe('resolveSchemaText', () => {
  it('traduce se la chiave esiste, altrimenti usa il fallback', () => {
    expect(resolveSchemaText('settings.audit.title', 'Audit')).toBe('Audit (tradotto)')
    expect(resolveSchemaText('settings.missing', 'Audit')).toBe('Audit')
    expect(resolveSchemaText(undefined, 'Audit')).toBe('Audit')
  })
})

describe('sectionTitle', () => {
  it('usa titleKey con fallback su title', () => {
    expect(sectionTitle({ title: 'Audit', titleKey: 'settings.audit.title', icon: null, route: null, fields: {} })).toBe('Audit (tradotto)')
    expect(sectionTitle({ title: 'Audit', icon: null, route: null, fields: {} })).toBe('Audit')
  })
})

describe('fieldProperties', () => {
  it('applica labelKey, propertyKeys e optionKeys senza modificare lo schema', () => {
    const field = {
      component: 'select',
      label: 'A',
      labelKey: 'settings.a.label',
      propertyKeys: { hint: 'settings.a.hint', placeholder: 'settings.nope' },
      optionKeys: { '1': 'settings.a.opt1' },
      properties: { placeholder: 'Scrivi', options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }] },
    }
    const props = fieldProperties(field)
    expect(props.label).toBe('Etichetta A')
    expect(props.hint).toBe('Suggerimento')
    expect(props.placeholder).toBe('Scrivi')
    expect(props.options).toEqual([{ value: 1, label: 'Opzione 1' }, { value: 2, label: 'Two' }])
    expect((field.properties.options as { label: string }[])[0]?.label).toBe('One')
  })
})
