import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ALOVA_PREBUNDLE_ENTRIES, readIlpachiDependencies, readPrebundleDependencies } from 'src/quasar/ilpachi-deps'

let dir = ''
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

describe('readIlpachiDependencies', () => {
  it('elenca solo i pacchetti @ilpachi/* di dependencies e devDependencies', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pachi-deps-'))
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { vue: '^3', '@ilpachi/a': '^1' },
        devDependencies: { '@ilpachi/b': 'link:../b', typescript: '^5' }
      })
    )
    expect(readIlpachiDependencies(dir).sort()).toEqual(['@ilpachi/a', '@ilpachi/b'])
  })
  it('senza package.json o con JSON non valido restituisce []', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pachi-deps-'))
    expect(readIlpachiDependencies(dir)).toEqual([])
    writeFileSync(path.join(dir, 'package.json'), '{ non json')
    expect(readIlpachiDependencies(dir)).toEqual([])
  })
})

describe('readPrebundleDependencies', () => {
  it('restituisce le entry di alova se l\'app dipende da alova', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pachi-deps-'))
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { alova: '^3', vue: '^3' } }))
    expect(readPrebundleDependencies(dir)).toEqual(ALOVA_PREBUNDLE_ENTRIES)
  })
  it('senza alova (o senza package.json) restituisce []', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'pachi-deps-'))
    expect(readPrebundleDependencies(dir)).toEqual([])
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { vue: '^3' } }))
    expect(readPrebundleDependencies(dir)).toEqual([])
  })
})
