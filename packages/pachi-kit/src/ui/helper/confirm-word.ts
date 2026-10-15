/**
 * Checks that the typed text matches the confirmation word (exact comparison,
 * case included; leading/trailing spaces of the typed text are ignored).
 *
 * @param typed - text typed by the user
 * @param word - word to type
 * @returns true if the confirmation is valid (the word cannot be empty)
 */
export function matchesConfirmWord(typed: string, word: string): boolean {
  return word.length > 0 && typed.trim() === word
}

/**
 * Chooses the confirmation word: the custom one if it is not empty (nor only spaces),
 * otherwise the default one (an empty word would make confirmation impossible).
 *
 * @param custom - word passed by the app (may be empty or absent)
 * @param fallback - translated default word
 * @returns the word to use
 */
export function resolveConfirmWord(custom: string | undefined, fallback: string): string {
  return custom && custom.trim() ? custom : fallback
}
