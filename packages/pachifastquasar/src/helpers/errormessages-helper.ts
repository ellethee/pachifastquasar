import type { ResponseError } from '@ilpachi/use-alova'
import { getPachiI18n, pachiT } from '@ilpachi/pachi-i18n'
import { getPachiQuasar } from './quasar-instance'

export interface ErrorResponse {
  detail: Detail[] | string
}

export interface Detail {
  type: string
  loc: string[]
  msg: string
  input: string
  /** Codice stabile dell'errore generato dal backend (es. `auth.invalid_credentials`); assente per 422/404/405 di FastAPI. */
  code?: string
  /** Parti variabili del messaggio (es. `{ min_length: 12 }`), presenti solo quando servono. */
  params?: Record<string, string | number>
}

/**
 * Esegue l'escape dei caratteri HTML speciali di un testo proveniente dal server.
 *
 * @param text - testo da rendere sicuro
 * @returns testo con entità HTML
 */
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  )
}

/**
 * Mostra una notifica (toast) di errore.
 *
 * @param _err - errore HTTP originale
 * @param title - titolo della notifica
 * @param html - dettaglio (testo semplice: viene sottoposto a escape)
 */
export const toastMessage = (_err: ResponseError, title: string, html: string) => {
  // il testo arriva dal server: escape qui dentro (la notifica interpreta l'HTML)
  getPachiQuasar().notify({
    type: 'negative',
    message: escapeHtml(title),
    caption: escapeHtml(html),
    html: true,
    timeout: 5000,
    position: 'top-right'
  })
  return Promise.resolve()
}

/**
 * Mostra un dialog modale di errore e attende la chiusura.
 *
 * @param _err - errore HTTP originale
 * @param title - titolo del dialog
 * @param html - contenuto HTML del dialog
 */
export const boxMessage = (_err: ResponseError, title: string, html: string) => {
  return new Promise<void>(resolve => {
    getPachiQuasar().dialog({
      title,
      message: html,
      html: true,
      ok: { label: pachiT('common.ok'), flat: true },
      persistent: false
    })
      .onOk(() => resolve())
      .onCancel(() => resolve())
      .onDismiss(() => resolve())
  })
}

/**
 * Testo da mostrare per un errore del backend: traduzione di `errors.codes.<code>` nella lingua corrente
 * (con `params` per i segnaposto); se manca la traduzione o l'errore non ha `code` ripiega su `msg`.
 *
 * @param item - dettaglio dell'errore
 */
export function translateDetail(item: Detail): string {
  const key = item.code ? `errors.codes.${item.code}` : ''
  // `te` con chiave dinamica: si evita la tipizzazione ricorsiva dello schema dei messaggi
  const global = getPachiI18n()?.global as unknown as { te: (key: string) => boolean } | undefined
  if (key && global?.te(key)) return pachiT(key, { ...item.params })
  return item.msg
}

/**
 * Converte i dettagli di validazione (formato FastAPI) in una lista HTML in stile Quasar.
 *
 * @param items - dettagli di errore per campo
 * @returns markup HTML della lista
 */
function asQList(items: Detail[]) {
  const litems: string[] = ['<div class="q-list q-list--bordered q-list--separator" role="list">']
  items.forEach(item => {
    litems.push(`<div class="q-item q-item-type row no-wrap q-list--dense" role="listitem">
    <div class="q-item__section column q-item__section--main justify-center">
      ${item.loc?.length ? `<div class="q-item__label">${escapeHtml(item.loc.join('.'))}</div>` : ''}
      <div class="q-item__label q-item__label--caption text-caption">${escapeHtml(translateDetail(item))}</div>
    </div>
  </div>`)
  })
  litems.push('</div>')
  return litems.join('')
}

/**
 * Converte il `detail` di una risposta d'errore in HTML sicuro: lista per gli errori di validazione,
 * testo per le stringhe; per `detail` assente o oggetto (es. 5xx) usa un messaggio generico tradotto.
 *
 * @param detail - campo `detail` della risposta (qualsiasi tipo)
 * @returns HTML da mostrare nel dialog
 */
export function formatDetail(detail: unknown): string {
  if (Array.isArray(detail) && detail.length > 0) return asQList(detail as Detail[])
  if (typeof detail === 'string' && detail.trim()) return escapeHtml(detail)
  return escapeHtml(pachiT('errors.http.generic'))
}

/**
 * Mostra all'utente il messaggio di un errore HTTP (dialog con titolo status + dettaglio).
 *
 * @param err - errore HTTP restituito dal client
 */
export async function errorMessage(err: ResponseError) {
  // corpo JSON ({ detail }), testo semplice o assente (errore di rete: si usa il messaggio dell'errore)
  const body: unknown = await err.safeResponseData()
  const detail = body !== null && typeof body === 'object' ? (body as { detail?: unknown }).detail : (body ?? err.message)
  // 429 senza un detail utilizzabile: messaggio dedicato (limite di richieste/tentativi)
  const hasDetail = Array.isArray(detail) ? detail.length > 0 : typeof detail === 'string' && !!detail.trim()
  const messages =
    err.status === 429 && !hasDetail
      ? escapeHtml(pachiT('errors.http.tooManyRequests'))
      : formatDetail(detail)
  const title = pachiT('errors.http.title', { status: err.status, statusText: err.statusText })
  await boxMessage(err, title, messages)
}
