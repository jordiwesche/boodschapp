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
      // Check direct match or if product name contains the term
      // Also handle plural/singular: "appels" should match "appel"
      const matches = 
        nameLower === termLower ||
        nameLower.includes(termLower) ||
        termLower.includes(nameLower) ||
        // Handle plural: remove 's' from end and compare
        (nameLower.endsWith('s') && nameLower.slice(0, -1) === termLower) ||
        (termLower.endsWith('s') && termLower.slice(0, -1) === nameLower)
      
      if (matches) {
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
