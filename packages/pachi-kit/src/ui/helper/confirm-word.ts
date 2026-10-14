/**
 * Verifica che il testo digitato corrisponda alla parola di conferma (confronto esatto,
 * maiuscole/minuscole comprese; gli spazi ai bordi del testo digitato sono ignorati).
 *
 * @param typed - testo digitato dall'utente
 * @param word - parola da digitare
 * @returns true se la conferma è valida (la parola non può essere vuota)
 */
export function matchesConfirmWord(typed: string, word: string): boolean {
  return word.length > 0 && typed.trim() === word
}

/**
 * Sceglie la parola di conferma: quella personalizzata se non e' vuota (ne' di soli spazi),
 * altrimenti quella di default (una parola vuota renderebbe la conferma impossibile).
 *
 * @param custom - parola passata dall'app (puo' essere vuota o assente)
 * @param fallback - parola di default tradotta
 * @returns la parola da digitare
 */
export function resolveConfirmWord(custom: string | undefined, fallback: string): string {
  return custom && custom.trim() ? custom : fallback
}
