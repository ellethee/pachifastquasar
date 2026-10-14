import type { FeatureInfo } from '../project-context.js'

/**
 * Formats a feature as a text list line (used by `info` and `list`).
 *
 * @param feature - feature to format
 * @returns line with name, routes.ts presence and title
 */
export function formatFeatureLine(feature: FeatureInfo): string {
  const routesFlag = feature.hasRoutes ? '✓' : '✗ missing routes.ts'
  const titlePart = feature.title ? `title: "${feature.title}"` : ''
  return `  - ${feature.name.padEnd(16)} ${routesFlag}  ${titlePart}`.trimEnd()
}

/**
 * Formats the feature list (one line per feature, "(none)" if empty).
 *
 * @param features - features to format
 */
export function formatFeatureLines(features: FeatureInfo[]): string[] {
  return features.length === 0 ? ['  (none)'] : features.map(formatFeatureLine)
}
