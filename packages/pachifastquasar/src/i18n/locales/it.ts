/**
 * Messaggi italiani dell'app: lingua di riferimento (lo schema dei tipi deriva da questo file).
 * Le altre lingue (`en.ts`, ...) devono avere le stesse chiavi. Namespace: app, auth, menu,
 * dashboard, errors, common.
 *
 * - `auth`: pagina di login (`auth.login.*`).
 * - `menu`: menu account (voci predefinite, tooltip, intestazioni).
 * - `dashboard`: dashboard/hub, card e stato vuoto.
 * - `errors`: pagina 404 e dialog di errore HTTP.
 * - `common`: testi condivisi (navigazione, tema, stati).
 * - `app`: titoli/descrizioni delle route core (usati da `meta.titleKey` / `meta.descriptionKey`).
 */
export default {
  app: {
    routes: {
      login: {
        title: 'Login',
        description: 'Login alla piattaforma'
      }
    }
  },
  auth: {
    login: {
      meta: 'pachi / accesso',
      heading: 'Accedi al tuo account',
      subtitle: 'Inserisci le tue credenziali per accedere',
      username: 'Utente',
      password: 'Password',
      submit: 'Accedi',
      invalidCredentials: 'Credenziali non valide.',
      help: "Hai problemi? Contatta l'assistenza"
    },
    lock: {
      countdown: 'Account bloccato, riprova tra {time}'
    },
    mfa: {
      heading: 'Verifica in due passaggi',
      subtitle: "Inserisci il codice di 6 cifre dell'app di autenticazione, o un codice di backup",
      code: 'Codice',
      verify: 'Verifica',
      back: 'Indietro',
      codeInvalid: 'Codice non valido. Riprova.',
      tooManyAttempts: 'Troppi tentativi falliti. Riprova più tardi.',
      expired: 'La verifica è scaduta. Accedi di nuovo.',
      unlocked: "L'account è stato sbloccato. Accedi di nuovo."
    }
  },
  menu: {
    profile: 'Il Mio Profilo',
    profileCaption: 'Gestisci i tuoi dati personali',
    settings: 'Impostazioni',
    settingsCaption: 'Configura le tue preferenze',
    home: 'Home',
    homeCaption: 'Torna alla home page',
    databases: 'Databases',
    logout: 'Disconnetti',
    account: 'Menu Account'
  },
  dashboard: {
    emptyTitle: 'Boilerplate pronto',
    emptyDescription: 'Aggiungi nuove feature routes per popolare questa dashboard.',
    overviewCode: '00 · overview',
    overviewTitle: 'Overview',
    overviewSub: '· {count} sezioni',
    overviewDesc: 'Seleziona una sezione per iniziare.',
    sectionCode: 'sezione · {title}',
    sectionSub: '· {count} strumenti',
    backToParent: 'Torna a sezione superiore'
  },
  errors: {
    notFound: {
      title: 'Pagina non trovata',
      description: "L'URL richiesto non esiste.",
      back: '← Torna alla home'
    },
    http: {
      title: 'Error: {status} - {statusText}',
      generic: 'Si è verificato un errore imprevisto. Riprova più tardi.',
      tooManyRequests: 'Troppe richieste ravvicinate. Riprova tra qualche istante.'
    }
  },
  common: {
    goHome: 'Torna alla home',
    backTo: 'Torna a: {label}',
    switchToLight: 'Passa a tema chiaro',
    switchToDark: 'Passa a tema scuro',
    loading: 'Caricamento...',
    copy: 'copia',
    ok: 'OK',
    home: 'Home',
    parentLevel: 'Livello superiore',
    toggleTheme: 'Cambia tema chiaro/scuro'
  }
}
