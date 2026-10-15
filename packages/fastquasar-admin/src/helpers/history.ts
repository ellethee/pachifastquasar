import type { IAdminHistoryEntry } from '../types/admin'

/** A row of the diff of a history entry. */
export interface IHistoryChange {
  /** Field name (camelCase). */
  field: string
  old: unknown
  new: unknown
}

/** Type of a history entry. */
export type HistoryActionKind = 'add' | 'change' | 'delete' | 'action' | 'other'

/**
 * Sorted list of the changes of an entry (`changes` → rows `field: old → new`).
 *
 * @param entry - history entry
 * @returns changes in alphabetical order of field
 */
export function historyChanges(entry: Pick<IAdminHistoryEntry, 'changes'>): IHistoryChange[] {
  return Object.entries(entry.changes ?? {})
    .map(([field, diff]) => ({ field, old: diff?.old, new: diff?.new }))
    .sort((a, b) => a.field.localeCompare(b.field))
}

/**
 * Family and name of a history action (`add`, `change`, `delete`, `action:<name>`).
 *
 * @param action - value of `action`
 * @returns type and, for bulk actions, the action name
 */
export function parseHistoryAction(action: string): { kind: HistoryActionKind, name?: string } {
  if (action === 'add' || action === 'change' || action === 'delete') return { kind: action }
  if (action.startsWith('action:')) return { kind: 'action', name: action.slice('action:'.length) }
  return { kind: 'other' }
}

/**
 * Text of a value in the diff: `—` for missing, JSON for objects, string otherwise.
 *
 * @param value - old or new value
 * @returns short text
 */
export function formatHistoryValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  if (value === '') return '""'
  return String(value)
}
