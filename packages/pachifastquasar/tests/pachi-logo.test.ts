import { describe, expect, it } from 'vitest'
import { pachiLogo } from 'src/extras/pachi-icons'
import { definePachiConfig } from 'src/core/config'

describe('logo predefinito', () => {
  it('pachiLogo is an `img:` string pointing to the mascot SVG', () => {
    expect(typeof pachiLogo).toBe('string')
    expect(pachiLogo.startsWith('img:')).toBe(true)
    expect(pachiLogo).toMatch(/logo[^/]*\.svg$/)
  })
  it('config.logo replaces the default', () => {
    const cfg = definePachiConfig({ logo: 'img:/mio-logo.svg' }, {})
    expect(cfg.logo).toBe('img:/mio-logo.svg')
    expect(cfg.logo).not.toBe(pachiLogo)
  })
})
