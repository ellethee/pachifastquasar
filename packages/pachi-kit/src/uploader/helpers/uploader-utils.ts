import type { QUploaderProps } from 'quasar'
import type { IStorageFileStatus } from '../types/pachi-uploader'

/** Maximum size (bytes) of the text content read for the full preview. */
export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/yaml',
  'application/x-yaml',
  'application/javascript',
  'application/typescript',
  'application/x-sh',
  'application/x-python',
])

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'log',
  'py', 'pyw',
  'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'json', 'json5', 'jsonc',
  'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
  'vue', 'svelte',
  'cs', 'java', 'cpp', 'c', 'h', 'hpp',
  'go', 'rs', 'rb', 'php', 'swift', 'kt',
  'sh', 'bash', 'zsh', 'fish', 'ps1',
  'sql', 'graphql', 'gql',
  'dockerfile', 'makefile', 'gitignore', 'editorconfig',
])

/**
 * Tells whether a file is textual (by MIME or by extension) and therefore has a text preview.
 *
 * @param file - file (`name` and `type` are enough)
 * @returns true if textual
 */
export function isTextFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type.startsWith('text/')) return true
  if (TEXT_MIME_TYPES.has(file.type)) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TEXT_EXTENSIONS.has(ext)
}

/**
 * Generates a unique identifier. Uses `crypto.randomUUID()` only if available (secure context),
 * otherwise `crypto.getRandomValues` and, as a last resort, `Math.random`.
 *
 * @returns identifier in UUID v4 format
 */
export function generateUid(): string {
  const c = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

/**
 * Overall percentage (0-100) of a file.
 * Without storage tracking (`storage` absent) the browser upload covers 0-100;
 * with tracking it covers 0-50 and the storage 50-100 (`storage.progress` from 0 to 1).
 *
 * @param browserProgress - browser upload progress (0-1)
 * @param storage - storage state (present only with event bus)
 * @returns integer percentage 0-100
 */
export function mapProgress(browserProgress: number, storage?: IStorageFileStatus): number {
  const browser = Math.min(1, Math.max(0, browserProgress || 0))
  if (!storage) return Math.round(browser * 100)
  if (storage.status === 'done') return 100
  if (storage.progress > 0) return 50 + Math.round(Math.min(1, storage.progress) * 50)
  return Math.round(browser * 50)
}

/**
 * Shallow-clones the `QUploader` props, so the callback and `headers` wrappers do not mutate the caller's object.
 * It is a snapshot: later changes to the original object (e.g. `url`) are not propagated.
 *
 * @param props - original props
 * @returns copy
 */
export function cloneUploaderProps(props: Partial<QUploaderProps>): Partial<QUploaderProps> {
  return { ...props }
}

/**
 * Converts the value of an `extraParams` entry into the text value of a multipart field.
 * `null`/`undefined` (and functions/symbols) -> `undefined` (field omitted); strings unchanged; number/boolean/bigint with `String`;
 * `Date` as ISO 8601; arrays and objects as JSON.
 *
 * @param value - parameter value
 * @returns string to send or `undefined` if the field is to be omitted
 */
export function stringifyParam(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  switch (typeof value) {
    case 'string': return value
    case 'number': case 'boolean': case 'bigint': return String(value)
    case 'object':
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
      try { return JSON.stringify(value) } catch { return undefined }
    default: return undefined
  }
}

/** List of headers as accepted by `QUploader`. */
export type UploaderHeaders = { name: string, value: string }[]

/**
 * Normalizes the headers: a static array or a function evaluated on every request.
 *
 * @param headers - array or function returning it
 * @returns value for the `headers` prop of `QUploader`
 */
export function resolveHeaders(headers: UploaderHeaders | (() => UploaderHeaders)): UploaderHeaders | (() => UploaderHeaders) {
  return typeof headers === 'function' ? () => headers() : headers
}

/**
 * Builds the `metadata` map sent to the server, indexed by file name (legacy contract).
 * If several files of the same request have the same name, those after the first use their own unique key
 * (`__key`) so as not to overwrite the metadata.
 *
 * @param files - request files (`name` and `__key`)
 * @param metadata - metadata by `__key`
 * @returns map name (or key) -> metadata
 */
export function buildMetadataMap<T>(files: readonly { name: string, __key: string }[], metadata: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  for (const file of files) {
    const value = metadata[file.__key]
    if (value === undefined) continue
    out[file.name in out ? file.__key : file.name] = value
  }
  return out
}

/**
 * Chooses the key of the file to assign a progress message to, given the file name.
 * With duplicate names it prefers the first file not yet finished.
 *
 * @param keys - keys of the files with that name, in order of addition
 * @param isFinished - true if the storage of that key is finished (done/error)
 * @returns chosen key or undefined
 */
export function pickKeyForFilename(keys: readonly string[] | undefined, isFinished: (key: string) => boolean): string | undefined {
  if (!keys || keys.length === 0) return undefined
  return keys.find(k => !isFinished(k)) ?? keys[keys.length - 1]
}

/**
 * Applies to the files the name chosen by the user (`nameKey` field of the metadata) as the actual name of the
 * multipart part: `QUploader` sends `form.append(fieldName, file, file.name)`, so `name` is redefined
 * on the instance (own property) and the server receives the same name as the `filename` metadata and the `metadata` key.
 * The original name is kept in `__originalName`: restoring the original value brings the name back to the file's.
 * An empty name (or only spaces) or one containing `/` or `\` is ignored and the original is used.
 *
 * @param files - request files
 * @param metadata - metadata by `__key`
 * @param nameKey - metadata field containing the name (default `filename`)
 * @returns map `__key` -> applied name
 */
export function applyUploadNames<T>(files: readonly { name: string, __key: string, __originalName?: string }[], metadata: Record<string, T>, nameKey = 'filename'): Record<string, string> {
  const applied: Record<string, string> = {}
  for (const file of files) {
    const original = file.__originalName ?? file.name
    const raw = (metadata[file.__key] as Record<string, unknown> | undefined)?.[nameKey]
    const candidate = typeof raw === 'string' ? raw.trim() : ''
    const name = candidate && !/[\\/]/.test(candidate) ? candidate : original
    Object.defineProperty(file, '__originalName', { value: original, configurable: true, writable: true, enumerable: false })
    if (name !== file.name) Object.defineProperty(file, 'name', { value: name, configurable: true, enumerable: true })
    applied[file.__key] = name
  }
  return applied
}
