#!/usr/bin/env node
// @ts-check
/**
 * Compiles the shell global styles into `dist/styles.css` and copies the Sass sources into `dist/scss/`
 * (for the Quasar Sass variables and the configurable tokens: see README, Styles section).
 * Runs after `vite build` (which empties `dist/`).
 */
import { cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sass from 'sass-embedded'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCSS_DIR = path.join(ROOT, 'src', 'scss')
const DIST = path.join(ROOT, 'dist')

/** Compiles `src/scss/index.scss` and writes `dist/styles.css`; copies the sources into `dist/scss`. */
async function main() {
  await mkdir(DIST, { recursive: true })
  const result = await sass.compileAsync(path.join(SCSS_DIR, 'index.scss'), {
    style: 'compressed',
    silenceDeprecations: ['import']
  })
  await writeFile(path.join(DIST, 'styles.css'), result.css)
  await cp(SCSS_DIR, path.join(DIST, 'scss'), { recursive: true })
  console.log(`styles.css (${result.css.length} bytes) and scss/ written to dist/`)
}

await main()
