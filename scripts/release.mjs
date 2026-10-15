#!/usr/bin/env node
// @ts-check
/**
 * Per-package release of the monorepo (independent versions, tag `<name>@<version>`).
 *
 * Usage: node scripts/release.mjs <name> <patch|minor|major|x.y.z> [--dry-run]
 *
 * Steps: clean git tree -> bump `packages/<name>/package.json` -> check that the package CHANGELOG
 * has the `## [x.y.z]` section -> commit `chore(<name>): release x.y.z` -> tag `<name>@x.y.z`.
 * It does NOT push and does NOT publish: `git push --follow-tags` starts the CI release workflow, which publishes.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

/**
 * Computes the new version.
 * @param {string} current Current version (x.y.z).
 * @param {string} bump `patch`, `minor`, `major` or an explicit version.
 * @returns {string} The new version.
 */
function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
  const [maj, min, pat] = current.split('.').map(Number)
  if (bump === 'major') return `${maj + 1}.0.0`
  if (bump === 'minor') return `${maj}.${min + 1}.0`
  if (bump === 'patch') return `${maj}.${min}.${pat + 1}`
  throw new Error(`Invalid increment: ${bump}`)
}

/**
 * Runs git and returns stdout.
 * @param {string[]} args Git arguments.
 * @returns {string} Output without trailing newline.
 */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

/** Entry point. */
function main() {
  const [name, bump, ...flags] = process.argv.slice(2)
  const dry = flags.includes('--dry-run')
  if (!name || !bump) throw new Error('Usage: release.mjs <name> <patch|minor|major|x.y.z> [--dry-run]')
  const dir = `packages/${name}`
  if (!existsSync(`${dir}/package.json`)) throw new Error(`Unknown package: ${name}`)
  if (git(['status', '--porcelain'])) throw new Error('Git tree not clean')
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'))
  if (pkg.private) throw new Error(`${name} is private`)
  const version = nextVersion(pkg.version, bump)
  const tag = `${name}@${version}`
  if (git(['tag', '-l', tag])) throw new Error(`Tag ${tag} already exists`)
  const changelog = readFileSync(`${dir}/CHANGELOG.md`, 'utf8')
  if (!changelog.includes(`## [${version}]`)) {
    throw new Error(`${dir}/CHANGELOG.md does not have the section "## [${version}]": add it first`)
  }
  if (!new RegExp(`^\\[${version.replace(/\./g, '\\.')}\\]: `, 'm').test(changelog)) {
    throw new Error(`${dir}/CHANGELOG.md does not have the link line "[${version}]: ...compare/${name}@<previous>...${name}@${version}": add it first`)
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
  console.log(`Done. Publish with: git push --follow-tags`)
}

try {
  main()
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
