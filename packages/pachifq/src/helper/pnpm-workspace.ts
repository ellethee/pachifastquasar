/**
 * Contents of the generated app's `pnpm-workspace.yaml`: allowed build scripts (esbuild, Quasar
 * watcher), `shamefullyHoist` (like the boilerplate) and `minimumReleaseAgeExclude` for `@ilpachi/*` (pnpm 11
 * ignores by default versions published less than 24 hours ago and `pnpm add` would pick old versions).
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
