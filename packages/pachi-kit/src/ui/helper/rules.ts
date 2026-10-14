/** Regola di validazione come quelle di `q-input`: restituisce `true` se valido, altrimenti `false` o il messaggio d'errore. */
export type PachiRule = (val: string | number | null | undefined) => boolean | string

/**
 * Indica se un valore rispetta tutte le regole (sincrone), con la stessa semantica di `q-input`:
 * e' non valido solo un risultato `false` o una stringa (messaggio d'errore); `true`, `undefined`,
 * `null` e un risultato non sincrono (Promise, ignorato) sono validi.
 *
 * @param rules - regole di validazione
 * @param value - valore da verificare
 * @returns true se tutte le regole sono soddisfatte
 */
export function passesRules(rules: readonly PachiRule[] | undefined, value: string | number | null | undefined): boolean {
  return (rules ?? []).every((rule) => {
    const result: unknown = rule(value)
    return !(result === false || typeof result === 'string')
  })
}
