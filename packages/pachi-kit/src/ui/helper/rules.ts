/** Validation rule like those of `q-input`: returns `true` if valid, otherwise `false` or the error message. */
export type PachiRule = (val: string | number | null | undefined) => boolean | string

/**
 * Tells whether a value satisfies all the (synchronous) rules, with the same semantics as `q-input`:
 * only a `false` result or a string (error message) is invalid; `true`, `undefined`,
 * `null` and a non-synchronous result (Promise, ignored) are valid.
 *
 * @param rules - validation rules
 * @param value - value to check
 * @returns true if all rules are satisfied
 */
export function passesRules(rules: readonly PachiRule[] | undefined, value: string | number | null | undefined): boolean {
  return (rules ?? []).every((rule) => {
    const result: unknown = rule(value)
    return !(result === false || typeof result === 'string')
  })
}
