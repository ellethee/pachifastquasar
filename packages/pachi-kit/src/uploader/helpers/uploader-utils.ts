import type { QUploaderProps } from 'quasar'
import type { IStorageFileStatus } from '../types/pachi-uploader'

/** Dimensione massima (byte) del contenuto testuale letto per l'anteprima completa. */
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
 * Indica se un file e' testuale (per MIME o per estensione) e quindi ha un'anteprima di testo.
 *
 * @param file - file (bastano `name` e `type`)
 * @returns true se testuale
 */
export function isTextFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type.startsWith('text/')) return true
  if (TEXT_MIME_TYPES.has(file.type)) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TEXT_EXTENSIONS.has(ext)
}

/**
 * Genera un identificatore univoco. Usa `crypto.randomUUID()` solo se disponibile (contesto sicuro),
 * altrimenti `crypto.getRandomValues` e, in ultima istanza, `Math.random`.
 *
 * @returns identificatore in formato UUID v4
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
 * Percentuale complessiva (0-100) di un file.
 * Senza tracking dello storage (`storage` assente) il caricamento dal browser copre 0-100;
 * con tracking copre 0-50 e lo storage 50-100 (`storage.progress` da 0 a 1).
 *
 * @param browserProgress - progresso del caricamento dal browser (0-1)
 * @param storage - stato dello storage (presente solo con event bus)
 * @returns percentuale intera 0-100
 */
export function mapProgress(browserProgress: number, storage?: IStorageFileStatus): number {
  const browser = Math.min(1, Math.max(0, browserProgress || 0))
  if (!storage) return Math.round(browser * 100)
  if (storage.status === 'done') return 100
  if (storage.progress > 0) return 50 + Math.round(Math.min(1, storage.progress) * 50)
  return Math.round(browser * 50)
}

/**
 * Clona (shallow) le props del `QUploader`, cosi' i wrapper di callback e `headers` non mutano l'oggetto del chiamante.
 * E' uno snapshot: modifiche successive all'oggetto originale (es. `url`) non vengono propagate.
 *
 * @param props - props originali
 * @returns copia
 */
export function cloneUploaderProps(props: Partial<QUploaderProps>): Partial<QUploaderProps> {
  return { ...props }
}

/**
 * Converte il valore di un `extraParams` nel valore testuale di un campo multipart.
 * `null`/`undefined` (e funzioni/simboli) -> `undefined` (campo omesso); stringhe invariate; number/boolean/bigint con `String`;
 * `Date` in ISO 8601; array e oggetti in JSON.
 *
 * @param value - valore del parametro
 * @returns stringa da inviare o `undefined` se il campo va omesso
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

/** Elenco di header come accettato dal `QUploader`. */
export type UploaderHeaders = { name: string, value: string }[]

/**
 * Normalizza gli header: un array statico oppure una funzione valutata a ogni richiesta.
 *
 * @param headers - array o funzione che lo restituisce
 * @returns valore per la prop `headers` del `QUploader`
 */
export function resolveHeaders(headers: UploaderHeaders | (() => UploaderHeaders)): UploaderHeaders | (() => UploaderHeaders) {
  return typeof headers === 'function' ? () => headers() : headers
}

/**
 * Costruisce la mappa `metadata` inviata al server, indicizzata per nome file (contratto storico).
 * Se piu' file della stessa richiesta hanno lo stesso nome, i successivi al primo usano la propria chiave univoca
 * (`__key`) per non sovrascrivere i metadati.
 *
 * @param files - file della richiesta (`name` e `__key`)
 * @param metadata - metadati per `__key`
 * @returns mappa nome (o chiave) -> metadati
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
 * Sceglie la chiave del file a cui assegnare un messaggio di progresso, dato il nome file.
 * Con nomi duplicati preferisce il primo file non ancora concluso.
 *
 * @param keys - chiavi dei file con quel nome, in ordine di aggiunta
 * @param isFinished - true se lo storage di quella chiave e' concluso (done/error)
 * @returns chiave scelta o undefined
 */
export function pickKeyForFilename(keys: readonly string[] | undefined, isFinished: (key: string) => boolean): string | undefined {
  if (!keys || keys.length === 0) return undefined
  return keys.find(k => !isFinished(k)) ?? keys[keys.length - 1]
}

/**
 * Applica ai file il nome scelto dall'utente (campo `nameKey` dei metadati) come nome effettivo della parte
 * multipart: il `QUploader` invia `form.append(fieldName, file, file.name)`, quindi `name` viene ridefinito
 * sull'istanza (proprieta' propria) e il server riceve lo stesso nome del metadato `filename` e della chiave di `metadata`.
 * Il nome originale e' conservato in `__originalName`: ripristinando il valore originale il nome torna quello del file.
 * Un nome vuoto (o solo spazi) o contenente `/` o `\` viene ignorato e si usa l'originale.
 *
 * @param files - file della richiesta
 * @param metadata - metadati per `__key`
 * @param nameKey - campo dei metadati che contiene il nome (default `filename`)
 * @returns mappa `__key` -> nome applicato
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
