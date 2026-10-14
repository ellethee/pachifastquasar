import { mdiBug } from '@quasar/extras/mdi-v7'
import { describe, expect, it } from 'vitest'
import { resolveSettingsIcon, setPachiSettingsIcons } from '../src/helpers/icons'

describe('resolveSettingsIcon', () => {
  it('risolve i nomi noti', () => {
    expect(resolveSettingsIcon('bug_report')).toBe(mdiBug)
  })
  it('restituisce undefined per vuoto, null e nomi sconosciuti', () => {
    expect(resolveSettingsIcon(null)).toBeUndefined()
    expect(resolveSettingsIcon('')).toBeUndefined()
    expect(resolveSettingsIcon('mdi-foo')).toBeUndefined()
    expect(resolveSettingsIcon('constructor')).toBeUndefined()
  })
  it('lascia passare un path SVG valido', () => {
    expect(resolveSettingsIcon('M12 2L2 7')).toBe('M12 2L2 7')
  })
  it('accetta estensioni della mappa', () => {
    setPachiSettingsIcons({ custom: 'M0 0' })
    expect(resolveSettingsIcon('custom')).toBe('M0 0')
  })
})
