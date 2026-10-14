#!/usr/bin/env node
// @ts-check
/**
 * Release per-pacchetto del monorepo (versioni indipendenti, tag `<nome>@<versione>`).
 *
 * Uso: node scripts/release.mjs <nome> <patch|minor|major|x.y.z> [--dry-run]
 *
 * Passi: albero git pulito -> bump di `packages/<nome>/package.json` -> controlla che il CHANGELOG del pacchetto
 * abbia la sezione `## [x.y.z]` -> commit `chore(<nome>): release x.y.z` -> tag `<nome>@x.y.z`.
 * NON fa push e NON pubblica: `git push --follow-tags` avvia il workflow di release della CI, che pubblica.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

/**
 * Calcola la nuova versione.
 * @param {string} current Versione attuale (x.y.z).
 * @param {string} bump `patch`, `minor`, `major` oppure una versione esplicita.
 * @returns {string} La nuova versione.
 */
function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
  const [maj, min, pat] = current.split('.').map(Number)
  if (bump === 'major') return `${maj + 1}.0.0`
  if (bump === 'minor') return `${maj}.${min + 1}.0`
  if (bump === 'patch') return `${maj}.${min}.${pat + 1}`
  throw new Error(`Incremento non valido: ${bump}`)
}

/**
 * Esegue git e restituisce lo stdout.
 * @param {string[]} args Argomenti di git.
 * @returns {string} Output senza newline finale.
 */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

/** Punto di ingresso. */
function main() {
  const [name, bump, ...flags] = process.argv.slice(2)
  const dry = flags.includes('--dry-run')
  if (!name || !bump) throw new Error('Uso: release.mjs <nome> <patch|minor|major|x.y.z> [--dry-run]')
  const dir = `packages/${name}`
  if (!existsSync(`${dir}/package.json`)) throw new Error(`Pacchetto sconosciuto: ${name}`)
  if (git(['status', '--porcelain'])) throw new Error('Albero git non pulito')
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'))
  if (pkg.private) throw new Error(`${name} è privato`)
  const version = nextVersion(pkg.version, bump)
  const tag = `${name}@${version}`
  if (git(['tag', '-l', tag])) throw new Error(`Il tag ${tag} esiste già`)
  const changelog = readFileSync(`${dir}/CHANGELOG.md`, 'utf8')
  if (!changelog.includes(`## [${version}]`)) {
    throw new Error(`${dir}/CHANGELOG.md non ha la sezione "## [${version}]": aggiungila prima`)
  }
  if (!new RegExp(`^\\[${version.replace(/\./g, '\\.')}\\]: `, 'm').test(changelog)) {
    throw new Error(`${dir}/CHANGELOG.md non ha la riga di link "[${version}]: ...compare/${name}@<precedente>...${name}@${version}": aggiungila prima`)
  }
  console.log(`${pkg.name}: ${pkg.version} -> ${version} (tag ${tag})${dry ? ' [dry-run]' : ''}`)
  if (dry) return
  pkg.version = version
  writeFileSync(`${dir}/package.json`, JSON.stringify(pkg, null, 2) + '\n')
  const unreleased = new RegExp(`^(\\[Unreleased\\]: .*?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@)[^.]*\\.[^.]*\\.[^.]*(\\.\\.\\.HEAD)$`, 'm')
  if (unreleased.test(changelog)) {
    writeFileSync(`${dir}/CHANGELOG.md`, changelog.replace(unreleased, `$1${version}$2`))
    git(['add', `${dir}/CHANGELOG.md`])
  }
  git(['add', `${dir}/package.json`])
  git(['commit', '-m', `chore(${name}): release ${version}`])
  git(['tag', '-a', tag, '-m', tag])
  console.log(`Fatto. Pubblica con: git push --follow-tags`)
}

try {
  main()
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
