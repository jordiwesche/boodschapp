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

/**
 * Berekent de gewogen gemiddelde aankoopfrequentie in dagen
 * Retourneert null als er niet genoeg data is (minimaal 3 aankopen nodig)
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

  // Pas gewogen gemiddelde toe (nieuwste intervallen krijgen hoger gewicht)
  let totalWeighted = 0
  let totalWeight = 0

  for (let i = 0; i < intervals.length; i++) {
    // Gewicht: nieuwste interval = 1.0, daarna 0.8, 0.6, etc.
    const weight = 1.0 - i * 0.2
    const actualWeight = Math.max(weight, 0.2) // Minimum gewicht van 0.2

    totalWeighted += intervals[intervals.length - 1 - i] * actualWeight
    totalWeight += actualWeight
  }

  return totalWeighted / totalWeight
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
  if (frequencyDays < 7) {
    return 1 // Dagelijks/wekelijks: 1 dag van tevoren
  } else if (frequencyDays < 14) {
    return 2 // Twee-wekelijks: 2 dagen van tevoren
  } else {
    return 3 // Maandelijks of langer: 3 dagen van tevoren
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
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset naar middernacht voor vergelijking

  const suggestionDate = new Date(nextPurchaseDate)
  suggestionDate.setDate(suggestionDate.getDate() - leadTimeDays)
  suggestionDate.setHours(0, 0, 0, 0)

  // Toon als vandaag >= suggestiedatum
  return today >= suggestionDate
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
