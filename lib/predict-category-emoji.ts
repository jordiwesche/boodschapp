import { CATEGORY_CONCEPT_PRODUCTS } from '@/data/category-concept-products'
import { EMOJI_PICKER_LIST } from '@/lib/emoji-picker-list'

interface CategoryPrediction {
  categoryName: string
  emoji: string
}

// Emoji mapping per categorie (keys = exact DB category names)
export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Fruit & Groente': '🥬',
  'Vers, Vega, Vlees & Vis': '🥩',
  'Pasta, Oosters & Wereld': '🍝',
  'Brood & Bakkerij': '🍞',
  'Zuivel': '🥛',
  'Droog & Houdbaar': '🥫',
  'Dranken': '🥤',
  'Huishouden & Verzorging': '🧴',
  'Diepvries': '🧊',
  'Overig': '📦',
}

/**
 * Emoji by product name: if the name matches a pattern, return that emoji.
 * Checked first; falls back to category emoji when null.
 */
function getEmojiByName(nameLower: string): string | null {
  if (nameLower.includes('kaas')) return '🧀'
  return null
}

/**
 * Look up emoji from picker list by product name or matched term (exact or singular/plural).
 * Used so "Peer" / "Peren" preselect 🍐 instead of the category default 🥬.
 */
function getEmojiFromPickerList(nameOrTermLower: string): string | null {
  if (!nameOrTermLower) return null
  const exact = EMOJI_PICKER_LIST.find(
    (item) => item.name.toLowerCase() === nameOrTermLower
  )
  if (exact) return exact.emoji
  // Plural → singular: check if nameOrTermLower is picker name + "en" or + "s"
  const byPlural = EMOJI_PICKER_LIST.find((item) => {
    const n = item.name.toLowerCase()
    return nameOrTermLower === n + 'en' || nameOrTermLower === n + 's'
  })
  if (byPlural) return byPlural.emoji
  return null
}

/** Escape special regex chars so term can be used in RegExp */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True if term appears as a whole word in name (avoids "cola" matching in "chocoladereep") */
function nameContainsWord(nameLower: string, termLower: string): boolean {
  if (termLower.length === 0) return false
  const wordBoundary = new RegExp(`\\b${escapeRegex(termLower)}\\b`, 'i')
  return wordBoundary.test(nameLower)
}

/**
 * Predict category and emoji for a product name using keyword matching
 */
export function predictCategoryAndEmoji(productName: string): CategoryPrediction {
  const nameLower = productName.toLowerCase().trim()

  // Check each category concept
  for (const concept of CATEGORY_CONCEPT_PRODUCTS) {
    // Check if any product term matches
    for (const term of concept.productTerms) {
      const termLower = term.toLowerCase()
      // Exact match, term as whole word in name, or singular/plural. No substring: we do not match
      // when the product name is a substring of a longer term (e.g. "sap" in "sinaasappel"), so
      // the correct concept (e.g. Dranken with term "sap") wins over earlier concepts.
      const matches =
        nameLower === termLower ||
        nameContainsWord(nameLower, termLower) ||
        (nameLower.endsWith('s') && nameLower.slice(0, -1) === termLower) ||
        (termLower.endsWith('s') && termLower.slice(0, -1) === nameLower)
      if (matches) {
        const emojiFromName = getEmojiByName(nameLower)
        const emojiFromPicker = emojiFromName ?? getEmojiFromPickerList(nameLower) ?? getEmojiFromPickerList(termLower)
        return {
          categoryName: concept.categoryName,
          emoji: emojiFromPicker ?? CATEGORY_EMOJI_MAP[concept.categoryName] ?? '📦',
        }
      }
    }
  }

  // Default: Overig — still try name-based emoji and picker list first
  return {
    categoryName: 'Overig',
    emoji: getEmojiByName(nameLower) ?? getEmojiFromPickerList(nameLower) ?? '📦',
  }
}
