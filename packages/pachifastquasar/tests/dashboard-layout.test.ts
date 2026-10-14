import { describe, expect, it } from 'vitest'
import { resolveDashboardColumns, resolveDashboardMaxWidth } from 'src/core/dashboard/helpers/dashboard-layout'
import { pachiConfigFromEnv, resolvePachiConfig } from 'src/core/config'

describe('resolveDashboardColumns', () => {
  it('numero intero -> repeat(n, 1fr)', () => {
    expect(resolveDashboardColumns(3)).toBe('repeat(3, 1fr)')
    expect(resolveDashboardColumns('5')).toBe('repeat(5, 1fr)')
  })
  it('stringa CSS usata così com\'è', () => {
    expect(resolveDashboardColumns(' repeat(auto-fill, minmax(220px, 1fr)) ')).toBe('repeat(auto-fill, minmax(220px, 1fr))')
  })
  it('valori non validi -> undefined', () => {
    for (const v of [0, -1, 2.5, '', '  ', undefined, null, {}]) expect(resolveDashboardColumns(v)).toBeUndefined()
  })
})

describe('resolveDashboardMaxWidth', () => {
  it('numeri come pixel, stringhe CSS invariate', () => {
    expect(resolveDashboardMaxWidth(1400)).toBe('1400px')
    expect(resolveDashboardMaxWidth('1400')).toBe('1400px')
    expect(resolveDashboardMaxWidth('90%')).toBe('90%')
    expect(resolveDashboardMaxWidth('none')).toBe('none')
  })
  it('valori non validi -> undefined', () => {
    for (const v of [0, '', undefined, null]) expect(resolveDashboardMaxWidth(v)).toBeUndefined()
  })
})

describe('config della dashboard', () => {
  it('default non impostati (resta il CSS)', () => {
    const cfg = resolvePachiConfig()
    expect(cfg.app.dashboardMaxWidth).toBeUndefined()
    expect(cfg.app.dashboardColumns).toBeUndefined()
  })
  it('legge le variabili QCLI_APP_DASHBOARD_*', () => {
    const cfg = resolvePachiConfig(
      pachiConfigFromEnv({ QCLI_APP_DASHBOARD_MAX_WIDTH: '1400px', QCLI_APP_DASHBOARD_COLUMNS: '3' })
    )
    expect(cfg.app.dashboardMaxWidth).toBe('1400px')
    expect(resolveDashboardColumns(cfg.app.dashboardColumns)).toBe('repeat(3, 1fr)')
  })
})
