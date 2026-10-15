import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Reads a package source file (style contract: there is no real DOM in the tests). */
function source(path: string): string {
  return readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
}

describe('admin: layout with the fixed viewport of the shell', () => {
  it('the page scrolls on its own within --pachi-page-height', () => {
    const css = source('styles/admin.scss')
    expect(css).toMatch(/max-height:\s*var\(--pachi-page-height/)
    expect(css).toMatch(/overflow-y:\s*auto/)
  })

  it('theme defaults have zero specificity', () => {
    expect(source('styles/theme-defaults.scss')).toContain(':where(:root)')
  })

  it('the package does not import the shell nor vue-router', () => {
    for (const f of ['components/PachiAdminPage.vue', 'menu.ts', 'routes.ts', 'services/install.ts']) {
      expect(source(f)).not.toMatch(/from '@ilpachi\/pachifastquasar|from 'vue-router'/)
    }
  })
})
