/** Errore di sintassi degli argomenti da riga di comando. */
export class ArgvError extends Error {}

/** Flag con il nome e l'eventuale valore inline (`--flag=valore`). */
export interface SplitFlag {
  flag: string
  inline?: string
}

/**
 * Separa `--flag=valore` in flag e valore; gli argomenti senza `--` o senza `=` restano invariati.
 *
 * @param arg - argomento grezzo
 */
export function splitFlag(arg: string): SplitFlag {
  if (!arg.startsWith('--')) return { flag: arg }
  const eq = arg.indexOf('=')
  if (eq === -1) return { flag: arg }
  return { flag: arg.slice(0, eq), inline: arg.slice(eq + 1) }
}

/**
 * Cursore sugli argomenti: restituisce il valore di un flag (inline o argomento successivo).
 * Il valore successivo non può iniziare con `-` (si userebbe per sbaglio un altro flag): per valori
 * che iniziano con `-` si usa la forma `--flag=valore`.
 */
export class ArgvCursor {
  index = 0

  constructor(readonly argv: readonly string[]) {}

  /** `true` finché ci sono argomenti da leggere. */
  get hasNext(): boolean {
    return this.index < this.argv.length
  }

  /** Legge l'argomento corrente e avanza. */
  next(): string {
    return this.argv[this.index++] as string
  }

  /**
   * Valore del flag corrente.
   *
   * @param split - flag già separato da {@link splitFlag}
   * @throws ArgvError se il valore manca o sembra un altro flag
   */
  value(split: SplitFlag): string {
    if (split.inline !== undefined) {
      if (split.inline === '') throw new ArgvError(`L'opzione ${split.flag} richiede un valore.`)
      return split.inline
    }
    const candidate = this.argv[this.index]
    if (candidate === undefined || candidate.startsWith('-')) {
      throw new ArgvError(`L'opzione ${split.flag} richiede un valore (usa ${split.flag}=<valore> se inizia con "-").`)
    }
    this.index++
    return candidate
  }
}

/**
 * Converte il valore di `--order` in numero finito.
 *
 * @param value - testo ricevuto
 * @throws ArgvError se non è un numero
 */
export function parseOrder(value: string): number {
  const parsed = value.trim() === '' ? Number.NaN : Number(value)
  if (!Number.isFinite(parsed)) throw new ArgvError(`Valore non valido per --order: "${value}" (atteso un numero).`)
  return parsed
}
