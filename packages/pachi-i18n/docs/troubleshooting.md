# Troubleshooting

**`@`, `{`, `}` or `|` in a message break compilation or print oddly.**
They are special characters in vue-i18n messages. Escape them as literals: `{'@'}`, `{'{'}`, `{'}'}`, `{'|'}`.

**Messages are not compiled at runtime, or warnings about the message compiler.**
Set `runtimeOnly: false` in `@intlify/unplugin-vue-i18n`, because messages are TypeScript objects, not precompiled
resources.

**In Vite dev, duplicated copies of `quasar` or `vue`.**
Symptoms: "Quasar not installed" or components that do not render. The package components use the `$q` and the Quasar
instance of the app. Make Vite resolve a single copy, for example with
`resolve.dedupe: ['vue', 'vue-i18n', 'quasar']`, and exclude the package from pre-bundling when linking it locally.

**`@ilpachi/pachi-i18n: call createPachiI18n() ... before using it`.**
`useLocale`, `usePachiI18n` or `PachiLocaleSwitcher` ran before the boot file created the instance. Install
`createPachiI18n` first (`pachiT` just returns the key in that case).

**A package language does not appear in the switcher.**
Only languages in the app `messages` are offered. Add at least a (possibly partial) file for that language in the app.

**The language does not persist.**
`localStorage` may be unavailable (private mode); the choice then lasts only for the session. With `fixedLocale`
nothing is persisted by design.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Publishing is done with `npm publish`, not `pnpm publish`.
