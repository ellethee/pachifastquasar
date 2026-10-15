import { describe, expect, it, vi } from 'vitest'

vi.mock('@ilpachi/pachi-i18n', () => ({ usePachiI18n: () => ({ t: (k: string) => k }) }))
vi.mock('../../src/uploader/components/PachiUploader.vue', () => ({ default: {} }))
vi.mock('../../src/uploader/locales', () => ({ messages: {} }))
vi.mock('vue', async (orig) => ({
  ...(await orig<typeof import('vue')>()),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
}))

import { usePachiUploader } from '../../src/uploader/composables/use-pachi-uploader'
import { stringifyParam } from '../../src/uploader/helpers/uploader-utils'

type Item = { filename?: string }
type F = File & { __key: string }
const file = (name: string, key: string): F => Object.assign(new File(['x'], name), { __key: key }) as F

function setup(extra: Partial<Parameters<typeof usePachiUploader<Item>>[0]> = {}) {
  const eventBus = { addHandler: vi.fn(), removeHandler: vi.fn() }
  const res = usePachiUploader<Item>({ itemDefaults: {}, uploaderProps: { url: '/up' }, eventBus: eventBus as never, ...extra })
  return { ...res.pachiUploaderProps, props: res.pachiUploaderProps.uploaderProps, eventBus }
}

describe('usePachiUploader cleanup on onRemoved', () => {
  it('onRemoved cleans the state of the files removed in bulk and calls the original callback', () => {
    const onRemoved = vi.fn()
    const s = setup({ uploaderProps: { url: '/up', onRemoved } })
    const a = file('a.txt', 'k1')
    const b = file('b.txt', 'k2')
    s.events.added([a, b])
    expect(s.fileStatuses.k1).toBe('idle')
    expect(s.storageStatuses.k1).toBeDefined()
    s.props.onRemoved?.([a])
    expect(s.fileStatuses.k1).toBeUndefined()
    expect(s.itemsMetadata.k1).toBeUndefined()
    expect(s.storageStatuses.k1).toBeUndefined()
    expect(s.fileStatuses.k2).toBe('idle')
    expect(onRemoved).toHaveBeenCalledWith([a])
  })

  it('re-adding a file with the same name does not use the old key', () => {
    const s = setup()
    const old = file('a.txt', 'old')
    s.events.added([old])
    s.props.onRemoved?.([old])
    s.events.added([file('a.txt', 'new')])
    expect(Object.keys(s.storageStatuses)).toEqual(['new'])
  })
})

describe('usePachiUploader onAdded', () => {
  it('does not wrap onAdded (avoids the double call with the template @added)', () => {
    const onAdded = vi.fn()
    const s = setup({ uploaderProps: { url: '/up', onAdded } })
    expect(s.props.onAdded).toBe(onAdded)
  })
})

describe('usePachiUploader extraParams', () => {
  it('serializes the values and omits null/undefined', () => {
    const s = setup({ extraParams: { a: 1, b: null, c: undefined, d: { x: 1 }, e: 'txt' } })
    const fields = (s.props.formFields as (f: File[]) => { name: string, value: string }[])([file('a.txt', 'k')])
    const named = Object.fromEntries(fields.map(f => [f.name, f.value]))
    expect(named).toMatchObject({ a: '1', d: '{"x":1}', e: 'txt' })
    expect('b' in named).toBe(false)
    expect('c' in named).toBe(false)
  })
})

describe('stringifyParam', () => {
  it('basic cases', () => {
    expect(stringifyParam('x')).toBe('x')
    expect(stringifyParam(0)).toBe('0')
    expect(stringifyParam(false)).toBe('false')
    expect(stringifyParam([1, 2])).toBe('[1,2]')
    expect(stringifyParam(new Date(0))).toBe('1970-01-01T00:00:00.000Z')
    expect(stringifyParam(null)).toBeUndefined()
    expect(stringifyParam(() => 1)).toBeUndefined()
    const circ: Record<string, unknown> = {}
    circ.self = circ
    expect(stringifyParam(circ)).toBeUndefined()
  })
})
