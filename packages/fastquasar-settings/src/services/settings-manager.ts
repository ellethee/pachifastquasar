import { getPachiSettingsOptions, type IPachiSettingsHttp } from '../helpers/http'
import { useSettingsStore } from './settings-store'
import type { ISettingsSchemaResponse, IUserSettings, IUserSettingsResponse, SettingValue } from '../types/settings-manager'
import { computed, watch, type ComputedRef, type WatchStopHandle } from 'vue'
import { quasarDeps, showNotify } from '../helpers/quasar-instance'
import { pachiT } from '@ilpachi/pachi-i18n'
import { resolveSettingsAction } from '../helpers/actions'
import { resolveWatchTargets } from '../helpers/watch'
import { applyKey, collectApplyMap, type SettingsApplyMap } from '../helpers/apply'
import { resolveFieldDefault } from '../helpers/defaults'
import { resetSettingsAppliers, runSettingsApplier, type SettingsApplySource } from './appliers'
import { readSettingsCache, writeSettingsCache } from './settings-cache'
type ReactiveSection<T extends Record<string, unknown>> = {
  [K in keyof T]: ComputedRef<T[K]>
}
/**
 * Gestisce impostazioni utente e schema: li carica dal backend, li salva (PUT) e
 * li espone in forma reattiva. Client HTTP e stato di autenticazione sono iniettati
 * tramite `setPachiSettingsOptions`. Con `installPachiSettings()` il caricamento al login e la pulizia al logout
 * sono automatici (evento `pachi:auth-changed` della shell); altrimenti chiamare `loadSettings()` dopo il login
 * e `clearSettings()` al logout.
 *
 * I campi dello schema con `apply` (tema, accent, densità, lingua, ...) sono applicati con gli applier registrati
 * (`registerSettingsApplier`) al caricamento, a ogni `set()` e al boot dalla cache per utente.
 */
