/** Su Windows `pnpm`/`npm` sono script `.cmd`: senza shell `spawn`/`execFile` falliscono. */
export const USE_SHELL = process.platform === 'win32'

/**
 * Prepara un argomento per la shell di Windows (cmd.exe), dove `^`, `&` ecc. sono speciali;
 * sugli altri sistemi l'argomento resta invariato (nessuna shell).
 *
 * @param arg - argomento
 * @throws Error se contiene apici doppi o caratteri di controllo su Windows
 */
export function shellArg(arg: string): string {
  if (!USE_SHELL) return arg
  if (/["\r\n%]/.test(arg)) throw new Error(`Argomento non ammesso: ${arg}`)
  return `"${arg}"`
}
