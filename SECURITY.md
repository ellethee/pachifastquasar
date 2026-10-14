# Security Policy

## Supported versions

Security fixes are provided for the latest minor release of each `@ilpachi/*` package. These packages are in beta: please upgrade to the latest version before reporting.

## Reporting a vulnerability

Do not open a public issue. Email **ilpachi@ilpachi.it** with a description, affected package and version, and steps to reproduce. You can expect an acknowledgement within a few days. We follow responsible disclosure: please give us a reasonable time to fix the issue before publishing details, and we will credit you if you wish.

## Security-relevant design notes

The following topics are not yet fully documented and will be described in the package docs:

- **Token storage**: where the shell stores access/refresh tokens in the browser and the implications for XSS.
- **Content Security Policy**: which directives an app using the shell should configure.
- **Gravatar**: avatars are initials-only by default; if you opt in (`app.gravatar: true`) the shell requests images from Gravatar, which exposes a hash of the user's email to that third party.
