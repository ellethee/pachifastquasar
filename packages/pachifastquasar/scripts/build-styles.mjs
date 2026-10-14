#!/usr/bin/env node
// @ts-check
/**
 * Compila gli stili globali della shell in `dist/styles.css` e copia i sorgenti Sass in `dist/scss/`
 * (per le variabili Sass di Quasar e i token configurabili: vedi README, sezione Stili).
 * Si esegue dopo `vite build` (che svuota `dist/`).
 */
import { cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sass from 'sass-embedded'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCSS_DIR = path.join(ROOT, 'src', 'scss')
const DIST = path.join(ROOT, 'dist')

/** Compila `src/scss/index.scss` e scrive `dist/styles.css`; copia i sorgenti in `dist/scss`. */
async function main() {
  await mkdir(DIST, { recursive: true })
  const result = await sass.compileAsync(path.join(SCSS_DIR, 'index.scss'), {
    style: 'compressed',
    silenceDeprecations: ['import']
  })
  await writeFile(path.join(DIST, 'styles.css'), result.css)
  await cp(SCSS_DIR, path.join(DIST, 'scss'), { recursive: true })
  console.log(`styles.css (${result.css.length} byte) e scss/ scritti in dist/`)
}

await main()
