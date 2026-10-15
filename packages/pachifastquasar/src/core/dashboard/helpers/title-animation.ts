/** Animations available for the dashboard card title (`.pachi-dc-title`) on mouse hover. */
export const PACHI_TITLE_ANIMATIONS = [
  'rubber-band',
  'pulse',
  'shake',
  'wobble',
  'tada',
  'bounce',
  'none'
] as const

/** Name of a card title animation (`none` = no animation). */
export type PachiTitleAnimation = (typeof PACHI_TITLE_ANIMATIONS)[number]

/** CSS `animation` value of each animation (the `@keyframes` live in `scss/quasar-hacks.scss`). */
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
 * Normalizes the name of a title animation.
 *
 * @param value - value from configuration, `route.meta` or environment variable
 * @returns the valid name (case and spaces ignored) or `undefined` if absent or unknown
 */
export function resolveTitleAnimation(value: unknown): PachiTitleAnimation | undefined {
  if (typeof value !== 'string') return undefined
  const name = value.trim().toLowerCase()
  return (PACHI_TITLE_ANIMATIONS as readonly string[]).includes(name)
    ? (name as PachiTitleAnimation)
    : undefined
}

/**
 * CSS `animation` value of a title animation.
 *
 * @param name - animation name
 * @returns the value for the custom property `--pachi-dc-title-animation`
 */
export function titleAnimationCss(name: PachiTitleAnimation): string {
  return CSS_ANIMATIONS[name]
}
