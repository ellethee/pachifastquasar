import type { OptionalPackageKey } from './app-package.js'

/** Code blocks of `src/boot/pachi.ts` for an optional package (empty if no injection is needed). */
interface BootBlock {
  /** Names added to the `@ilpachi/pachifastquasar` import (with a leading comma). */
  shellImports: string
  /** `import` lines added after the shell import. */
  imports: string
  /** Statements appended to the boot function (indented by 2 spaces). */
  setup: string
}

/**
 * Injections needed for the optional packages to work.
 *
 * - `profile`: the `/user/profile` route only shows a skeleton until the app calls
 *   `setPachiProfileUser` (the package does not know the app's auth).
 * - `settings` e `widgets`: no injection, they use the `useAlova` factory that the shell provides with
 *   `createPachiApp` (auth, token refresh and errors included).
 */
const BOOT_BLOCKS: Partial<Record<OptionalPackageKey, BootBlock>> = {
  profile: {
    shellImports: ', AuthManager',
    imports: "import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'\n",
    setup:
      '\n' +
      '  // Profile: the page reads the user from here (reactive: the auth store). With auth disabled\n' +
      '  // or without a session the user is null and the page stays empty.\n' +
      '  setPachiProfileUser(() => {\n' +
      '    const user = AuthManager.getInstance().userInfo\n' +
      '    return user ? { ...user, email: user.email ?? \'\' } : null\n' +
      '  })\n',
  },
}

/**
 * Values of the `{{bootShellImports}}`, `{{bootImports}}` e `{{bootSetup}}` placeholders of `src/boot/pachi.ts` for the chosen packages.
 *
 * @param extras - selected optional packages
 */
export function buildBootBlocks(extras: readonly OptionalPackageKey[]): { bootShellImports: string; bootImports: string; bootSetup: string } {
  const blocks = extras.map((key) => BOOT_BLOCKS[key]).filter((block): block is BootBlock => block !== undefined)
  return {
    bootShellImports: blocks.map((b) => b.shellImports).join(''),
    bootImports: blocks.map((b) => b.imports).join(''),
    bootSetup: blocks.map((b) => b.setup).join(''),
  }
}
