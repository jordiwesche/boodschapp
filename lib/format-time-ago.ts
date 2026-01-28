/**
 * Format time ago in Dutch
 * Examples: "2 min geleden", "1 uur geleden", "3 dagen geleden"
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const past = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - past.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'zojuist'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min geleden`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'uur' : 'uur'} geleden`
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagen'} geleden`
  } else {
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weken'} geleden`
    } else {
      const diffMonths = Math.floor(diffDays / 30)
      return `${diffMonths} ${diffMonths === 1 ? 'maand' : 'maanden'} geleden`
    }
  }
}
