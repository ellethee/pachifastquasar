import { createAlova } from 'alova'
import VueHook from 'alova/vue'
import { getUseAlovaInstance } from '@ilpachi/use-alova'
import { setPachiAlovaFactory } from '@ilpachi/pachi-kit/table'
import type { AlovaExt, IPachiAlovaOptions } from '@ilpachi/pachi-kit/table'

/** Fake product row served by the gallery API. */
export interface FakeItem {
  id: number
  name: string
  category: string
  price: number
  stock: number
  active: boolean
  createdAt: string
}

/** URL prefix handled by the fake API; any other url goes to the real `@ilpachi/use-alova` client. */
export const FAKE_PREFIX = '/fake-gallery'

/** Fake resources: `items` (fast), `slow` (2.5 s per request, shows the skeleton), `error` (always 500). */
export const FAKE_URLS = {
  items: `${FAKE_PREFIX}/items`,
  slow: `${FAKE_PREFIX}/slow`,
  error: `${FAKE_PREFIX}/error`
} as const

export const CATEGORIES = ['tools', 'garden', 'kitchen', 'office', 'toys']
const NAMES = ['Lamp', 'Hammer', 'Chair', 'Mug', 'Notebook', 'Drill', 'Kettle', 'Shovel', 'Puzzle', 'Desk']
const DELAY_MS = 350
const SLOW_DELAY_MS = 2500

/**
 * Builds the deterministic fake dataset (no randomness: reloads show the same rows).
 *
 * @param count - number of rows
 * @returns the rows
 */
export function makeItems(count = 200): FakeItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
    category: CATEGORIES[(i * 7) % CATEGORIES.length] as string,
    price: Math.round((5 + ((i * 37) % 200) + (i % 10) / 10) * 100) / 100,
    stock: (i * 13) % 50,
    active: i % 3 !== 0,
    createdAt: new Date(Date.UTC(2025, 0, 1 + ((i * 5) % 360))).toISOString().slice(0, 10)
  }))
}

let store = makeItems()

/** Restores the 200 original rows (discards creations, edits and deletions). */
export function resetFakeStore(): void {
  store = makeItems()
}

/** Minimal request description handed to the alova adapter. */
interface FakeRequest {
  url: string
  type: string
  data?: unknown
}

/**
 * Compares two cell values for sorting (numbers numerically, everything else as text).
 *
 * @param a - first value
 * @param b - second value
 * @returns negative, zero or positive
 */
function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

/**
 * Answers the GET list request: search, exact filters, multi-sort and paging.
 *
 * @param params - query string of the request
 * @returns `{ items, total, page, pageSize }`
 */
function list(params: URLSearchParams) {
  const page = Number(params.get('page') ?? 1)
  const pageSize = Number(params.get('pageSize') ?? 50)
  const search = (params.get('search') ?? '').toLowerCase()
  let rows = store.filter((r) => !search || `${r.name} ${r.category}`.toLowerCase().includes(search))
  const category = params.get('category')
  if (category) rows = rows.filter((r) => r.category === category)
  if (params.get('active')) rows = rows.filter((r) => String(r.active) === params.get('active'))
  const order = (params.get('orderBy') ?? '').split(',').filter(Boolean)
  if (order.length) {
    rows = [...rows].sort((x, y) => {
      for (const o of order) {
        const key = (o.startsWith('-') ? o.slice(1) : o) as keyof FakeItem
        const c = compare(x[key], y[key])
        if (c) return o.startsWith('-') ? -c : c
      }
      return 0
    })
  }
  const items = pageSize > 0 ? rows.slice((page - 1) * pageSize, page * pageSize) : rows
  return { items, total: rows.length, page, pageSize }
}

/**
 * Fake server: routes the table requests (list, create, update, patch, delete, bulk) to the store.
 *
 * @param req - the request
 * @returns the response body
 * @throws Error on `error` resource or unknown ids
 */
async function handle(req: FakeRequest): Promise<unknown> {
  const url = new URL(req.url, window.location.origin)
  const [resource = '', ...rest] = url.pathname.slice(FAKE_PREFIX.length + 1).split('/')
  await new Promise((resolve) => setTimeout(resolve, resource === 'slow' ? SLOW_DELAY_MS : DELAY_MS))
  if (resource === 'error') throw new Error('Fake server error (500)')
  const tail = rest.filter(Boolean).map(decodeURIComponent)
  const body = req.data as never
  const idOf = (v: unknown) => Number(v)
  const find = (id: number) => {
    const row = store.find((r) => r.id === id)
    if (!row) throw new Error(`Item ${id} not found (404)`)
    return row
  }
  switch (req.type) {
    case 'GET':
      return list(url.searchParams)
    case 'POST':
      if (tail[0] === 'bulk-delete') {
        const ids = new Set((body as unknown as number[]).map(idOf))
        store = store.filter((r) => !ids.has(r.id))
        return { deleted: ids.size }
      }
      if (tail[0] === 'bulk-update') {
        const items = (body as { items: Partial<FakeItem>[] }).items
        items.forEach((i) => Object.assign(find(idOf(i.id)), i))
        return { updated: items.length }
      }
      {
        const row = { ...(body as Partial<FakeItem>), id: Math.max(0, ...store.map((r) => r.id)) + 1 }
        store.unshift(row as FakeItem)
        return row
      }
    case 'PUT':
    case 'PATCH':
      return Object.assign(find(idOf(tail[0])), body)
    case 'DELETE':
      find(idOf(tail[0]))
      store = store.filter((r) => r.id !== idOf(tail[0]))
      return null
    default:
      throw new Error(`Unsupported method ${req.type}`)
  }
}

/**
 * Creates an alova instance that never touches the network: the adapter is the fake server.
 *
 * @param options - table options (`url` is the base url)
 * @returns an alova instance usable as `AlovaExt`
 */
function createFakeAlova(options: IPachiAlovaOptions = {}): AlovaExt {
  const instance = createAlova({
    baseURL: options.url ?? '',
    statesHook: VueHook,
    cacheFor: null,
    requestAdapter: (elements) => {
      const response = handle(elements as FakeRequest)
      return { response: () => response, headers: () => Promise.resolve({}), abort: () => undefined }
    },
    responded: (data) => data
  })
  return instance as unknown as AlovaExt
}

let installed = false

/**
 * Registers the table alova factory: urls under `FAKE_PREFIX` are served by the fake server,
 * all the others by the app's `@ilpachi/use-alova` client (same as the package default), so
 * the other pages are not affected. Idempotent.
 */
export function installFakeApi(): void {
  if (installed) return
  installed = true
  setPachiAlovaFactory((options) => {
    if (options?.url?.startsWith(FAKE_PREFIX)) return createFakeAlova(options)
    return getUseAlovaInstance()({ url: options?.url ?? '' }).alova
  })
}
