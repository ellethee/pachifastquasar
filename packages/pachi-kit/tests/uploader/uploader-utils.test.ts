import { describe, expect, it, vi } from 'vitest'
import {
  applyUploadNames, buildMetadataMap, cloneUploaderProps, generateUid, isTextFile, mapProgress, pickKeyForFilename, resolveHeaders,
} from '../../src/uploader/helpers/uploader-utils'

describe('generateUid', () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('genera identificatori univoci', () => {
    expect(new Set(Array.from({ length: 50 }, generateUid)).size).toBe(50)
  })

  it('fallback senza randomUUID (contesto non sicuro)', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) })
    expect(generateUid()).toMatch(uuidRe)
    vi.unstubAllGlobals()
  })

  it('fallback senza crypto', () => {
    vi.stubGlobal('crypto', undefined)
    expect(generateUid()).toMatch(uuidRe)
    vi.unstubAllGlobals()
  })
})

describe('mapProgress', () => {
  it('senza storage: browser 0-100', () => {
    expect(mapProgress(0)).toBe(0)
    expect(mapProgress(0.5)).toBe(50)
    expect(mapProgress(1)).toBe(100)
  })
  it('con storage idle: browser 0-50', () => {
    const s = { progress: 0, status: 'idle' as const }
    expect(mapProgress(0.5, s)).toBe(25)
    expect(mapProgress(1, s)).toBe(50)
  })
  it('con storage in corso: 50-100', () => {
    expect(mapProgress(1, { progress: 0.5, status: 'uploading' })).toBe(75)
  })
  it('storage done = 100', () => {
    expect(mapProgress(1, { progress: 1, status: 'done' })).toBe(100)
  })
  it('limita i valori fuori range', () => {
    expect(mapProgress(2)).toBe(100)
    expect(mapProgress(-1)).toBe(0)
  })
})

describe('isTextFile', () => {
  it('riconosce MIME e estensioni', () => {
    expect(isTextFile({ name: 'a.bin', type: 'text/plain' })).toBe(true)
    expect(isTextFile({ name: 'a.bin', type: 'application/json' })).toBe(true)
    expect(isTextFile({ name: 'script.PY', type: '' })).toBe(true)
    expect(isTextFile({ name: 'a.png', type: 'image/png' })).toBe(false)
    expect(isTextFile({ name: 'noext', type: '' })).toBe(false)
  })
})

describe('cloneUploaderProps', () => {
  it('non muta l\'originale', () => {
    const original = { url: '/x', headers: [{ name: 'a', value: 'b' }] }
    const clone = cloneUploaderProps(original)
    clone.onAdded = () => undefined
    clone.headers = []
    expect(original).toEqual({ url: '/x', headers: [{ name: 'a', value: 'b' }] })
    expect(clone).not.toBe(original)
  })
})

describe('resolveHeaders', () => {
  it('array statico invariato', () => {
    const h = [{ name: 'a', value: '1' }]
    expect(resolveHeaders(h)).toBe(h)
  })
  it('funzione valutata a ogni richiesta', () => {
    let n = 0
    const resolved = resolveHeaders(() => [{ name: 'n', value: String(++n) }]) as () => { value: string }[]
    expect(typeof resolved).toBe('function')
    expect(resolved()[0]?.value).toBe('1')
    expect(resolved()[0]?.value).toBe('2')
  })
})

describe('buildMetadataMap', () => {
  it('indicizza per nome file', () => {
    expect(buildMetadataMap([{ name: 'a.txt', __key: 'k1' }], { k1: { t: 1 } })).toEqual({ 'a.txt': { t: 1 } })
  })
  it('nomi duplicati: il secondo usa la chiave univoca', () => {
    const out = buildMetadataMap(
      [{ name: 'a.txt', __key: 'k1' }, { name: 'a.txt', __key: 'k2' }],
      { k1: { t: 1 }, k2: { t: 2 } },
    )
    expect(out).toEqual({ 'a.txt': { t: 1 }, k2: { t: 2 } })
  })
  it('ignora i file senza metadati', () => {
    expect(buildMetadataMap([{ name: 'a', __key: 'k' }], {})).toEqual({})
  })
})

describe('pickKeyForFilename', () => {
  it('preferisce il primo non concluso', () => {
    expect(pickKeyForFilename(['a', 'b'], k => k === 'a')).toBe('b')
  })
  it('se tutti conclusi usa l\'ultimo', () => {
    expect(pickKeyForFilename(['a', 'b'], () => true)).toBe('b')
  })
  it('senza chiavi undefined', () => {
    expect(pickKeyForFilename(undefined, () => false)).toBeUndefined()
  })
})

describe('applyUploadNames', () => {
  const mk = (name: string, key: string) => Object.assign(new File(['x'], name), { __key: key }) as File & { __key: string, __originalName?: string }

  it('il nome rinominato diventa il filename della parte multipart', () => {
    const f = mk('orig.txt', 'k1')
    const names = applyUploadNames([f], { k1: { filename: 'nuovo.txt' } })
    expect(names).toEqual({ k1: 'nuovo.txt' })
    expect(f.name).toBe('nuovo.txt')
    const form = new FormData()
    form.append('file', f, f.name)
    expect((form.get('file') as File).name).toBe('nuovo.txt')
    // la chiave di metadata coincide con il nome della parte
    expect(Object.keys(buildMetadataMap([f], { k1: { filename: 'nuovo.txt' } }))).toEqual(['nuovo.txt'])
  })

  it('ripristina il nome originale e ignora nomi non validi', () => {
    const f = mk('orig.txt', 'k1')
    applyUploadNames([f], { k1: { filename: 'a.txt' } })
    applyUploadNames([f], { k1: { filename: 'orig.txt' } })
    expect(f.name).toBe('orig.txt')
    applyUploadNames([f], { k1: { filename: '   ' } })
    expect(f.name).toBe('orig.txt')
    applyUploadNames([f], { k1: { filename: '../x.txt' } })
    expect(f.name).toBe('orig.txt')
    expect(f.__originalName).toBe('orig.txt')
  })

  it('rispetta una chiave nome personalizzata', () => {
    const f = mk('o.txt', 'k')
    applyUploadNames([f], { k: { title: 't.txt' } }, 'title')
    expect(f.name).toBe('t.txt')
  })
})
