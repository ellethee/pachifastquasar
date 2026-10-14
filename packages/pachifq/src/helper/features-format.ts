import type { FeatureInfo } from '../project-context.js'

/**
 * Formatta una feature come riga di elenco testuale (usata da `info` e `list`).
 *
 * @param feature - feature da formattare
 * @returns riga con nome, presenza di routes.ts e titolo
 */
export function formatFeatureLine(feature: FeatureInfo): string {
  const routesFlag = feature.hasRoutes ? '✓' : '✗ manca routes.ts'
  const titlePart = feature.title ? `title: "${feature.title}"` : ''
  return `  - ${feature.name.padEnd(16)} ${routesFlag}  ${titlePart}`.trimEnd()
}

/**
 * Formatta l'elenco delle feature (una riga per feature, "(nessuna)" se vuoto).
 *
 * @param features - feature da formattare
 */
export function formatFeatureLines(features: FeatureInfo[]): string[] {
  return features.length === 0 ? ['  (nessuna)'] : features.map(formatFeatureLine)
}
