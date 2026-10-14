import type {
  AdminPk,
  AdminRow,
  IAdminActionResult,
  IAdminHistoryEntry,
  IAdminLookupOption,
  IAdminModelInfo,
  IAdminPage,
  IAdminSchema,
} from '../types/admin'
import { SILENT_REQUEST, WRITE_REQUEST } from './http'
import type { IPachiAdminHttp } from './http'
import { buildListQuery, buildOptionsQuery } from './query'
import type { IAdminListQuery } from './query'

/** Client delle API Admin (percorsi relativi alla `basePath` del client HTTP). */
export interface IAdminApi {
  listModels(): Promise<IAdminModelInfo[]>
  getSchema(app: string, model: string): Promise<IAdminSchema>
  list(app: string, model: string, query: IAdminListQuery): Promise<IAdminPage<AdminRow>>
  get(app: string, model: string, pk: AdminPk): Promise<AdminRow>
  create(app: string, model: string, payload: Record<string, unknown>): Promise<AdminRow>
  update(app: string, model: string, pk: AdminPk, payload: Record<string, unknown>): Promise<AdminRow>
  remove(app: string, model: string, pk: AdminPk): Promise<void>
  options(
    app: string,
    model: string,
    opts: { search?: string, page?: number, pageSize?: number, ids?: AdminPk[] }
  ): Promise<IAdminPage<IAdminLookupOption>>
  runAction(app: string, model: string, name: string, ids: AdminPk[]): Promise<IAdminActionResult>
  history(app: string, model: string, pk: AdminPk, page: number, pageSize: number): Promise<IAdminPage<IAdminHistoryEntry>>
}

/**
 * Percorso di un modello (`/<app>/<model>`), con i segmenti codificati.
 *
 * @param app - app
 * @param model - modello
 */
export function modelPath(app: string, model: string): string {
  return `/${encodeURIComponent(app)}/${encodeURIComponent(model)}`
}

/**
 * Percorso di una riga (`/<app>/<model>/<pk>`); la pk (int, uuid o stringa) è codificata.
 *
 * @param app - app
 * @param model - modello
 * @param pk - chiave primaria
 */
export function rowPath(app: string, model: string, pk: AdminPk): string {
  return `${modelPath(app, model)}/${encodeURIComponent(String(pk))}`
}

/**
 * Crea il client delle API Admin sopra un client HTTP.
 *
 * @param http - client HTTP (base URL = `basePath`)
 * @returns il client
 */
export function createAdminApi(http: IPachiAdminHttp): IAdminApi {
  const read = async <T>(url: string): Promise<T> => (await http.Get<T>(url, SILENT_REQUEST)) as T
  return {
    listModels: async () => (await read<IAdminModelInfo[] | null>('')) ?? [],
    getSchema: (app, model) => read<IAdminSchema>(`${modelPath(app, model)}/_schema`),
    list: (app, model, query) => read<IAdminPage<AdminRow>>(`${modelPath(app, model)}?${buildListQuery(query)}`),
    get: (app, model, pk) => read<AdminRow>(rowPath(app, model, pk)),
    create: async (app, model, payload) => (await http.Post<AdminRow>(modelPath(app, model), payload, WRITE_REQUEST)) as AdminRow,
    update: async (app, model, pk, payload) =>
      (await http.Patch<AdminRow>(rowPath(app, model, pk), payload, WRITE_REQUEST)) as AdminRow,
    remove: async (app, model, pk) => {
      await http.Delete(rowPath(app, model, pk), undefined, WRITE_REQUEST)
    },
    options: (app, model, opts) =>
      read<IAdminPage<IAdminLookupOption>>(`${modelPath(app, model)}/_options?${buildOptionsQuery(opts)}`),
    runAction: async (app, model, name, ids) =>
      (await http.Post<IAdminActionResult>(
        `${modelPath(app, model)}/_actions/${encodeURIComponent(name)}`,
        { ids },
        WRITE_REQUEST
      )) as IAdminActionResult,
    history: (app, model, pk, page, pageSize) =>
      read<IAdminPage<IAdminHistoryEntry>>(
        `${rowPath(app, model, pk)}/history?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString()}`
      ),
  }
}
