import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** Nome dei file che nel template non possono chiamarsi come devono (npm non pubblica i `.gitignore`). */
const RENAMED_FILES: Record<string, string> = { _gitignore: '.gitignore' }

/** Estensioni dei file binari del template (favicon, icone): copiati byte per byte, senza segnaposto. */
const BINARY_EXTENSIONS = new Set(['.png', '.ico'])

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g

/**
 * Cartella dei template dell'app (`templates/app` nel package, accanto a `dist/` e `src/`).
 *
 * @throws Error se la cartella non esiste (installazione corrotta)
 */
export function appTemplateDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  for (const candidate of [path.join(here, '..', 'templates', 'app'), path.join(here, '..', '..', 'templates', 'app')]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error('Cartella dei template (templates/app) non trovata: reinstalla @ilpachi/pachifq.')
}

/**
 * Sostituisce i segnaposto `{{nome}}` con i valori forniti.
 *
 * @param content - testo del template
 * @param vars - valori dei segnaposto
 * @throws Error se il template usa un segnaposto non definito
 */
export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = vars[key]
    if (value === undefined) throw new Error(`Segnaposto sconosciuto nel template: {{${key}}}`)
    return value
  })
}

/**
 * Elenca ricorsivamente i file di una cartella (percorsi relativi, separatore `/`, in ordine alfabetico).
 *
 * @param dir - cartella da leggere
 * @param base - prefisso relativo (uso interno)
 */
export async function listTemplateFiles(dir: string, base = ''): Promise<string[]> {
  const result: string[] = []
  const entries = (await readdir(path.join(dir, base), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) result.push(...(await listTemplateFiles(dir, rel)))
    else result.push(rel)
  }
  return result
}

/**
 * Percorso di un file del template nel progetto generato (`_gitignore` diventa `.gitignore`).
 *
 * @param rel - percorso relativo nel template, separatore `/`
 */
export function outputPathOf(rel: string): string {
  const segments = rel.split('/')
  const last = segments[segments.length - 1] as string
  segments[segments.length - 1] = RENAMED_FILES[last] ?? last
  return segments.join('/')
}

/**
 * Copia i template nella cartella di destinazione sostituendo i segnaposto nei file di testo (i file `.png`/`.ico`
 * sono copiati senza modifiche). `_gitignore` diventa `.gitignore`.
 *
 * @param sourceDir - cartella dei template
 * @param targetDir - cartella del progetto
 * @param vars - valori dei segnaposto
 * @returns i percorsi (relativi) scritti
 */
export async function writeTemplates(sourceDir: string, targetDir: string, vars: Record<string, string>): Promise<string[]> {
  const files = await listTemplateFiles(sourceDir)
  const written: string[] = []
  for (const rel of files) {
    const outRel = outputPathOf(rel)
    const last = outRel.split('/').pop() as string
    const outPath = path.join(targetDir, ...outRel.split('/'))
    await mkdir(path.dirname(outPath), { recursive: true })
    const sourcePath = path.join(sourceDir, ...rel.split('/'))
    if (BINARY_EXTENSIONS.has(path.extname(last).toLowerCase())) await writeFile(outPath, await readFile(sourcePath))
    else await writeFile(outPath, renderTemplate(await readFile(sourcePath, 'utf-8'), vars), 'utf-8')
    written.push(outRel)
  }
  return written
}
