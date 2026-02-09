import { PurchaseHistory } from '@/types/database'

const BUFFER_SECONDS = 30 // Buffer voor ongelukjes: negeer aankopen binnen 30 seconden

/**
 * Filtert aankopen die te kort na elkaar zijn (ongelukjes voorkomen)
 * Retourneert alleen aankopen die minimaal BUFFER_SECONDS na elkaar zijn
 */
function filterRecentPurchases(
  purchases: PurchaseHistory[]
): PurchaseHistory[] {
  if (purchases.length === 0) return []

  // Sorteer op datum (nieuwste eerst)
  const sorted = [...purchases].sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  )

  const filtered: PurchaseHistory[] = [sorted[0]] // Nieuwste altijd meenemen

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i - 1].purchased_at).getTime()
    const previous = new Date(sorted[i].purchased_at).getTime()
    const diffSeconds = (current - previous) / 1000

    // Alleen toevoegen als het minimaal BUFFER_SECONDS na de vorige is
    if (diffSeconds >= BUFFER_SECONDS) {
      filtered.push(sorted[i])
    }
  }

  return filtered
}

/** Berekent percentiel (0–1) van gesorteerde array; lineaire interpolatie tussen indices */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo])
}

/** Filtert uitschieters: behoud alleen intervallen binnen [Q1 - 1.5*IQR, Q3 + 1.5*IQR] */
function filterOutlierIntervals(intervals: number[]): number[] {
  if (intervals.length < 3) return intervals
  const sorted = [...intervals].sort((a, b) => a - b)
  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return intervals.filter((d) => d >= lower && d <= upper)
}

/** Mediaan van een gesorteerde array */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = sorted.length / 2
  if (sorted.length % 2 === 1) return sorted[Math.floor(mid)]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Berekent de aankoopfrequentie in dagen op basis van de mediaan van de intervallen.
 * Uitschieters (bijv. vakantie, online boodschappen) worden met IQR genegeerd;
 * daarna bepalen we het ritme met de mediaan (robuust tegen resterende uitschieters).
 * Retourneert null als er niet genoeg data is (minimaal 3 aankopen nodig).
 */
export function calculatePurchaseFrequency(
  purchaseHistory: PurchaseHistory[]
): number | null {
  if (purchaseHistory.length < 3) {
    return null
  }

  // Filter recente aankopen (buffer voor ongelukjes)
  const filtered = filterRecentPurchases(purchaseHistory)

  if (filtered.length < 2) {
    return null // Niet genoeg data na filtering
  }

  // Sorteer op datum (oudste eerst voor interval berekening)
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
  )

  // Bereken intervallen tussen opeenvolgende aankopen (in dagen)
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].purchased_at).getTime()
    const previous = new Date(sorted[i - 1].purchased_at).getTime()
    const diffDays = (current - previous) / (1000 * 60 * 60 * 24)
    intervals.push(diffDays)
  }

  if (intervals.length === 0) {
    return null
  }

  // Verwijder uitschieters (IQR), daarna mediaan van de overgebleven intervallen
  const inlierIntervals = filterOutlierIntervals(intervals)
  const toUse = inlierIntervals.length >= 2 ? inlierIntervals : intervals
  const sortedToUse = [...toUse].sort((a, b) => a - b)
  return median(sortedToUse)
}

/**
 * Voorspelt de volgende aankoopdatum op basis van laatste aankoop en frequentie
 */
export function predictNextPurchaseDate(
  lastPurchaseDate: Date,
  frequencyDays: number
): Date {
  const nextDate = new Date(lastPurchaseDate)
  nextDate.setDate(nextDate.getDate() + Math.round(frequencyDays))
  return nextDate
}

/**
 * Bepaalt de lead time (dagen van tevoren) op basis van frequentie
 * Adaptieve formule: vaker gekocht = kortere lead time
 */
function getLeadTimeDays(frequencyDays: number): number {
  // Very frequent (< 1 hour): show immediately (0 lead time)
  if (frequencyDays < 1/24) {
    return 0
  }
  // Frequent (< 1 day): show 0.1 days (about 2.4 hours) before
  else if (frequencyDays < 1) {
    return 0.1
  }
  // Daily/weekly (< 7 days): 1 day before
  else if (frequencyDays < 7) {
    return 1
  }
  // Bi-weekly (< 14 days): 2 days before
  else if (frequencyDays < 14) {
    return 2
  }
  // Monthly or longer: 3 days before
  else {
    return 3
  }
}

/**
 * Bepaalt of een product in het suggestieblok moet verschijnen
 * Op basis van voorspelde aankoopdatum en adaptieve lead time
 */
export function shouldShowInSuggestions(
  nextPurchaseDate: Date,
  frequencyDays: number
): boolean {
  const leadTimeDays = getLeadTimeDays(frequencyDays)
  const now = new Date()

  // Calculate suggestion date by subtracting lead time
  const suggestionDate = new Date(nextPurchaseDate)
  suggestionDate.setTime(suggestionDate.getTime() - leadTimeDays * 24 * 60 * 60 * 1000)

  // For very frequent items (< 1 hour), show immediately if next purchase is within the frequency window
  if (frequencyDays < 1/24) {
    // Show if next purchase is within the next purchase window
    return now >= suggestionDate
  }

  // For other frequencies, compare dates (reset to midnight for day-level comparison)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const suggestionDateMidnight = new Date(suggestionDate)
  suggestionDateMidnight.setHours(0, 0, 0, 0)

  // Toon als vandaag >= suggestiedatum
  return today >= suggestionDateMidnight
}

/**
 * Haalt de laatste aankoopdatum op uit purchase history
 */
export function getLastPurchaseDate(
  purchaseHistory: PurchaseHistory[]
): Date | null {
  if (purchaseHistory.length === 0) {
    return null
  }

  const filtered = filterRecentPurchases(purchaseHistory)
  if (filtered.length === 0) {
    return null
  }

  // Sorteer en pak de nieuwste
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  )

  return new Date(sorted[0].purchased_at)
}

/**
 * Controleert of er een recente aankoop is (< 30 seconden geleden) voor een product
 * Gebruikt voor buffer check bij check endpoint
 */
export function hasRecentPurchase(
  purchaseHistory: PurchaseHistory[],
  bufferSeconds: number = BUFFER_SECONDS
): boolean {
  if (purchaseHistory.length === 0) {
    return false
  }

  // Sorteer op datum (nieuwste eerst)
  const sorted = [...purchaseHistory].sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  )

  const mostRecent = new Date(sorted[0].purchased_at).getTime()
  const now = Date.now()
  const diffSeconds = (now - mostRecent) / 1000

  return diffSeconds < bufferSeconds
}
