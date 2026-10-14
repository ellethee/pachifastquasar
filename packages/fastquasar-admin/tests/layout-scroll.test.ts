import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Legge un sorgente del package (contratto di stile: non c'è un DOM reale nei test). */
function source(path: string): string {
  return readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
}

describe('admin: layout con il viewport fisso della shell', () => {
  it('la pagina scrolla da sé entro --pachi-page-height', () => {
    const css = source('styles/admin.scss')
    expect(css).toMatch(/max-height:\s*var\(--pachi-page-height/)
    expect(css).toMatch(/overflow-y:\s*auto/)
  })

  it('i default del tema hanno specificità zero', () => {
    expect(source('styles/theme-defaults.scss')).toContain(':where(:root)')
  })

  it('il package non importa la shell né vue-router', () => {
    for (const f of ['components/PachiAdminPage.vue', 'menu.ts', 'routes.ts', 'services/install.ts']) {
      expect(source(f)).not.toMatch(/from '@ilpachi\/pachifastquasar|from 'vue-router'/)
    }
  })
})
