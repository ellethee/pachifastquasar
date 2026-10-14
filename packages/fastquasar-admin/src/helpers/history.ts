import type { IAdminHistoryEntry } from '../types/admin'

/** Una riga del diff di una voce di cronologia. */
export interface IHistoryChange {
  /** Nome del campo (camelCase). */
  field: string
  old: unknown
  new: unknown
}

/** Tipo di una voce di cronologia. */
export type HistoryActionKind = 'add' | 'change' | 'delete' | 'action' | 'other'

/**
 * Elenco ordinato delle modifiche di una voce (`changes` → righe `campo: vecchio → nuovo`).
 *
 * @param entry - voce di cronologia
 * @returns modifiche in ordine alfabetico di campo
 */
export function historyChanges(entry: Pick<IAdminHistoryEntry, 'changes'>): IHistoryChange[] {
  return Object.entries(entry.changes ?? {})
    .map(([field, diff]) => ({ field, old: diff?.old, new: diff?.new }))
    .sort((a, b) => a.field.localeCompare(b.field))
}

/**
 * Famiglia e nome di un'azione di cronologia (`add`, `change`, `delete`, `action:<nome>`).
 *
 * @param action - valore di `action`
 * @returns tipo e, per le azioni in blocco, il nome dell'azione
 */
export function parseHistoryAction(action: string): { kind: HistoryActionKind, name?: string } {
  if (action === 'add' || action === 'change' || action === 'delete') return { kind: action }
  if (action.startsWith('action:')) return { kind: 'action', name: action.slice('action:'.length) }
  return { kind: 'other' }
}

/**
 * Testo di un valore nel diff: `—` per assente, JSON per oggetti, stringa altrimenti.
 *
 * @param value - valore vecchio o nuovo
 * @returns testo breve
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
