/**
 * Contenuto di `pnpm-workspace.yaml` dell'app generata: build script consentiti (esbuild, watcher di
 * Quasar), `shamefullyHoist` (come il boilerplate) e `minimumReleaseAgeExclude` per `@ilpachi/*` (pnpm 11
 * ignora per default le versioni pubblicate da meno di 24 ore e `pnpm add` sceglierebbe versioni vecchie).
 */
export function buildPnpmWorkspace(): string {
  return `allowBuilds:
  '@parcel/watcher': true
  esbuild: true

onlyBuiltDependencies:
  - '@parcel/watcher'
  - esbuild

shamefullyHoist: true

minimumReleaseAgeExclude:
  - '@ilpachi/*'
`
}
