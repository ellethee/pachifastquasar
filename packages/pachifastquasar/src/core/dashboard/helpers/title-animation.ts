/** Animazioni disponibili per il titolo delle card della dashboard (`.pachi-dc-title`) al passaggio del mouse. */
export const PACHI_TITLE_ANIMATIONS = [
  'rubber-band',
  'pulse',
  'shake',
  'wobble',
  'tada',
  'bounce',
  'none'
] as const

/** Nome di un'animazione del titolo delle card (`none` = nessuna animazione). */
export type PachiTitleAnimation = (typeof PACHI_TITLE_ANIMATIONS)[number]

/** Valore CSS `animation` di ciascuna animazione (le `@keyframes` stanno in `scss/quasar-hacks.scss`). */
const CSS_ANIMATIONS: Record<PachiTitleAnimation, string> = {
  'rubber-band': 'rubber-band 0.8s',
  pulse: 'pachi-pulse 0.6s ease-in-out',
  shake: 'pachi-shake 0.6s ease-in-out',
  wobble: 'pachi-wobble 0.8s ease-in-out',
  tada: 'pachi-tada 0.8s ease-in-out',
  bounce: 'pachi-bounce 0.7s ease-out',
  none: 'none'
}

/**
 * Normalizza il nome di un'animazione del titolo.
 *
 * @param value - valore da configurazione, `route.meta` o variabile d'ambiente
 * @returns il nome valido (maiuscole e spazi ignorati) o `undefined` se assente o sconosciuto
 */
export function resolveTitleAnimation(value: unknown): PachiTitleAnimation | undefined {
  if (typeof value !== 'string') return undefined
  const name = value.trim().toLowerCase()
  return (PACHI_TITLE_ANIMATIONS as readonly string[]).includes(name)
    ? (name as PachiTitleAnimation)
    : undefined
}

/**
 * Valore CSS `animation` di un'animazione del titolo.
 *
 * @param name - nome dell'animazione
 * @returns il valore per la custom property `--pachi-dc-title-animation`
 */
export function titleAnimationCss(name: PachiTitleAnimation): string {
  return CSS_ANIMATIONS[name]
}
