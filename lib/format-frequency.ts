/**
 * Format purchase frequency as human-readable string
 * @param frequencyDays - Frequency in days (from calculatePurchaseFrequency)
 * @returns Formatted string like "elke ~2 dagen" or "elke ~3 weken"
 */
export function formatPurchaseFrequency(frequencyDays: number | null): string | null {
  if (frequencyDays === null || frequencyDays <= 0) {
    return null
  }

  // Round to nearest integer for display
  const rounded = Math.round(frequencyDays)

  if (rounded < 7) {
    // Less than a week: show in days
    return `elke ~${rounded} ${rounded === 1 ? 'dag' : 'dagen'}`
  } else if (rounded < 30) {
    // Less than a month: show in weeks
    const weeks = Math.round(rounded / 7)
    return `elke ~${weeks} ${weeks === 1 ? 'week' : 'weken'}`
  } else {
    // A month or more: show in weeks (rounded)
    const weeks = Math.round(rounded / 7)
    return `elke ~${weeks} ${weeks === 1 ? 'week' : 'weken'}`
  }
}
