// Rigenera con vue-tsc SOLO i d.ts dei componenti SFC generici dell'area table e li sovrascrive in dist/.
// Perche': vite-plugin-dts emette per `PachiTable2` (generic `<T>`) una forma delle props/emits che vue-tsc
// nelle app consumatrici legge come `never` (`@pt2:*`, `@row-dblclick` non compilano). I d.ts di vue-tsc sono
// corretti per questo componente, ma NON vanno usati per tutto il kit: con `exactOptionalPropertyTypes`
// rompono PachiDatePicker per i consumatori. Chiamato dallo script `build` dopo `vite build`.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Radice del package. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** File `.d.ts` (relativi a `dist/`) da sostituire con l'output di vue-tsc. */
const targets = ['table/components/PachiTable2.vue.d.ts']

/**
 * Esegue vue-tsc in sola emissione di dichiarazioni verso una cartella temporanea.
 * @param outDir cartella di destinazione dei d.ts
 */
function emitDeclarations(outDir) {
  const bin = join(root, 'node_modules', '.bin', 'vue-tsc')
  const res = spawnSync(
    bin,
    ['--declaration', '--emitDeclarationOnly', '--noEmit', 'false', '--outDir', outDir, '-p', 'tsconfig.json'],
    { cwd: root, stdio: 'inherit' },
  )
  if (res.status !== 0) throw new Error(`vue-tsc ha fallito (exit ${res.status})`)
}

/** Punto di ingresso: emette in temp, copia i soli target in dist/, ripulisce. */
function main() {
  if (!existsSync(join(root, 'dist'))) throw new Error('dist/ non trovato: esegui prima `vite build`')
  const tmp = mkdtempSync(join(tmpdir(), 'pachi-kit-dts-'))
  try {
    emitDeclarations(tmp)
    for (const rel of targets) {
      const from = join(tmp, rel)
      const to = join(root, 'dist', rel)
      if (!existsSync(from)) throw new Error(`d.ts atteso non generato: ${rel}`)
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      console.log(`[emit-table-dts] ${rel} rigenerato con vue-tsc`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

main()
