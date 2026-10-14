import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Legge un sorgente del package (contratto di stile: non c'è un DOM reale nei test). */
function source(path: string): string {
  return readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
}

describe('profilo: raggiungibilità dei pulsanti con il layout a viewport fisso', () => {
  it('la pagina scrolla da sé entro --pachi-page-height', () => {
    const page = source('components/PachiProfilePage.vue')
    expect(page).toMatch(/max-height:\s*var\(--pachi-page-height/)
    expect(page).toMatch(/overflow-y:\s*auto/)
  })

  it('il banner del conto alla rovescia è compatto (dense)', () => {
    expect(source('styles/security.scss')).toContain('&--dense')
    expect(source('components/PachiChangePasswordForm.vue')).toContain('pachi-profile-sec-banner--dense')
    expect(source('components/PachiMfaPanel.vue')).toContain('pachi-profile-sec-banner--dense')
  })
})
