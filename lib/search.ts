import Fuse from 'fuse.js'
import type { IFuseOptions } from 'fuse.js'
import { Product } from '@/types/database'

// Fuse.js configuration for fuzzy search (legacy / fallback)
export const fuseOptions: IFuseOptions<Product> = {
  keys: ['name'],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
}

export type ScoredProduct = {
  product: Product & { purchase_count?: number }
  score: number | null
}

/** Normalize text for token matching: lowercase, collapse whitespace, treat parentheses as spaces */
function normalizeForTokens(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Dutch singular/plural pairs (normalized). Used so "banaan" matches product "Bananen". */
const DUTCH_SINGULAR_PLURAL: Record<string, string> = {
  banaan: 'bananen',
  bananen: 'banaan',
  appel: 'appels',
  appels: 'appel',
  peer: 'peren',
  peren: 'peer',
  sinaasappel: 'sinaasappelen',
  sinaasappelen: 'sinaasappel',
  citroen: 'citroenen',
  citroenen: 'citroen',
  tomaat: 'tomaten',
  tomaten: 'tomaat',
  aardappel: 'aardappelen',
  aardappelen: 'aardappel',
  ui: 'uien',
  uien: 'ui',
  komkommer: 'komkommers',
  komkommers: 'komkommer',
}

/** True if token matches product name (exact substring or known singular/plural pair). */
function tokenMatchesName(token: string, nameNorm: string): boolean {
  if (nameNorm.includes(token)) return true
  const alternate = DUTCH_SINGULAR_PLURAL[token]
  if (alternate && nameNorm.includes(alternate)) return true
  if (alternate && alternate === nameNorm) return true
  return false
}

/** Split query into words (min length 1 for matching) */
function queryTokens(query: string): string[] {
  return normalizeForTokens(query)
    .split(' ')
    .filter((t) => t.length > 0)
}

/**
 * Returns the part of the query that is not the product name (description).
 * E.g. "2 grote zakken spinazie" + "Spinazie" → "2 grote zakken"
 * Handles product name or its singular/plural form anywhere in the query.
 */
export function getQueryRemainderAsDescription(query: string, productName: string): string | null {
  const q = query.trim()
  const name = productName.trim()
  if (!q || !name) return null
  const qLower = q.toLowerCase()
  const nameLower = name.toLowerCase()
  // Try exact product name first
  let idx = qLower.indexOf(nameLower)
  let removeLength = name.length
  if (idx === -1 && DUTCH_SINGULAR_PLURAL[nameLower]) {
    const alt = DUTCH_SINGULAR_PLURAL[nameLower]
    idx = qLower.indexOf(alt)
    if (idx !== -1) removeLength = alt.length
  }
  if (idx === -1) return null
  const before = q.slice(0, idx)
  const after = q.slice(idx + removeLength)
  const remainder = `${before} ${after}`.replace(/\s+/g, ' ').trim()
  return remainder || null
}

/** Searchable text: name + description, normalized */
function searchableText(product: Product): string {
  const name = normalizeForTokens(product.name || '')
  const desc = normalizeForTokens(product.description || '')
  return `${name} ${desc}`.trim()
}

/** Penalty when the first query word does not match the product name (word order: first word = product name) */
const FIRST_WORD_NOT_IN_NAME_PENALTY = 100

/**
 * Token-based search: query words must appear in name or description.
 * Word order: the first query word should match the product name (so "croissants kaas" ranks "Croissants" + description "kaas" above "Kaas").
 * Score: lower = better. Then purchase_count (higher first).
 */
export function searchProductsWithScores(
  products: (Product & { purchase_count?: number })[],
  query: string
): ScoredProduct[] {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) {
    return []
  }

  const tokens = queryTokens(trimmed)
  if (tokens.length === 0) return []

  const scored: ScoredProduct[] = []

  const requiredTokens = tokens.filter((t) => t.length >= 2)
  const required = requiredTokens.length
  const firstToken = requiredTokens[0]

  const queryNorm = normalizeForTokens(trimmed)

  for (const product of products) {
    const text = searchableText(product)
    const nameNorm = normalizeForTokens(product.name || '')

    // Exact match: query equals product name → always rank first
    const exactMatch =
      queryNorm === nameNorm ||
      (DUTCH_SINGULAR_PLURAL[queryNorm] && DUTCH_SINGULAR_PLURAL[queryNorm] === nameNorm) ||
      (DUTCH_SINGULAR_PLURAL[nameNorm] && DUTCH_SINGULAR_PLURAL[nameNorm] === queryNorm)
    if (exactMatch) {
      scored.push({ product, score: -1 })
      continue
    }

    let wordsMatched = 0
    let wordsInName = 0

    for (const token of requiredTokens) {
      const inText = text.includes(token) || (DUTCH_SINGULAR_PLURAL[token] && text.includes(DUTCH_SINGULAR_PLURAL[token]))
      const inName = tokenMatchesName(token, nameNorm)
      if (inText) wordsMatched++
      if (inName) wordsInName++
    }

    if (wordsMatched === 0) continue

    // No penalty when: first word matches product name, OR query contains product name (e.g. "2 grote zakken spinazie" → Spinazie)
    const nameOrPluralInQuery =
      nameNorm.length >= 2 &&
      (queryNorm.includes(nameNorm) ||
        (DUTCH_SINGULAR_PLURAL[nameNorm] && queryNorm.includes(DUTCH_SINGULAR_PLURAL[nameNorm])))
    const firstWordInName = firstToken ? (tokenMatchesName(firstToken, nameNorm) || nameOrPluralInQuery) : true
    const penalty = firstWordInName ? 0 : FIRST_WORD_NOT_IN_NAME_PENALTY

    // Score: lower = better. Prefer more tokens matched, then all in name.
    const matchBonus = wordsInName === required ? 0 : 0.5
    const score = penalty + (required - wordsMatched) * 2 + matchBonus

    scored.push({ product, score })
  }

  // Sort by score asc (best first), then purchase_count desc
  scored.sort((a, b) => {
    const sa = a.score ?? 999
    const sb = b.score ?? 999
    if (sa !== sb) return sa - sb
    return (b.product.purchase_count ?? 0) - (a.product.purchase_count ?? 0)
  })

  return scored
}

/**
 * Legacy: search using only Fuse on name (no token/description).
 */
export function searchProducts(products: Product[], query: string): Product[] {
  if (!query || query.trim().length < 2) return []
  const fuse = new Fuse(products, fuseOptions)
  return fuse.search(query.trim()).map((r) => r.item)
}
