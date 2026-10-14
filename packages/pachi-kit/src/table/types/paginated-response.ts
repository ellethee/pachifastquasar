export interface IPaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
