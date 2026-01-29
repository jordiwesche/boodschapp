import { CATEGORY_CONCEPT_PRODUCTS } from '@/data/category-concept-products'

interface CategoryPrediction {
  categoryName: string
  emoji: string
}

// Emoji mapping per categorie
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Groente & Fruit': '🥬',
  'Vlees & Vis': '🥩',
  'Zuivel': '🥛',
  'Brood & Bakkerij': '🍞',
  'Dranken': '🥤',
  'Droge Kruidenierswaren': '🍝',
  'Diepvries': '🧊',
  'Houdbare Producten': '🥫',
  'Persoonlijke Verzorging': '🧴',
  'Huishoudelijke Artikelen': '🧹',
  'Overig': '📦',
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
      // Direct match, whole-word containment, or singular/plural
      const matches =
        nameLower === termLower ||
        nameContainsWord(nameLower, termLower) ||
        (termLower.length >= nameLower.length && termLower.includes(nameLower)) ||
        (nameLower.endsWith('s') && nameLower.slice(0, -1) === termLower) ||
        (termLower.endsWith('s') && termLower.slice(0, -1) === nameLower)
      if (matches) {
        // #region agent log
        try {
          let categoryNameLog = 'Overig'
          if (concept.canonicalTokens.includes('fruit') || concept.canonicalTokens.includes('groente')) {
            categoryNameLog = 'Groente & Fruit'
          } else if (concept.canonicalTokens.includes('vlees') || concept.canonicalTokens.includes('vis')) {
            categoryNameLog = 'Vlees & Vis'
          } else if (concept.canonicalTokens.includes('zuivel')) {
            categoryNameLog = 'Zuivel'
          } else if (concept.canonicalTokens.includes('bakkerij') || concept.canonicalTokens.includes('brood')) {
            categoryNameLog = 'Brood & Bakkerij'
          } else if (concept.canonicalTokens.includes('dranken')) {
            categoryNameLog = 'Dranken'
          } else if (concept.canonicalTokens.includes('pasta') || concept.canonicalTokens.includes('oosters')) {
            categoryNameLog = 'Droge Kruidenierswaren'
          } else if (concept.canonicalTokens.includes('diepvries')) {
            categoryNameLog = 'Diepvries'
          } else if (concept.canonicalTokens.includes('droog') || concept.canonicalTokens.includes('houdbaar')) {
            categoryNameLog = 'Houdbare Producten'
          } else if (concept.canonicalTokens.includes('huishouden') || concept.canonicalTokens.includes('verzorging')) {
            categoryNameLog = 'Persoonlijke Verzorging / Huishoudelijk'
          }
          fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'lib/predict-category-emoji.ts:match',
              message: 'concept term matched',
              data: { productName: nameLower, matchedTerm: termLower, categoryName: categoryNameLog },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              hypothesisId: 'H2',
            }),
          }).catch(() => {})
        } catch (_) {}
        // #endregion
        // Determine category name from canonical tokens
        let categoryName = 'Overig'
        if (concept.canonicalTokens.includes('fruit') || concept.canonicalTokens.includes('groente')) {
          categoryName = 'Groente & Fruit'
        } else if (concept.canonicalTokens.includes('vlees') || concept.canonicalTokens.includes('vis')) {
          categoryName = 'Vlees & Vis'
        } else if (concept.canonicalTokens.includes('zuivel')) {
          categoryName = 'Zuivel'
        } else if (concept.canonicalTokens.includes('bakkerij') || concept.canonicalTokens.includes('brood')) {
          categoryName = 'Brood & Bakkerij'
        } else if (concept.canonicalTokens.includes('dranken')) {
          categoryName = 'Dranken'
        } else if (concept.canonicalTokens.includes('pasta') || concept.canonicalTokens.includes('oosters')) {
          categoryName = 'Droge Kruidenierswaren'
        } else if (concept.canonicalTokens.includes('diepvries')) {
          categoryName = 'Diepvries'
        } else if (concept.canonicalTokens.includes('droog') || concept.canonicalTokens.includes('houdbaar')) {
          categoryName = 'Houdbare Producten'
        } else if (concept.canonicalTokens.includes('huishouden') || concept.canonicalTokens.includes('verzorging')) {
          // Check if it's personal care or household
          if (nameLower.includes('shampoo') || nameLower.includes('zeep') || nameLower.includes('deodorant') || 
              nameLower.includes('tandpasta') || nameLower.includes('parfum')) {
            categoryName = 'Persoonlijke Verzorging'
          } else {
            categoryName = 'Huishoudelijke Artikelen'
          }
        }

        return {
          categoryName,
          emoji: CATEGORY_EMOJI_MAP[categoryName] || '📦',
        }
      }
    }
  }

  // Default: Overig
  return {
    categoryName: 'Overig',
    emoji: '📦',
  }
}
