import { describe, expect, it } from 'vitest'
import { buildPayload, formFieldNames, fromFormValue, initialFormValues, isoToLocalInput, localInputToIso, sameFormValue } from '../src/helpers/payload'
import { itemSchema } from './fixtures'

describe('payload', () => {
  it('in creazione mostra solo i campi scrivibili', () => {
    const names = formFieldNames(itemSchema, 'create')
    expect(names).not.toContain('id')
    expect(names).not.toContain('createdAt')
    expect(names).toContain('name')
    expect(formFieldNames(itemSchema, 'edit')).toContain('id')
  })

  it('i valori iniziali usano i default (creazione) o la riga (modifica)', () => {
    const create = initialFormValues(itemSchema)
    expect(create.status).toBe('draft')
    expect(create.active).toBe(true)
    expect(create.meta).toBe('')
    const edit = initialFormValues(itemSchema, { name: 'A', meta: { a: 1 }, active: false })
    expect(edit.name).toBe('A')
    expect(JSON.parse(edit.meta as string)).toEqual({ a: 1 })
    expect(edit.active).toBe(false)
  })

  it('creazione: segnala i required vuoti e omette i campi vuoti', () => {
    const values = initialFormValues(itemSchema)
    const res = buildPayload(itemSchema, values, 'create')
    expect(res.errors).toEqual({ name: 'required' })
    values.name = 'Pippo'
    values.price = '12.5'
    values.notes = ''
    const ok = buildPayload(itemSchema, values, 'create')
    expect(ok.errors).toEqual({})
    expect(ok.payload).toMatchObject({ name: 'Pippo', price: 12.5, status: 'draft', active: true, qty: 0 })
    expect(ok.payload).not.toHaveProperty('notes')
    expect(ok.payload).not.toHaveProperty('id')
    expect(ok.payload).not.toHaveProperty('createdAt')
  })

  it('modifica: PATCH solo con i campi cambiati, mai readonly/pk', () => {
    const row = { id: 3, name: 'A', status: 'draft', price: '1.50', qty: 2, active: true, notes: null, meta: null, when: null, owner: 4, createdAt: '2026-01-01T00:00:00Z' }
    const initial = initialFormValues(itemSchema, row)
    const values = { ...initial, name: 'B', price: '2.5', notes: '', createdAt: 'x', id: 99 }
    const res = buildPayload(itemSchema, values, 'edit', initial, row)
    expect(res.payload).toEqual({ name: 'B', price: '2.5' })
  })

  it('modifica: un campo nullable svuotato diventa null', () => {
    const row = { name: 'A', qty: 2, owner: 4 }
    const initial = initialFormValues(itemSchema, row)
    const res = buildPayload(itemSchema, { ...initial, qty: '', owner: null }, 'edit', initial, row)
    expect(res.payload).toEqual({ qty: null, owner: null })
  })

  it('json: valida e interpreta', () => {
    const f = itemSchema.fields.meta!
    expect(fromFormValue(f, '{"a":1}')).toEqual({ value: { a: 1 } })
    expect(fromFormValue(f, '{oops')).toEqual({ error: 'invalidJson' })
    expect(fromFormValue(f, '  ')).toEqual({ value: null })
  })

  it('numeri: errore se non validi, Decimal originale resta stringa', () => {
    const price = itemSchema.fields.price!
    expect(fromFormValue(price, 'abc')).toEqual({ error: 'invalidNumber' })
    expect(fromFormValue(price, '1,5')).toEqual({ value: 1.5 })
    expect(fromFormValue(price, '1.50', '1.00')).toEqual({ value: '1.50' })
    expect(fromFormValue(itemSchema.fields.qty!, '1.5')).toEqual({ error: 'invalidNumber' })
  })

  it('numeri: solo spazi = vuoto; interi oltre 2^53 restano stringa', () => {
    expect(fromFormValue(itemSchema.fields.price!, '   ')).toEqual({ value: null })
    expect(fromFormValue(itemSchema.fields.qty!, '  ')).toEqual({ value: null })
    expect(fromFormValue(itemSchema.fields.qty!, '9007199254740993')).toEqual({ value: '9007199254740993' })
    expect(fromFormValue(itemSchema.fields.qty!, '42')).toEqual({ value: 42 })
  })

  it('datetime: round trip locale/ISO', () => {
    const local = isoToLocalInput('2026-10-05T15:42:38.018687Z')
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(localInputToIso(local)).toMatch(/Z$/)
    expect(localInputToIso('boh')).toBeNull()
  })

  it('sameFormValue tratta vuoto = vuoto e numero = stringa', () => {
    expect(sameFormValue('', null)).toBe(true)
    expect(sameFormValue(1, '1')).toBe(true)
    expect(sameFormValue('a', 'b')).toBe(false)
  })

  it('lookup: la chiave esterna si invia come valore salvato (int o uuid) e si svuota con null', () => {
    const initial = initialFormValues(itemSchema, { name: 'A', owner: 4 })
    const set = buildPayload(itemSchema, { ...initial, owner: 7 }, 'edit', initial, { owner: 4 })
    expect(set.payload).toEqual({ owner: 7 })
    const uuid = buildPayload(itemSchema, { ...initial, owner: '0f0b5a0c-5d0e-4a64-9f2e-2f0c8c0f9a11' }, 'edit', initial)
    expect(uuid.payload).toEqual({ owner: '0f0b5a0c-5d0e-4a64-9f2e-2f0c8c0f9a11' })
  })
})