export class SettingsManager {
  private static instance: SettingsManager
  private store: ReturnType<typeof useSettingsStore>
  /** Client HTTP risolto a ogni richiesta (così usa quello fornito dall'app anche se catturato dopo la creazione). */
  private get alova(): IPachiSettingsHttp {
    return getPachiSettingsOptions().getHttp()
  }
  private watchStopHandles: WatchStopHandle[] = []
  private lastSchema: ISettingsSchemaResponse = {}
  /** Salvataggi in attesa (debounce) per `categoria/chiave`. */
  private pending = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; prev: unknown; value: SettingValue; category: string; key: string }
  >()
  /** Salvataggi in corso per `categoria/chiave`: i PUT della stessa chiave partono uno alla volta, nell'ordine. */
  private inflight = new Map<string, Promise<void>>()
  private constructor() {
    this.store = useSettingsStore()
    SettingsManager.instance = this
    // scheda nascosta o chiusa: i salvataggi ancora nel debounce partono subito (altrimenti la modifica andrebbe persa)
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.flushAll()
      })
    }
  }
  /** Stato di autenticazione notificato dagli eventi della shell (`unknown` = non ancora noto). */
  private authState: 'unknown' | 'in' | 'out' = 'unknown'
  /** Identificativo dell'utente corrente (chiave della cache), `null` se sconosciuto. */
  private userKey: string | null = null
  /** Incrementato a ogni pulizia/cambio utente: le risposte in volo di un utente precedente sono scartate. */
  private epoch = 0
  /** Campi con applier (`categoria.campo` -> nome), dallo schema o dalla cache. */
  private applyMap: SettingsApplyMap = {}
  /** Caricamento in corso o concluso per l'utente corrente. */
  private loadPromise: Promise<IUserSettingsResponse> | null = null
  private get isAuthenticated(): boolean {
    if (this.authState === 'in') return true
    if (this.authState === 'out') return false
    return getPachiSettingsOptions().isAuthenticated()
  }
  public get userSettings() {
    return this.store.userSettings
  }
  public set userSettings(value) {
    this.store.userSettings = value
  }
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager()
    }
    return SettingsManager.instance
  }
  /** Ultimo schema caricato (vuoto prima del primo caricamento). */
  public get schema(): ISettingsSchemaResponse {
    return this.lastSchema
  }
  /**
   * Carica impostazioni e schema con una sola richiesta ciascuno, avvia i watcher dello schema, applica i campi con
   * `apply` e aggiorna la cache dell'utente. Dopo la chiamata lo schema è disponibile in {@link SettingsManager.schema}.
   */
  public loadSettings(): Promise<IUserSettingsResponse> {
    const promise = this.doLoad()
    this.loadPromise = promise
    // un caricamento fallito non resta in cache: il prossimo `ensureLoaded` riprova
    promise.catch(() => {
      if (this.loadPromise === promise) this.loadPromise = null
    })
    return promise
  }
  /**
   * Come {@link SettingsManager.loadSettings} ma riusa il caricamento già avviato o concluso per l'utente corrente
   * (es. quello partito al login): la pagina impostazioni non ricarica a ogni apertura.
   */
  public ensureLoaded(): Promise<IUserSettingsResponse> {
    return this.loadPromise ?? this.loadSettings()
  }
  private async doLoad(): Promise<IUserSettingsResponse> {
    if (!this.isAuthenticated) {
      console.warn('User is not authenticated. Cannot load settings.')
      return {}
    }
    this.userKey ??= userKeyOf(getPachiSettingsOptions().getUser?.())
    const epoch = this.epoch
    const [response, schema] = await Promise.all([
      this.alova.Get<IUserSettingsResponse>('/user/settings'),
      this.fetchSchema(),
    ])
    // logout o cambio utente durante la richiesta: la risposta non è più dell'utente corrente
    if (epoch !== this.epoch) return {}
    this.lastSchema = schema
    this.applyMap = collectApplyMap(schema)
    this.store.userSettings = response
    this.setupSchemaWatchers(schema)
    this.applyAll('load')
    this.writeCache()
    return response
  }
  public async loadSettingsSchema(): Promise<ISettingsSchemaResponse> {
    if (!this.isAuthenticated) {
      console.warn('User is not authenticated. Cannot load settings schema.')
      return {}
    }
    const epoch = this.epoch
    const schema = await this.fetchSchema()
    if (epoch !== this.epoch) return {}
    this.lastSchema = schema
    this.applyMap = collectApplyMap(schema)
    this.setupSchemaWatchers(schema)
    return schema
  }
  private fetchSchema(): Promise<ISettingsSchemaResponse> {
    return Promise.resolve(this.alova.Get<ISettingsSchemaResponse>('/user/settings/schema'))
  }

  /**
   * Prepara l'utente al boot (prima del login/ripristino): ricorda la chiave e applica la cache salvata per lui,
   * così tema, lingua, ecc. sono corretti prima della risposta del backend (nessun flash).
   *
   * @param userKey - identificativo dell'utente (id o username)
   */
  public primeUser(userKey: string): void {
    if (this.userKey === userKey) return
    if (this.userKey !== null) this.clearSettings()
    this.userKey = userKey
    this.applyCache()
  }
  /**
   * Utente autenticato (evento `pachi:auth-changed`): con un utente diverso dal precedente scarta le impostazioni
   * dell'altro, applica la cache del nuovo e carica dal backend. Con lo stesso utente già caricato non rifà nulla.
   *
   * @param userKey - identificativo dell'utente (id o username)
   */
  public async activateUser(userKey: string): Promise<void> {
    this.authState = 'in'
    this.primeUser(userKey)
    try {
      await this.ensureLoaded()
    } catch (e) {
      console.warn('SettingsManager: caricamento delle impostazioni non riuscito', e)
    }
  }
  /** Sessione terminata (evento `pachi:auth-changed` senza utente): svuota tutto e riporta gli applier al default. */
  public deactivateUser(): void {
    this.authState = 'out'
    this.clearSettings()
  }
  /** Applica la cache dell'utente corrente (se esiste) e ne adotta la mappa degli applier. */
  private applyCache(): void {
    if (!this.userKey) return
    const cache = readSettingsCache(this.userKey)
    if (!cache) return
    this.applyMap = cache.apply
    for (const [key, value] of Object.entries(cache.values)) {
      const [category, field] = splitKey(key)
      this.store.setValue(category, field, value)
      const name = cache.apply[key]
      if (name) runSettingsApplier(name, value, { category, key: field, source: 'cache' })
    }
  }
  /** Esegue gli applier di tutti i campi con `apply` che hanno un valore. */
  private applyAll(source: SettingsApplySource): void {
    for (const key of Object.keys(this.applyMap)) {
      const [category, field] = splitKey(key)
      this.applyField(category, field, source)
    }
  }
  /** Esegue l'applier del campo (se ne ha uno e il valore è noto). */
  private applyField(category: string, key: string, source: SettingsApplySource): void {
    const name = this.applyMap[applyKey(category, key)]
    if (!name) return
    const value = this.store.getValue(category, key)
    if (value === undefined) return
    runSettingsApplier(name, value, { category, key, source })
  }
  /** Salva nella cache dell'utente corrente i valori dei campi con `apply`. */
  private writeCache(): void {
    if (!this.userKey) return
    const apply: SettingsApplyMap = {}
    const values: Record<string, unknown> = {}
    for (const [key, name] of Object.entries(this.applyMap)) {
      const [category, field] = splitKey(key)
      const value = this.store.getValue(category, field)
      if (value === undefined) continue
      apply[key] = name
      values[key] = value
    }
    writeSettingsCache(this.userKey, { v: 1, apply, values })
  }
  /**
   * Salva il valore del campo associato all'applier `name` (es. `theme` -> `appearance.theme`), se esiste e se
   * l'utente è autenticato e il valore è diverso. Usato per riflettere nel DB le modifiche fatte fuori dalla pagina
   * (pulsante tema della barra, selettore lingua).
   *
   * @param name - nome dell'applier
   * @param value - nuovo valore
   * @returns `true` se è stato avviato un salvataggio
   */
  public setByApply(name: string, value: SettingValue): boolean {
    if (!this.isAuthenticated) return false
    const key = Object.keys(this.applyMap).find((k) => this.applyMap[k] === name)
    if (!key) return false
    const [category, field] = splitKey(key)
    if (this.store.getValue(category, field) === value) return false
    this.set(category, field, value)
    return true
  }

  private setupSchemaWatchers(schema: ISettingsSchemaResponse): void {
    // Ferma i watcher precedenti (es. dopo re-login)
    this.watchStopHandles.forEach((stop) => stop())
    this.watchStopHandles = []

    const opts = { deps: quasarDeps(), allowScriptStrings: getPachiSettingsOptions().allowScriptStrings }
    for (const [sectionKey, category] of Object.entries(schema)) {
      for (const fieldKey of Object.keys(category.fields)) {
        // watch: { campoOsservato: azione } → l'azione parte quando cambia il campo osservato (semantica pachifast)
        // watch: true                       → legacy: riusa gli events sul valore del campo stesso
        for (const target of resolveWatchTargets(schema, sectionKey, fieldKey)) {
          const handler = resolveSettingsAction(target.spec, opts)
          if (!handler) continue
          const stop = watch(
            () => this.store.getValue(target.section, target.field),
            (value) => { handler(value) },
            { immediate: true }
          )
          this.watchStopHandles.push(stop)
        }
      }
    }
  }
  /**
   * Svuota le impostazioni in memoria, annulla i salvataggi in attesa, ferma i watcher e riporta gli applier al
   * default (accent, densità, ... ; tema e lingua restano quelli del dispositivo). La cache per utente resta
   * (è legata all'utente: il suo prossimo login non ha flash). Da chiamare al logout (automatico con
   * `installPachiSettings`).
   */
  public clearSettings(): void {
    const resetDefaults = this.defaultsByApplier()
    this.epoch++
    this.pending.forEach((p) => clearTimeout(p.timer))
    this.pending.clear()
    this.watchStopHandles.forEach((stop) => stop())
    this.watchStopHandles = []
    this.lastSchema = {}
    this.applyMap = {}
    this.loadPromise = null
    this.userKey = null
    this.store.clearSettings()
    resetSettingsAppliers(resetDefaults)
  }
  /**
   * Valore predefinito di un campo: `default` dello schema (anche `null`) o, per backend senza `default`,
   * il fallback del frontend per i campi standard.
   *
   * @param category - categoria
   * @param key - chiave del campo
   * @returns `{ found, value }`
   */
  public getDefault(category: string, key: string): { found: boolean; value: unknown } {
    return resolveFieldDefault(this.lastSchema, category, key)
  }
  /** Mappa nome applier -> default (del primo campo dello schema che lo usa e ha un default). */
  private defaultsByApplier(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [fieldKey, name] of Object.entries(this.applyMap)) {
      if (Object.hasOwn(out, name)) continue
      const [category, field] = splitKey(fieldKey)
      const r = resolveFieldDefault(this.lastSchema, category, field)
      if (r.found) out[name] = r.value
    }
    return out
  }
  public get(category: string, key: string): SettingValue | undefined {
    return this.store.getValue(category, key) as SettingValue | undefined
  }
  public set(category: string, key: string, value: SettingValue): void {
    if (!this.isAuthenticated) {
      console.warn('User is not authenticated. Cannot save settings.')
      return
    }
    const id = `${category}/${key}`
    const existing = this.pending.get(id)
    const prev = existing ? existing.prev : this.store.getValue(category, key)
    if (existing) clearTimeout(existing.timer)
    this.store.setValue(category, key, value)
    this.applyField(category, key, 'set')
    this.writeCache()
    const timer = setTimeout(() => void this.flush(category, key), SettingsManager.SAVE_DEBOUNCE_MS)
    this.pending.set(id, { timer, prev, value, category, key })
  }
  /** Attesa (ms) prima di inviare al backend l'ultimo valore modificato di una chiave. */
  private static readonly SAVE_DEBOUNCE_MS = 400
  /**
   * Invia subito tutti i salvataggi in attesa (senza aspettare il debounce) e attende la fine di quelli in corso.
   *
   * @returns una promise che si risolve quando tutti i PUT sono terminati (mai rifiutata: gli errori sono gestiti)
   */
  public async flushAll(): Promise<void> {
    for (const entry of [...this.pending.values()]) {
      clearTimeout(entry.timer)
      void this.flush(entry.category, entry.key)
    }
    await Promise.all([...this.inflight.values()])
  }
  /**
   * Invia il valore in attesa. I PUT della stessa chiave sono serializzati: un secondo salvataggio parte solo a
   * fine del primo, così sul server vince sempre l'ultimo valore impostato.
   */
  private flush(category: string, key: string): Promise<void> {
    const id = `${category}/${key}`
    const entry = this.pending.get(id)
    if (!entry) return Promise.resolve()
    this.pending.delete(id)
    const run = (this.inflight.get(id) ?? Promise.resolve()).then(() => this.send(category, key, entry))
    this.inflight.set(id, run)
    void run.finally(() => {
      if (this.inflight.get(id) === run) this.inflight.delete(id)
    })
    return run
  }
  /** PUT del valore; in caso di errore ripristina il valore precedente e notifica (non rifiuta mai). */
  private async send(
    category: string,
    key: string,
    entry: { prev: unknown; value: SettingValue },
  ): Promise<void> {
    const id = `${category}/${key}`
    try {
      await this.alova.Put(
        `/user/settings/${encodeURIComponent(category)}/${encodeURIComponent(key)}`,
        { value: entry.value },
        { cacheFor: null },
      )
    } catch (e) {
      console.warn(`SettingsManager: salvataggio di ${id} non riuscito`, e)
      // rollback solo se nel frattempo non è stato impostato un valore più recente
      if (!this.pending.has(id) && this.store.getValue(category, key) === entry.value) {
        this.store.setValue(category, key, entry.prev)
        this.applyField(category, key, 'set')
        this.writeCache()
      }
      try {
        showNotify({ type: 'negative', message: pachiT('pachiSettings.saveError') })
      } catch {
        // plugin Notify non installato
      }
    }
  }
  public getApplicationSettings(category: string): IUserSettings | undefined {
    return this.store.userSettings[category]
  }
  getReactiveFor<T extends Record<string, unknown>>(appKey: string): ReactiveSection<T> {
    const cache = new Map<PropertyKey, ComputedRef<SettingValue | undefined>>()

    return new Proxy({}, {
      get: (_t, prop: PropertyKey) => {
        // evita cose tipo Symbol.toStringTag ecc
        if (typeof prop !== 'string') return undefined

        if (cache.has(prop)) return cache.get(prop)

        const r = computed<SettingValue | undefined>({
          get: () => this.store.getValue(appKey, prop) as SettingValue | undefined,
          set: (val) => this.set(appKey, prop, val as SettingValue),
        })

        cache.set(prop, r)
        return r
      },
    }) as ReactiveSection<T>
  }
  /**
   * Ritorna una ComputedRef reattiva (getter+setter) collegata allo store.
   * Perfetta per v-model.
   */
  getReactiveForKey<T extends SettingValue>(
    appKey: string,
    settingKey: string
  ): ComputedRef<T | undefined> {
    return computed<T | undefined>({
      get: () => this.store.getValue(appKey, settingKey) as T | undefined,
      set: (val) => this.set(appKey, settingKey, val as SettingValue),
    })
  }
}

/**
 * Divide `categoria.campo` al primo punto.
 *
 * @param key - chiave composta
 * @returns `[categoria, campo]`
 */
function splitKey(key: string): [string, string] {
  const i = key.indexOf('.')
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]
}

/**
 * Chiave della cache per un utente (id, altrimenti username).
 *
 * @param user - utente o `null`
 * @returns la chiave o `null`
 */
export function userKeyOf(user: { id?: string | null | undefined; username?: string | null | undefined } | null | undefined): string | null {
  return user?.id ?? user?.username ?? null
}
