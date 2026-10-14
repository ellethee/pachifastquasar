import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/** Specifier of the sub-path with the mdi icons. */
const MDI_SPECIFIER = '@quasar/extras/mdi-v7'

/**
 * Extracts the names of the `mdi*` exports from the source of `@quasar/extras/mdi-v7`.
 *
 * @param source - contents of the `index.js` of the mdi-v7 sub-path
 * @returns list of exported names
 */
export function parseMdiExports(source: string): string[] {
  const names: string[] = []
  for (const match of source.matchAll(/^export const (mdi[A-Za-z0-9]+)\b/gm)) names.push(match[1]!)
  return names
}

/**
 * Loads the icon names of `@quasar/extras/mdi-v7`, resolving the package
 * from the current app and, as an alternative, from the CLI's node_modules.
 *
 * @param cwd - app root
 * @returns set of names, or `null` if the package cannot be resolved
 */
export function loadMdiIconNames(cwd: string): Set<string> | null {
  const bases = [path.join(cwd, 'package.json'), import.meta.url]
  for (const base of bases) {
    try {
      const file = createRequire(base).resolve(MDI_SPECIFIER)
      const names = parseMdiExports(readFileSync(file, 'utf-8'))
      if (names.length > 0) return new Set(names)
    } catch {
      // try the next base
    }
  }
  return null
}

/** Levenshtein distance between two strings. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]!
}

/**
 * Suggests icons similar to an invalid name (substring and edit distance).
 *
 * @param icon - name entered by the user
 * @param names - available icons
 * @param max - maximum number of suggestions (default 5)
 * @returns names sorted by similarity
 */
export function suggestIcons(icon: string, names: Iterable<string>, max = 5): string[] {
  const needle = icon.toLowerCase()
  const core = needle.replace(/^mdi/, '')
  const scored: Array<{ name: string; score: number }> = []
  for (const name of names) {
    const lower = name.toLowerCase()
    const dist = editDistance(needle, lower)
    const contains = core.length >= 3 && (lower.includes(core) || core.includes(lower.replace(/^mdi/, '')))
    const score = contains ? Math.min(dist, 3 + Math.abs(lower.length - needle.length) / 100) : dist
    if (contains || dist <= Math.max(3, Math.floor(needle.length / 3))) scored.push({ name, score: contains ? score - 2 : score })
  }
  scored.sort((a, b) => a.score - b.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
  return scored.slice(0, max).map((s) => s.name)
}
