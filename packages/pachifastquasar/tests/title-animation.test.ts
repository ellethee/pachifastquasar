import { describe, expect, it } from 'vitest'
import { PACHI_TITLE_ANIMATIONS, resolveTitleAnimation, titleAnimationCss } from 'src/core/dashboard/helpers/title-animation'
import { pachiConfigFromEnv, resolvePachiConfig } from 'src/core/config'

describe('resolveTitleAnimation', () => {
  it('accetta i nomi noti (maiuscole e spazi ignorati)', () => {
    for (const name of PACHI_TITLE_ANIMATIONS) expect(resolveTitleAnimation(name)).toBe(name)
    expect(resolveTitleAnimation('  PULSE ')).toBe('pulse')
  })
  it('valori sconosciuti o non stringa -> undefined', () => {
    for (const v of ['', 'spin', undefined, null, 3]) expect(resolveTitleAnimation(v)).toBeUndefined()
  })
  it('none = animation none; le altre hanno un valore CSS', () => {
    expect(titleAnimationCss('none')).toBe('none')
    for (const name of PACHI_TITLE_ANIMATIONS) expect(titleAnimationCss(name)).not.toBe('')
  })
})

describe('config titleAnimation', () => {
  it('default non impostato; QCLI_APP_TITLE_ANIMATION valida', () => {
    expect(resolvePachiConfig().app.titleAnimation).toBeUndefined()
    expect(resolvePachiConfig(pachiConfigFromEnv({ QCLI_APP_TITLE_ANIMATION: 'none' })).app.titleAnimation).toBe('none')
    expect(resolvePachiConfig(pachiConfigFromEnv({ QCLI_APP_TITLE_ANIMATION: 'boh' })).app.titleAnimation).toBeUndefined()
  })
})
