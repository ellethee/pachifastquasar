import { mdiBug } from '@quasar/extras/mdi-v7'
import { describe, expect, it } from 'vitest'
import { resolveSettingsIcon, setPachiSettingsIcons } from '../src/helpers/icons'

describe('resolveSettingsIcon', () => {
  it('resolves known names', () => {
    expect(resolveSettingsIcon('bug_report')).toBe(mdiBug)
  })
  it('returns undefined for empty, null and unknown names', () => {
    expect(resolveSettingsIcon(null)).toBeUndefined()
    expect(resolveSettingsIcon('')).toBeUndefined()
    expect(resolveSettingsIcon('mdi-foo')).toBeUndefined()
    expect(resolveSettingsIcon('constructor')).toBeUndefined()
  })
  it('lets a valid SVG path through', () => {
    expect(resolveSettingsIcon('M12 2L2 7')).toBe('M12 2L2 7')
  })
  it('accepts map extensions', () => {
    setPachiSettingsIcons({ custom: 'M0 0' })
    expect(resolveSettingsIcon('custom')).toBe('M0 0')
  })
})
