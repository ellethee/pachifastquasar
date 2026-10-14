import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** Files that cannot have their final name in the template (npm does not publish `.gitignore` files). */
const RENAMED_FILES: Record<string, string> = { _gitignore: '.gitignore' }

/** Extensions of the template's binary files (favicons, icons): copied byte by byte, without placeholders. */
const BINARY_EXTENSIONS = new Set(['.png', '.ico'])

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g

/**
 * App templates folder (`templates/app` in the package, next to `dist/` and `src/`).
 *
 * @throws Error if the folder does not exist (corrupted installation)
 */
export function appTemplateDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  for (const candidate of [path.join(here, '..', 'templates', 'app'), path.join(here, '..', '..', 'templates', 'app')]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error('Templates folder (templates/app) not found: reinstall @ilpachi/pachifq.')
}

/**
 * Replaces the `{{name}}` placeholders with the given values.
 *
 * @param content - template text
 * @param vars - placeholder values
 * @throws Error if the template uses an undefined placeholder
 */
export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = vars[key]
    if (value === undefined) throw new Error(`Unknown placeholder in the template: {{${key}}}`)
    return value
  })
}

/**
 * Recursively lists the files of a folder (relative paths, `/` separator, in alphabetical order).
 *
 * @param dir - folder to read
 * @param base - relative prefix (internal use)
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
 * Path of a template file in the generated project (`_gitignore` becomes `.gitignore`).
 *
 * @param rel - relative path in the template, `/` separator
 */
export function outputPathOf(rel: string): string {
  const segments = rel.split('/')
  const last = segments[segments.length - 1] as string
  segments[segments.length - 1] = RENAMED_FILES[last] ?? last
  return segments.join('/')
}

/**
 * Copies the templates to the target folder replacing the placeholders in text files (`.png`/`.ico` files
 * are copied unchanged). `_gitignore` becomes `.gitignore`.
 *
 * @param sourceDir - templates folder
 * @param targetDir - project folder
 * @param vars - placeholder values
 * @returns the (relative) paths written
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
