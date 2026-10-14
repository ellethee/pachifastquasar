/** On Windows `pnpm`/`npm` are `.cmd` scripts: without a shell `spawn`/`execFile` fail. */
export const USE_SHELL = process.platform === 'win32'

/**
 * Prepares an argument for the Windows shell (cmd.exe), where `^`, `&` etc. are special;
 * on other systems the argument is left unchanged (no shell).
 *
 * @param arg - argument
 * @throws Error if it contains double quotes or control characters on Windows
 */
export function shellArg(arg: string): string {
  if (!USE_SHELL) return arg
  if (/["\r\n%]/.test(arg)) throw new Error(`Argument not allowed: ${arg}`)
  return `"${arg}"`
}
