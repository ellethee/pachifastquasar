import { markRaw } from 'vue'
import { QRating } from 'quasar'
import type { IFieldRow, IPachiFieldsHttp } from '@ilpachi/pachi-kit/fields'

/** Fake countries served by {@link fakeFieldsHttp}. */
const COUNTRIES = [
  { value: 1, label: 'Italy' },
  { value: 2, label: 'France' },
  { value: 3, label: 'Spain' }
]

/** Fake cities, each one tied to a country. */
const CITIES = [
  { value: 10, label: 'Rome', countryId: 1 },
  { value: 11, label: 'Milan', countryId: 1 },
  { value: 20, label: 'Paris', countryId: 2 },
  { value: 21, label: 'Lyon', countryId: 2 },
  { value: 30, label: 'Madrid', countryId: 3 }
]

/** Fake tags for the multiple remote select. */
const TAGS = ['alpha', 'beta', 'gamma', 'delta'].map((label, i) => ({ value: i + 1, label }))

/**
 * In-memory HTTP client for the remote selects: answers the `{ items, total, page, pageSize }`
 * body that `setPachiFieldsHttp` clients must return, with no network at all.
 */
export const fakeFieldsHttp: IPachiFieldsHttp = {
  get<T = unknown>(url: string, params?: Record<string, string | number>): PromiseLike<T> {
    let items: Array<{ value: number; label: string }> = []
    if (url.endsWith('/countries')) items = COUNTRIES
    else if (url.endsWith('/tags')) items = TAGS
    else if (url.endsWith('/cities')) {
      items = params?.countryId === undefined ? [] : CITIES.filter((c) => c.countryId === Number(params.countryId))
    }
    const body = { items, total: items.length, page: 1, pageSize: Number(params?.pageSize ?? 1000) }
    return new Promise<T>((resolve) => setTimeout(() => resolve(body as T), 150))
  }
}

/** Rows of the main section: text, number, boolean, textarea, pdate, local select, custom component. */
export const generalRows: IFieldRow[] = [
  [{ field: 'title', label: 'Title', required: true, maxlength: 60, counter: true, hint: 'Required' }],
  [
    { field: 'price', label: 'Price', type: 'number', step: 'any', prefix: '$',
      rules: [(v: unknown) => v === null || Number(v) >= 0 || 'Must be >= 0'] },
    { field: 'level', label: 'Level', type: 'select', clearable: true,
      options: [{ label: 'Low', value: 1 }, { label: 'Medium', value: 2 }, { label: 'High', value: 3 }] }
  ],
  [
    { field: 'published', label: 'Published', type: 'pdate', mask: 'YYYY-MM-DD' },
    { field: 'rating', label: 'Rating', component: markRaw(QRating), max: 5, size: '24px' }
  ],
  [{ field: 'notes', label: 'Notes', type: 'textarea', autogrow: true, clearable: true }],
  [{ field: 'active', label: 'Active', type: 'boolean' }]
]

/** Rows of the location section: remote selects, the city depends on the country. */
export const locationRows: IFieldRow[] = [
  [
    { field: 'countryId', label: 'Country', type: 'select', url: '/fake/countries', clearable: true },
    { field: 'cityId', label: 'City', type: 'select', url: '/fake/cities', clearable: true,
      dependsOn: 'countryId', params: (v) => ({ countryId: v.countryId as number }) }
  ],
  [{ field: 'tags', label: 'Tags', type: 'select', url: '/fake/tags', multiple: true, useChips: true, useInput: true }]
]

/** Fake record used to open the dialogs. */
export const fakeRecord = {
  title: 'Sample item',
  price: 12.5,
  level: 2,
  published: '2026-01-15',
  rating: 3,
  notes: 'Some notes',
  active: true,
  countryId: 1,
  cityId: 10,
  tags: [1, 3]
}
