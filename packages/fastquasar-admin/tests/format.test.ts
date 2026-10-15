import { afterEach, describe, expect, it, vi } from 'vitest'
import { alignFor, compactJson, EMPTY_TEXT, formatCell, formatValue, parseDateOnly } from '../src/helpers/format'
import { resetPachiAdminOptions, setPachiAdminOptions } from '../src/helpers/options'
import { itemSchema } from './fixtures'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, pachiT: (k: string) => k }))

const none = { te: () => false, t: (k: string) => k }

afterEach(() => resetPachiAdminOptions())

describe('format', () => {
  it('alignment from the type', () => {
    expect(alignFor(itemSchema.fields.price!)).toBe('right')
    expect(alignFor(itemSchema.fields.active!)).toBe('center')
    expect(alignFor(itemSchema.fields.name!)).toBe('left')
  })

  it('missing values', () => {
    expect(formatValue(null, itemSchema.fields.name!, 'it')).toBe(EMPTY_TEXT)
  })

  it('localized numbers, Decimal string unchanged', () => {
    expect(formatValue(1234.5, itemSchema.fields.price!, 'en')).toBe('1,234.5')
    expect(formatValue('1.50', itemSchema.fields.price!, 'it')).toBe('1.50')
  })

  it('date: the date alone does not shift with the timezone', () => {
    const d = parseDateOnly('2026-10-05')!
    expect(d.getDate()).toBe(5)
    expect(formatValue('2026-10-05', { component: 'date', type: 'date', label: 'd' }, 'en')).toContain('5')
  })

  it('datetime and time', () => {
    expect(formatValue('2026-10-05T15:42:38Z', itemSchema.fields.when!, 'en')).toContain('2026')
    expect(formatValue('10:30:00.123', { component: 'time', type: 'time', label: 't' }, 'en')).toBe('10:30:00')
  })

  it('compact and truncated json', () => {
    expect(compactJson({ a: 1 })).toBe('{"a":1}')
    expect(compactJson({ a: 'x'.repeat(200) }).length).toBe(80)
    expect(formatValue({ a: [1] }, itemSchema.fields.meta!, 'it')).toBe('{"a":[1]}')
  })

  it('select: option label (translated with optionKeys)', () => {
    expect(formatValue('active', itemSchema.fields.status!, 'it', none)).toBe('Active')
    const tr = { te: (k: string) => k.endsWith('options.draft'), t: () => 'Draft (translated)' }
    expect(formatValue('draft', itemSchema.fields.status!, 'it', tr)).toBe('Draft (translated)')
  })

  it('per-field formatter wins over the per-type one', () => {
    setPachiAdminOptions({
      formatters: {
        integer: ({ defaultText }) => `#${defaultText}`,
        'demo.item.price': ({ value }) => `EUR ${String(value)}`,
      },
    })
    expect(formatCell(itemSchema, 'price', { price: 3 }, 'it', none)).toBe('EUR 3')
    expect(formatCell(itemSchema, 'qty', { qty: 3 }, 'it', none)).toBe('#3')
  })
})
