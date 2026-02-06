/**
 * Format a date as day label for "Laatst gekocht" sections: "Vandaag", "Gisteren", or "Wo 4 feb 2026"
 */
const DAY_ABBR = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const MONTH_ABBR = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(d, today)) return 'Vandaag'
  if (isSameDay(d, yesterday)) return 'Gisteren'
  const day = DAY_ABBR[d.getDay()]
  const date = d.getDate()
  const month = MONTH_ABBR[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${date} ${month} ${year}`
}

/** Return a sortable key for day (today first, then yesterday, then older dates descending) */
export function daySortKey(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(d, today)) return '0'
  if (isSameDay(d, yesterday)) return '1'
  return '2_' + (Number.MAX_SAFE_INTEGER - d.getTime())
}
