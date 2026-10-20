import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPachiConfig, isCookieRefreshMode } from '../../core/config'
import { decodeJwtExpiry } from '../../helpers/jwt-helper'
import type { IEngineInfo, ITokenResponse, IUserInfo } from './types/auth-manager'

/**
 * Persistence storage resolved lazily: the config (`auth.storage`) is known only at runtime, after
 * `setPachiConfig`, while `defineStore` is evaluated when the module loads.
 */
const lazyStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: key => {
    if (!isCookieRefreshMode()) return pickStorage().getItem(key)
    dropPersisted(key)
    return null
  },
  setItem: (key, value) => {
    if (isCookieRefreshMode()) dropPersisted(key)
    else pickStorage().setItem(key, value)
  }
}

/**
 * Cookie mode persists nothing: removes what a previous `body` mode may have left behind.
 *
 * @param key - storage key of the store
 */
function dropPersisted(key: string): void {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    /* storage not available */
  }
}

/** `sessionStorage` or `localStorage` according to `config.auth.storage`. */
function pickStorage(): Storage {
  return getPachiConfig().auth.storage === 'session' ? sessionStorage : localStorage
}

/** Persisted state of the auth store (only the fields used for synchronization between tabs). */
export interface PersistedAuth {
  access_token?: string | null
  token_type?: string | null
  refresh_token?: string | null
  expires_at?: number | null
}

/**
 * Reads from storage the persisted session (key `auth`), which another tab may have updated.
 *
 * @returns the persisted state or `null` if absent or unreadable
 */
export function readPersistedAuth(): PersistedAuth | null {
  try {
    const raw = pickStorage().getItem('auth')
    return raw ? (JSON.parse(raw) as PersistedAuth) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const userInfoVersion = ref(0)
    const access_token = ref<string | null>(null)
    const token_type = ref<string | null>(null)
    const refresh_token = ref<string | null>(null)
    const expires_at = ref<number | null>(null) // epoch ms, decoded from JWT exp
    const userInfo = ref<IUserInfo | null>(null)
    const engineInfo = ref<IEngineInfo[]>([])

    function setToken(newToken: string) {
      access_token.value = newToken
    }
    function clearToken() {
      access_token.value = null
    }
    function setAllTokens(tokenResponse: ITokenResponse) {
      access_token.value = tokenResponse.access_token
      token_type.value = tokenResponse.token_type
      // cookie mode: the refresh token is an HttpOnly cookie, a copy in the JSON is ignored
      refresh_token.value = isCookieRefreshMode() ? null : tokenResponse.refresh_token
      expires_at.value = decodeJwtExpiry(tokenResponse.access_token)
    }
    function clearAllTokens() {
      access_token.value = null
      token_type.value = null
      refresh_token.value = null
      expires_at.value = null
      userInfo.value = null
    }
    function bumpUserInfoVersion() {
      userInfoVersion.value++
    }

    return {
      access_token,
      token_type,
      refresh_token,
      expires_at,
      setToken,
      clearToken,
      setAllTokens,
      clearAllTokens,
      userInfo,
      engineInfo,
      userInfoVersion,
      bumpUserInfoVersion
    }
  },
  {
    // token and userInfo stay in the browser storage (localStorage by default, `QCLI_AUTH_STORAGE=session`
    // for sessionStorage); with `auth.refreshMode: 'cookie'` nothing is persisted (memory only)
    persist: {
      omit: ['userInfoVersion'],
      storage: lazyStorage
    }
  }
)
