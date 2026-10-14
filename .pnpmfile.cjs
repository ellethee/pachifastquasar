// TypeScript 7 (native compiler) has no JS API, but some tools still need it:
// - `vue-tsc`, `@volar/typescript`, `@vue/language-core`: drive the compiler through it;
// - `vite-plugin-dts`/`unplugin-dts`, `vite-plugin-checker`: emit declarations / type-check;
// - `vue` (`vue/compiler-sfc/register-ts`, used by `@vitejs/plugin-vue`): resolves imported types in `defineProps`;
// - `@typescript-eslint/*` (via `@intlify/unplugin-vue-i18n`): parse TypeScript.
// These tools get the TS 6 build (`@typescript/typescript6`) as their own `typescript`, while the workspace
// (`tsc`, and `typescript` in the devDependencies of every package) uses TypeScript 7. Transition hook: remove it
// once these tools support TypeScript 7.
const NEEDS_TS_JS_API = new Set([
  'vue-tsc',
  '@volar/typescript',
  '@vue/language-core',
  'vite-plugin-dts',
  'unplugin-dts',
  'vite-plugin-checker',
  'vue',
  '@typescript-eslint/typescript-estree',
  '@typescript-eslint/project-service',
  '@typescript-eslint/tsconfig-utils',
])

function readPackage(pkg) {
  if (NEEDS_TS_JS_API.has(pkg.name)) {
    for (const field of ['peerDependencies', 'peerDependenciesMeta']) {
      if (pkg[field]) delete pkg[field].typescript
    }
    pkg.dependencies = { ...pkg.dependencies, typescript: 'npm:@typescript/typescript6@^6.0.2' }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
