/**
 * Fruit vs groente classification for "Fruit & Groente" category sorting.
 * Items with a fruit term in the name sort first (fruit), then groente (alphabetically each).
 */

/** Lowercase tokens that indicate fruit when present in a product name (single words for token matching). */
const FRUIT_TOKENS = new Set([
  'abrikoos',
  'abrikozen',
  'ananas',
  'ananassen',
  'appel',
  'appels',
  'aardbei',
  'aardbeien',
  'avocado',
  'avocado\'s',
  'avocados',
  'banaan',
  'bananen',
  'bes',
  'bessen',
  'blauwe',
  'bosbes',
  'bosbessen',
  'braam',
  'bramen',
  'cactusvijg',
  'cactusvijgen',
  'clementine',
  'clementines',
  'cranberry',
  'cranberry\'s',
  'citroen',
  'citroenen',
  'dadel',
  'dadels',
  'druif',
  'druiven',
  'framboos',
  'frambozen',
  'grapefruit',
  'grapefruits',
  'granaatappel',
  'granaatappels',
  'guave',
  'guaves',
  'kaki',
  'kaki\'s',
  'kers',
  'kersen',
  'kiwi',
  'kiwi\'s',
  'limoen',
  'limoenen',
  'lychee',
  'lychees',
  'mandarijn',
  'mandarijnen',
  'mango',
  'mango\'s',
  'meloen',
  'meloenen',
  'nectarine',
  'nectarines',
  'papaja',
  'papaja\'s',
  'passievrucht',
  'passievruchten',
  'peer',
  'peren',
  'perzik',
  'perziken',
  'physalis',
  'pruim',
  'pruimen',
  'sinaasappel',
  'sinaasappelen',
  'vijg',
  'vijgen',
  'watermeloen',
  'watermeloenen',
])

/**
 * Returns true if the product name contains at least one fruit token (exact or prefix match for plurals).
 * Used to sort "Fruit & Groente": fruit first, then groente. No match → treat as groente.
 */
export function isFruit(productName: string): boolean {
  const normalized = (productName || '').toLowerCase().trim()
  if (!normalized) return false
  const tokens = normalized.split(/\s+/)
  return tokens.some((t) => {
    if (FRUIT_TOKENS.has(t)) return true
    return [...FRUIT_TOKENS].some((term) => t.startsWith(term))
  })
}
