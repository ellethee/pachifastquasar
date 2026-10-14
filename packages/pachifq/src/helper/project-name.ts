import path from 'node:path'

/** Nome pacchetto ammesso: minuscole, cifre e trattini (come nei prompt di `pachifq create`). */
export const PACKAGE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/

/** Lunghezza massima di un nome pacchetto npm. */
export const PACKAGE_NAME_MAX = 214

/** Errore di validazione del nome progetto/pacchetto. */
export class ProjectNameError extends Error {}

/**
 * Trasforma un testo libero in uno slug (minuscole, cifre e trattini).
 *
 * @param input - nome progetto
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Trasforma uno slug in un nome leggibile ("my-app" -> "My App").
 *
 * @param input - nome progetto
 */
export function humanize(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Verifica il nome del pacchetto (`package.json#name` e nome cartella).
 *
 * @param value - nome da validare
 * @returns il messaggio d'errore, oppure `undefined` se valido
 */
export function packageNameError(value: string): string | undefined {
  if (!value || !PACKAGE_NAME_RE.test(value)) return 'Usa solo minuscole, cifre e trattini'
  if (value.length > PACKAGE_NAME_MAX) return `Al massimo ${PACKAGE_NAME_MAX} caratteri`
  return undefined
}

/**
 * Valida il nome progetto passato come argomento: non può essere un percorso (separatori, `.`, `..`),
 * perché la cartella deve essere creata nella directory corrente.
 *
 * @param name - argomento posizionale
 * @throws ProjectNameError se contiene separatori o segmenti `.`/`..`
 */
export function assertPlainProjectName(name: string): void {
  if (/[\\/]/.test(name) || name === '.' || name === '..' || name.split(/[\\/]/).includes('..')) {
    throw new ProjectNameError(
      `Nome progetto non valido: "${name}". Indica solo un nome (la cartella viene creata nella directory corrente), non un percorso.`,
    )
  }
  if (name.trim() === '') throw new ProjectNameError('Il nome del progetto non può essere vuoto.')
}

/**
 * Ricava il nome pacchetto dal nome progetto (modalità `--yes`): slug validato come nei prompt.
 *
 * @param projectName - nome progetto (già controllato con {@link assertPlainProjectName})
 * @throws ProjectNameError se lo slug è vuoto o non valido
 */
export function packageNameFromProject(projectName: string): string {
  const slug = slugify(projectName)
  const error = packageNameError(slug)
  if (error) throw new ProjectNameError(`Impossibile ricavare un nome pacchetto valido da "${projectName}": ${error}.`)
  return slug
}

/**
 * Cartella di destinazione: deve essere figlia diretta di `cwd`.
 *
 * @param cwd - directory corrente
 * @param packageName - nome pacchetto/cartella
 * @throws ProjectNameError se il percorso esce da `cwd`
 */
export function resolveTargetDir(cwd: string, packageName: string): string {
  const targetDir = path.resolve(cwd, packageName)
  const relative = path.relative(cwd, targetDir)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new ProjectNameError(`La cartella "${packageName}" deve restare dentro la directory corrente.`)
  }
  return targetDir
}
