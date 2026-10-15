import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { setPachiConfig } from 'src/core/config'
import { createPachiAvatarResolver, PACHI_AVATAR_URL_KEY } from 'src/helpers/avatar-resolver'

afterEach(() => setPachiConfig({}))

describe('createPachiAvatarResolver', () => {
  const hash = createHash('sha256').update('mario@example.com').digest('hex')
  it('stable injection key', () => expect(PACHI_AVATAR_URL_KEY).toBe('pachiAvatarUrl'))
  it('Gravatar with hash of the normalized email and requested size', async () => {
    setPachiConfig({ app: { gravatar: true } })
    const resolve = createPachiAvatarResolver()
    expect(await resolve(' Mario@Example.com ', 120)).toBe(
      `https://www.gravatar.com/avatar/${hash}?s=120&d=404`
    )
  })
  it('by default (opt-in) → null, no external request', async () => {
    const resolve = createPachiAvatarResolver()
    expect(await resolve('mario@example.com')).toBeNull()
  })
  it('email vuota o assente → null', async () => {
    setPachiConfig({ app: { gravatar: true } })
    const resolve = createPachiAvatarResolver()
    expect(await resolve('')).toBeNull()
    expect(await resolve(null)).toBeNull()
  })
  it('gravatar: explicit false (read on every call) → null, no external request', async () => {
    const resolve = createPachiAvatarResolver()
    setPachiConfig({ app: { gravatar: true } })
    expect(await resolve('mario@example.com')).not.toBeNull()
    setPachiConfig({ app: { gravatar: false } })
    expect(await resolve('mario@example.com')).toBeNull()
  })
})
