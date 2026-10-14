import path from 'node:path'

/** Allowed package name: lowercase letters, digits and hyphens (as in the `pachifq create` prompts). */
export const PACKAGE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/

/** Maximum length of an npm package name. */
export const PACKAGE_NAME_MAX = 214

/** Project/package name validation error. */
export class ProjectNameError extends Error {}

/**
 * Turns free text into a slug (lowercase letters, digits and hyphens).
 *
 * @param input - project name
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Turns a slug into a readable name ("my-app" -> "My App").
 *
 * @param input - project name
 */
export function humanize(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Checks the package name (`package.json#name` and folder name).
 *
 * @param value - name to validate
 * @returns the error message, or `undefined` if valid
 */
export function packageNameError(value: string): string | undefined {
  if (!value || !PACKAGE_NAME_RE.test(value)) return 'Use only lowercase letters, digits and hyphens'
  if (value.length > PACKAGE_NAME_MAX) return `At most ${PACKAGE_NAME_MAX} characters`
  return undefined
}

/**
 * Validates the project name passed as an argument: it cannot be a path (separators, `.`, `..`),
 * because the folder must be created in the current directory.
 *
 * @param name - positional argument
 * @throws ProjectNameError if it contains separators or `.`/`..` segments
 */
export function assertPlainProjectName(name: string): void {
  if (/[\\/]/.test(name) || name === '.' || name === '..' || name.split(/[\\/]/).includes('..')) {
    throw new ProjectNameError(
      `Invalid project name: "${name}". Give only a name (the folder is created in the current directory), not a path.`,
    )
  }
  if (name.trim() === '') throw new ProjectNameError('The project name cannot be empty.')
}

/**
 * Derives the package name from the project name (`--yes` mode): slug validated as in the prompts.
 *
 * @param projectName - project name (already checked with {@link assertPlainProjectName})
 * @throws ProjectNameError if the slug is empty or invalid
 */
export function packageNameFromProject(projectName: string): string {
  const slug = slugify(projectName)
  const error = packageNameError(slug)
  if (error) throw new ProjectNameError(`Unable to derive a valid package name from "${projectName}": ${error}.`)
  return slug
}

/**
 * Target folder: it must be a direct child of `cwd`.
 *
 * @param cwd - current directory
 * @param packageName - package/folder name
 * @throws ProjectNameError if the path leaves `cwd`
 */
export function resolveTargetDir(cwd: string, packageName: string): string {
  const targetDir = path.resolve(cwd, packageName)
  const relative = path.relative(cwd, targetDir)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new ProjectNameError(`The folder "${packageName}" must stay inside the current directory.`)
  }
  return targetDir
}
