// Regenerates with vue-tsc ONLY the d.ts of the generic SFC components of the table area and overwrites them in dist/.
// Why: vite-plugin-dts emits for `PachiTable2` (generic `<T>`) a props/emits shape that vue-tsc
// in consuming apps reads as `never` (`@pt2:*`, `@row-dblclick` do not compile). The vue-tsc d.ts are
// correct for this component, but must NOT be used for the whole kit: with `exactOptionalPropertyTypes`
// they break PachiDatePicker for consumers. Called by the `build` script after `vite build`.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Package root. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** `.d.ts` files (relative to `dist/`) to replace with the vue-tsc output. */
const targets = ['table/components/PachiTable2.vue.d.ts']

/**
 * Runs vue-tsc in declaration-only emit mode into a temporary folder.
 * @param outDir destination folder of the d.ts files
 */
function emitDeclarations(outDir) {
  const bin = join(root, 'node_modules', '.bin', 'vue-tsc')
  const res = spawnSync(
    bin,
    ['--declaration', '--emitDeclarationOnly', '--noEmit', 'false', '--outDir', outDir, '--rootDir', 'src', '-p', 'tsconfig.json'],
    { cwd: root, stdio: 'inherit' },
  )
  if (res.status !== 0) throw new Error(`vue-tsc failed (exit ${res.status})`)
}

/** Entry point: emits to temp, copies only the targets into dist/, cleans up. */
function main() {
  if (!existsSync(join(root, 'dist'))) throw new Error('dist/ not found: run `vite build` first')
  const tmp = mkdtempSync(join(tmpdir(), 'pachi-kit-dts-'))
  try {
    emitDeclarations(tmp)
    for (const rel of targets) {
      const from = join(tmp, rel)
      const to = join(root, 'dist', rel)
      if (!existsSync(from)) throw new Error(`expected d.ts not generated: ${rel}`)
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      console.log(`[emit-table-dts] ${rel} regenerated with vue-tsc`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

main()
