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
 * Manages user settings and schema: loads them from the backend, saves them (PUT) and
 * exposes them reactively. The HTTP client and the authentication state are injected
 * through `setPachiSettingsOptions`. With `installPachiSettings()` loading at login and cleanup at logout
 * are automatic (shell `pachi:auth-changed` event); otherwise call `loadSettings()` after login
 * and `clearSettings()` at logout.
 *
 * Schema fields with `apply` (theme, accent, density, language, ...) are applied with the registered appliers
 * (`registerSettingsApplier`) on load, on every `set()` and at boot from the per-user cache.
 */
export class SettingsManager {
  private static instance: SettingsManager
  private store: ReturnType<typeof useSettingsStore>
  /** HTTP client resolved on every request (so it uses the one provided by the app even if captured after creation). */
  private get alova(): IPachiSettingsHttp {
    return getPachiSettingsOptions().getHttp()
  }
  private watchStopHandles: WatchStopHandle[] = []
  private lastSchema: ISettingsSchemaResponse = {}
  /** Pending saves (debounce) per `category/key`. */
  private pending = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; prev: unknown; value: SettingValue; category: string; key: string }
  >()
  /** In-flight saves per `category/key`: PUTs of the same key start one at a time, in order. */
  private inflight = new Map<string, Promise<void>>()
  private constructor() {
    this.store = useSettingsStore()
    SettingsManager.instance = this
    // tab hidden or closed: saves still in the debounce start immediately (otherwise the change would be lost)
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.flushAll()
      })
    }
  }
  /** Authentication state notified by the shell events (`unknown` = not yet known). */
  private authState: 'unknown' | 'in' | 'out' = 'unknown'
  /** Current user identifier (cache key), `null` if unknown. */
  private userKey: string | null = null
  /** Incremented on every cleanup/user change: in-flight responses of a previous user are discarded. */
  private epoch = 0
  /** Fields with an applier (`category.field` -> name), from the schema or the cache. */
  private applyMap: SettingsApplyMap = {}
  /** Load in progress or completed for the current user. */
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
  /** Last loaded schema (empty before the first load). */
  public get schema(): ISettingsSchemaResponse {
    return this.lastSchema
  }
  /**
   * Loads settings and schema with a single request each, starts the schema watchers, applies the fields with
   * `apply` and updates the user's cache. After the call the schema is available in {@link SettingsManager.schema}.
   */
  public loadSettings(): Promise<IUserSettingsResponse> {
    const promise = this.doLoad()
    this.loadPromise = promise
    // a failed load is not kept in cache: the next `ensureLoaded` retries
    promise.catch(() => {
      if (this.loadPromise === promise) this.loadPromise = null
    })
    return promise
  }
  /**
   * Like {@link SettingsManager.loadSettings} but reuses the load already started or completed for the current user
   * (e.g. the one started at login): the settings page does not reload on every open.
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
    // logout or user change during the request: the response no longer belongs to the current user
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
   * Prepares the user at boot (before login/restore): remembers the key and applies the cache saved for them,
   * so theme, language, etc. are correct before the backend responds (no flash).
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
   * Authenticated user (`pachi:auth-changed` event): with a user different from the previous one it discards the other
   * user's settings, applies the new user's cache and loads from the backend. With the same user already loaded it does nothing.
   *
   * @param userKey - identificativo dell'utente (id o username)
   */
  public async activateUser(userKey: string): Promise<void> {
    this.authState = 'in'
    this.primeUser(userKey)
    try {
      await this.ensureLoaded()
    } catch (e) {
      console.warn('SettingsManager: failed to load settings', e)
    }
  }
  /** Session ended (`pachi:auth-changed` event without a user): clears everything and resets the appliers to the default. */
  public deactivateUser(): void {
    this.authState = 'out'
    this.clearSettings()
  }
  /** Applies the current user's cache (if any) and adopts its applier map. */
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
  /** Runs the appliers of all fields with `apply` that have a value. */
  private applyAll(source: SettingsApplySource): void {
    for (const key of Object.keys(this.applyMap)) {
      const [category, field] = splitKey(key)
      this.applyField(category, field, source)
    }
  }
  /** Runs the field's applier (if it has one and the value is known). */
  private applyField(category: string, key: string, source: SettingsApplySource): void {
    const name = this.applyMap[applyKey(category, key)]
    if (!name) return
    const value = this.store.getValue(category, key)
    if (value === undefined) return
    runSettingsApplier(name, value, { category, key, source })
  }
  /** Saves the values of the fields with `apply` to the current user's cache. */
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
   * Saves the value of the field associated with the `name` applier (e.g. `theme` -> `appearance.theme`), if it exists and if
   * the user is authenticated and the value differs. Used to reflect in the DB the changes made outside the page
   * (toolbar theme button, language selector).
   *
   * @param name - applier name
   * @param value - new value
   * @returns `true` if a save was started
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
    // Stop the previous watchers (e.g. after re-login)
    this.watchStopHandles.forEach((stop) => stop())
    this.watchStopHandles = []

    const opts = { deps: quasarDeps(), allowScriptStrings: getPachiSettingsOptions().allowScriptStrings }
    for (const [sectionKey, category] of Object.entries(schema)) {
      for (const fieldKey of Object.keys(category.fields)) {
        // watch: { watchedField: action } → the action runs when the watched field changes (pachifast semantics)
        // watch: true                       → legacy: reuses the events on the field's own value
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
   * Clears the in-memory settings, cancels pending saves, stops the watchers and resets the appliers to the
   * default (accent, density, ...; theme and language stay those of the device). The per-user cache is kept
   * (it is tied to the user: their next login has no flash). Call at logout (automatic with
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
   * Default value of a field: schema `default` (also `null`) or, for backends without `default`,
   * the frontend fallback for standard fields.
   *
   * @param category - category
   * @param key - field key
   * @returns `{ found, value }`
   */
  public getDefault(category: string, key: string): { found: boolean; value: unknown } {
    return resolveFieldDefault(this.lastSchema, category, key)
  }
  /** Map applier name -> default (of the first schema field that uses it and has a default). */
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
  /** Wait (ms) before sending the last modified value of a key to the backend. */
  private static readonly SAVE_DEBOUNCE_MS = 400
  /**
   * Immediately sends all pending saves (without waiting for the debounce) and waits for the in-flight ones to finish.
   *
   * @returns a promise that resolves when all PUTs have finished (never rejected: errors are handled)
   */
  public async flushAll(): Promise<void> {
    for (const entry of [...this.pending.values()]) {
      clearTimeout(entry.timer)
      void this.flush(entry.category, entry.key)
    }
    await Promise.all([...this.inflight.values()])
  }
  /**
   * Sends the pending value. PUTs of the same key are serialized: a second save starts only at the
   * end of the first, so the server always ends up with the last value set.
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
  /** PUT of the value; on error it restores the previous value and notifies (never rejects). */
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
      console.warn(`SettingsManager: failed to save ${id}`, e)
      // roll back only if a more recent value has not been set in the meantime
      if (!this.pending.has(id) && this.store.getValue(category, key) === entry.value) {
        this.store.setValue(category, key, entry.prev)
        this.applyField(category, key, 'set')
        this.writeCache()
      }
      try {
        showNotify({ type: 'negative', message: pachiT('pachiSettings.saveError') })
      } catch {
        // Notify plugin not installed
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
        // avoid things like Symbol.toStringTag etc.
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
   * Returns a reactive ComputedRef (getter+setter) bound to the store.
   * Perfect for v-model.
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
 * Splits `category.field` at the first dot.
 *
 * @param key - composite key
 * @returns `[category, field]`
 */
function splitKey(key: string): [string, string] {
  const i = key.indexOf('.')
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]
}

/**
 * Cache key for a user (id, otherwise username).
 *
 * @param user - user or `null`
 * @returns the key or `null`
 */
export function userKeyOf(user: { id?: string | null | undefined; username?: string | null | undefined } | null | undefined): string | null {
  return user?.id ?? user?.username ?? null
}
