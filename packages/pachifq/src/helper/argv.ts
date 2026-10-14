/** Command-line argument syntax error. */
export class ArgvError extends Error {}

/** Flag with its name and the optional inline value (`--flag=value`). */
export interface SplitFlag {
  flag: string
  inline?: string
}

/**
 * Splits `--flag=value` into flag and value; arguments without `--` or without `=` stay unchanged.
 *
 * @param arg - raw argument
 */
export function splitFlag(arg: string): SplitFlag {
  if (!arg.startsWith('--')) return { flag: arg }
  const eq = arg.indexOf('=')
  if (eq === -1) return { flag: arg }
  return { flag: arg.slice(0, eq), inline: arg.slice(eq + 1) }
}

/**
 * Cursor over the arguments: returns the value of a flag (inline or next argument).
 * The next value cannot start with `-` (another flag would be used by mistake): for values
 * that start with `-` use the `--flag=value` form.
 */
export class ArgvCursor {
  index = 0

  constructor(readonly argv: readonly string[]) {}

  /** `true` while there are arguments left to read. */
  get hasNext(): boolean {
    return this.index < this.argv.length
  }

  /** Reads the current argument and advances. */
  next(): string {
    return this.argv[this.index++] as string
  }

  /**
   * Value of the current flag.
   *
   * @param split - flag already split by {@link splitFlag}
   * @throws ArgvError if the value is missing or looks like another flag
   */
  value(split: SplitFlag): string {
    if (split.inline !== undefined) {
      if (split.inline === '') throw new ArgvError(`The ${split.flag} option requires a value.`)
      return split.inline
    }
    const candidate = this.argv[this.index]
    if (candidate === undefined || candidate.startsWith('-')) {
      throw new ArgvError(`The ${split.flag} option requires a value (use ${split.flag}=<value> if it starts with "-").`)
    }
    this.index++
    return candidate
  }
}

/**
 * Converts the value of `--order` to a finite number.
 *
 * @param value - received text
 * @throws ArgvError if it is not a number
 */
export function parseOrder(value: string): number {
  const parsed = value.trim() === '' ? Number.NaN : Number(value)
  if (!Number.isFinite(parsed)) throw new ArgvError(`Invalid value for --order: "${value}" (a number was expected).`)
  return parsed
}
