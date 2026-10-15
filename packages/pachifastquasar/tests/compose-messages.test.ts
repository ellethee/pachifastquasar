import { describe, expect, it, vi } from 'vitest'

type Tree = Record<string, unknown>

/** The real environment's deepMerge/collectLocales require the browser (quasar): minimal equivalent version. */
vi.mock('@ilpachi/pachi-i18n', () => {
  const deepMerge = (base: Tree, over: Tree): Tree => {
    const out: Tree = { ...base }
    for (const [k, v] of Object.entries(over)) {
      const cur = out[k]
      out[k] =
        cur && v && typeof cur === 'object' && typeof v === 'object'
          ? deepMerge(cur as Tree, v as Tree)
          : v
    }
    return out
  }
  const collectLocales = (glob: Record<string, unknown>) => {
    const result: Record<string, Tree> = {}
    for (const [file, mod] of Object.entries(glob)) {
      const code = (file.split('/').pop() ?? file).replace(/\.([cm]?[jt]s|json)$/, '')
      result[code] = deepMerge(result[code] ?? {}, mod as Tree)
    }
    return result
  }
  return { deepMerge, collectLocales }
})

const { composePachiMessages, pachiShellMessages } = await import('src/i18n')

describe('composePachiMessages', () => {
  it('without levels returns the shell messages', () => {
    expect(Object.keys(composePachiMessages())).toEqual(['it', 'en'])
  })
  it('precedenza: shell < generated < overrides < locales < features', () => {
    const messages = composePachiMessages({
      generated: { './generated/it.json': { errors: { codes: { a: 'gen' } }, common: { ok: 'gen' } } },
      overrides: { './overrides/it.ts': { common: { ok: 'over' } } },
      locales: { './locales/it.ts': { common: { ok: 'app' } } },
      features: { '/src/features/x/locales/it.ts': { common: { ok: 'feat' }, x: { y: 1 } } }
    })
    const it = messages.it as Record<string, Record<string, unknown>>
    expect(it.common?.ok).toBe('feat')
    expect(it.common?.loading).toBe((pachiShellMessages.it as never as Record<string, Record<string, unknown>>).common?.loading)
    expect((it.errors?.codes as Record<string, string>).a).toBe('gen')
    expect(it.x).toEqual({ y: 1 })
  })
  it('a new app language is added', () => {
    const messages = composePachiMessages({ locales: { './locales/pt-BR.ts': { app: { a: 1 } } } })
    expect(Object.keys(messages)).toContain('pt-BR')
  })
})
