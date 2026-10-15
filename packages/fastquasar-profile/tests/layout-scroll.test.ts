import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Reads a package source file (style contract: there is no real DOM in the tests). */
function source(path: string): string {
  return readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
}

describe('profile: button reachability with the fixed-viewport layout', () => {
  it('the page scrolls by itself within --pachi-page-height', () => {
    const page = source('components/PachiProfilePage.vue')
    expect(page).toMatch(/max-height:\s*var\(--pachi-page-height/)
    expect(page).toMatch(/overflow-y:\s*auto/)
  })

  it('the countdown banner is compact (dense)', () => {
    expect(source('styles/security.scss')).toContain('&--dense')
    expect(source('components/PachiChangePasswordForm.vue')).toContain('pachi-profile-sec-banner--dense')
    expect(source('components/PachiMfaPanel.vue')).toContain('pachi-profile-sec-banner--dense')
  })
})
