import { describe, expect, it, vi } from 'vitest'
import {
  applyUploadNames, buildMetadataMap, cloneUploaderProps, generateUid, isTextFile, mapProgress, pickKeyForFilename, resolveHeaders,
} from '../../src/uploader/helpers/uploader-utils'

describe('generateUid', () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('generates unique identifiers', () => {
    expect(new Set(Array.from({ length: 50 }, generateUid)).size).toBe(50)
  })

  it('fallback without randomUUID (insecure context)', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) })
    expect(generateUid()).toMatch(uuidRe)
    vi.unstubAllGlobals()
  })

  it('fallback without crypto', () => {
    vi.stubGlobal('crypto', undefined)
    expect(generateUid()).toMatch(uuidRe)
    vi.unstubAllGlobals()
  })
})

describe('mapProgress', () => {
  it('without storage: browser 0-100', () => {
    expect(mapProgress(0)).toBe(0)
    expect(mapProgress(0.5)).toBe(50)
    expect(mapProgress(1)).toBe(100)
  })
  it('with idle storage: browser 0-50', () => {
    const s = { progress: 0, status: 'idle' as const }
    expect(mapProgress(0.5, s)).toBe(25)
    expect(mapProgress(1, s)).toBe(50)
  })
  it('with storage in progress: 50-100', () => {
    expect(mapProgress(1, { progress: 0.5, status: 'uploading' })).toBe(75)
  })
  it('storage done = 100', () => {
    expect(mapProgress(1, { progress: 1, status: 'done' })).toBe(100)
  })
  it('clamps out-of-range values', () => {
    expect(mapProgress(2)).toBe(100)
    expect(mapProgress(-1)).toBe(0)
  })
})

describe('isTextFile', () => {
  it('recognizes MIME types and extensions', () => {
    expect(isTextFile({ name: 'a.bin', type: 'text/plain' })).toBe(true)
    expect(isTextFile({ name: 'a.bin', type: 'application/json' })).toBe(true)
    expect(isTextFile({ name: 'script.PY', type: '' })).toBe(true)
    expect(isTextFile({ name: 'a.png', type: 'image/png' })).toBe(false)
    expect(isTextFile({ name: 'noext', type: '' })).toBe(false)
  })
})

describe('cloneUploaderProps', () => {
  it('does not mutate the original', () => {
    const original = { url: '/x', headers: [{ name: 'a', value: 'b' }] }
    const clone = cloneUploaderProps(original)
    clone.onAdded = () => undefined
    clone.headers = []
    expect(original).toEqual({ url: '/x', headers: [{ name: 'a', value: 'b' }] })
    expect(clone).not.toBe(original)
  })
})

describe('resolveHeaders', () => {
  it('static array unchanged', () => {
    const h = [{ name: 'a', value: '1' }]
    expect(resolveHeaders(h)).toBe(h)
  })
  it('function evaluated on every request', () => {
    let n = 0
    const resolved = resolveHeaders(() => [{ name: 'n', value: String(++n) }]) as () => { value: string }[]
    expect(typeof resolved).toBe('function')
    expect(resolved()[0]?.value).toBe('1')
    expect(resolved()[0]?.value).toBe('2')
  })
})

describe('buildMetadataMap', () => {
  it('indexes by file name', () => {
    expect(buildMetadataMap([{ name: 'a.txt', __key: 'k1' }], { k1: { t: 1 } })).toEqual({ 'a.txt': { t: 1 } })
  })
  it('duplicate names: the second uses the unique key', () => {
    const out = buildMetadataMap(
      [{ name: 'a.txt', __key: 'k1' }, { name: 'a.txt', __key: 'k2' }],
      { k1: { t: 1 }, k2: { t: 2 } },
    )
    expect(out).toEqual({ 'a.txt': { t: 1 }, k2: { t: 2 } })
  })
  it('ignores files without metadata', () => {
    expect(buildMetadataMap([{ name: 'a', __key: 'k' }], {})).toEqual({})
  })
})

describe('pickKeyForFilename', () => {
  it('prefers the first unfinished one', () => {
    expect(pickKeyForFilename(['a', 'b'], k => k === 'a')).toBe('b')
  })
  it('if all finished it uses the last one', () => {
    expect(pickKeyForFilename(['a', 'b'], () => true)).toBe('b')
  })
  it('without keys undefined', () => {
    expect(pickKeyForFilename(undefined, () => false)).toBeUndefined()
  })
})

describe('applyUploadNames', () => {
  const mk = (name: string, key: string) => Object.assign(new File(['x'], name), { __key: key }) as File & { __key: string, __originalName?: string }

  it('the renamed name becomes the filename of the multipart part', () => {
    const f = mk('orig.txt', 'k1')
    const names = applyUploadNames([f], { k1: { filename: 'new.txt' } })
    expect(names).toEqual({ k1: 'new.txt' })
    expect(f.name).toBe('new.txt')
    const form = new FormData()
    form.append('file', f, f.name)
    expect((form.get('file') as File).name).toBe('new.txt')
    // the metadata key matches the part name
    expect(Object.keys(buildMetadataMap([f], { k1: { filename: 'new.txt' } }))).toEqual(['new.txt'])
  })

  it('restores the original name and ignores invalid names', () => {
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

  it('honors a custom name key', () => {
    const f = mk('o.txt', 'k')
    applyUploadNames([f], { k: { title: 't.txt' } }, 'title')
    expect(f.name).toBe('t.txt')
  })
})
