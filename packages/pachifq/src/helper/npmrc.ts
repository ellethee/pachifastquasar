/** Result of {@link mergeNpmrc}. */
export interface NpmrcMerge {
  /** New contents, or `null` if the file must be removed/not written. */
  content: string | null
  /** `created` (new), `updated` (an existing file was modified), `removed` (existing file to remove), `none`. */
  action: 'created' | 'updated' | 'removed' | 'none'
}

const SCOPE_LINE_RE = /^\s*@ilpachi:registry\s*=/

/**
 * Computes the project's `.npmrc` for the `@ilpachi` scope without losing the lines already present.
 *
 * @param existing - current contents (`undefined` if the file does not exist)
 * @param registry - registry URL, or `undefined` for the public registry (no line)
 */
export function mergeNpmrc(existing: string | undefined, registry: string | undefined): NpmrcMerge {
  const lines = (existing ?? '').split(/\r?\n/).filter((line) => line.trim() !== '' && !SCOPE_LINE_RE.test(line))
  const hadScope = existing !== undefined && existing.split(/\r?\n/).some((line) => SCOPE_LINE_RE.test(line))
  if (registry) {
    const url = registry.endsWith('/') ? registry : `${registry}/`
    return {
      content: [...lines, `@ilpachi:registry=${url}`].join('\n') + '\n',
      action: existing === undefined ? 'created' : 'updated',
    }
  }
  if (existing === undefined || !hadScope) return { content: existing ?? null, action: 'none' }
  return lines.length === 0 ? { content: null, action: 'removed' } : { content: lines.join('\n') + '\n', action: 'updated' }
}
