/**
 * Tracks last activity (check/uncheck) in the afgevinkt list.
 * Used to auto-clear the list after 12 hours of inactivity.
 */

const STORAGE_KEY = 'boodschapp_last_afgevinkt_activity'
const INACTIVITY_HOURS = 12
const INACTIVITY_MS = INACTIVITY_HOURS * 60 * 60 * 1000

export function getLastActivityFromStorage(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const ts = parseInt(stored, 10)
    return isNaN(ts) ? null : ts
  } catch {
    return null
  }
}

export function setLastActivityInStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

export interface ShoppingListItemForActivity {
  is_checked: boolean
  checked_at: string | null
}

/**
 * Returns the most recent activity timestamp from items (max checked_at) and localStorage.
 */
export function getLastActivity(items: ShoppingListItemForActivity[]): number {
  const fromItems = items
    .filter((i) => i.is_checked && i.checked_at)
    .map((i) => new Date(i.checked_at!).getTime())
  const maxFromItems = fromItems.length > 0 ? Math.max(...fromItems) : 0
  const fromStorage = getLastActivityFromStorage()
  return Math.max(maxFromItems, fromStorage ?? 0)
}

/**
 * Returns true if the afgevinkt list should be auto-cleared (12h+ inactivity).
 */
export function shouldAutoClear(items: ShoppingListItemForActivity[]): boolean {
  const checkedItems = items.filter((i) => i.is_checked)
  if (checkedItems.length === 0) return false

  const lastActivity = getLastActivity(items)
  if (lastActivity === 0) return false

  return Date.now() - lastActivity >= INACTIVITY_MS
}
