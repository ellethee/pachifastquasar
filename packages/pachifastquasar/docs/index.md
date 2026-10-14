---
template: home.html
hide:
  - navigation
  - toc
---

# Pachi Fast Quasar

`@ilpachi/pachifastquasar` is an application shell for **Vue 3** and **Quasar**, distributed as an npm
package. It provides everything a business application needs before the first feature is written:

- a main layout with app bar, breadcrumbs, theme toggle and account menu;
- optional authentication with silent session restore and per-route authorization;
- a dashboard of cards generated from the route tree;
- internationalization (Italian and English included);
- an HTTP client already wired to authentication, spinner and error messages;
- a Quasar config preset and a scaffolding CLI.

A derived application contains its own features (`src/features/**`) and a handful of configuration lines. New
vertical features always live in the application, never in the package.

## How the pieces fit

```text
your app
  quasar.config.ts        definePachiQuasarConfig()        (package: ./quasar entry)
  src/pachi-config.ts     definePachiConfig(base, env)     (runtime configuration)
  src/boot/pachi.ts       createPachiApp(ctx, { ... })     (config, HTTP client, i18n)
  src/router/index.ts     createPachiRouter({ ... })       (routes, menus, navigation guard)
  src/features/**         routes.ts, pages, locales        (your code)
```

The package never imports files of the application: everything that depends on the application tree
(`import.meta.glob` results, `import.meta.env`) is passed in by the application.

## Where to go next

| If you want to...                          | Read                                                |
| ------------------------------------------ | --------------------------------------------------- |
| create or wire an application              | [Getting started](getting-started.md)               |
| change titles, logo, auth, dashboard       | [Configuration](configuration.md)                   |
| add pages and menu entries                 | [Routing and menus](routing-and-menus.md)           |
| understand login and permissions           | [Authentication](authentication.md)                 |
| call the backend                           | [HTTP client](http-client.md)                       |
| add a language or translate backend errors | [Internationalization](i18n.md)                     |
| change colors, logo and favicon            | [Theming and styles](theming-and-styles.md)         |
| build a compatible backend                 | [Backend contract](backend-contract.md)             |
| find companion packages                    | [Packages](packages.md)                             |

## Package entry points

| Import path                           | Content                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `@ilpachi/pachifastquasar`            | public API: bootstrap, config, router, components, services, types            |
| `@ilpachi/pachifastquasar/quasar`     | separate Node build with `definePachiQuasarConfig` (does not import Vue)      |
| `@ilpachi/pachifastquasar/styles.css` | compiled global styles                                                        |
| `@ilpachi/pachifastquasar/scss/*`     | Sass sources (`quasar-variables`, `tokens`, `app`, ...)                       |

## Requirements

Node.js 20 or newer, pnpm 10 or newer, Quasar CLI with `@quasar/app-vite` v3. The peer dependencies (`vue`,
`vue-router`, `quasar`, `@quasar/extras`, `pinia`, `pinia-plugin-persistedstate`, `vue-i18n`, `alova`,
`@ilpachi/use-alova`, `@ilpachi/pachi-i18n`) are installed by the application so that each stays a singleton. `pinia` accepts `^3.0.0 || ^4.0.0`; Pinia 4 also
needs `@vue/devtools-api` (`^8.1.5`) as a peer (pnpm and npm install it automatically).
