/**
 * Parses toelichting (annotation) from user input
 * Extracts: quantity, parentheses content, and free text
 */

export interface ParsedAnnotation {
  quantity?: string // "2", "5x", "500gr", "2 liter"
  annotation?: string // "(Kruidvat)", "(grote zak)", vrije tekst
  fullText: string // Volledige toelichting voor opslag
}

/**
 * Parses the input string to extract product name and annotation
 * Returns: { productName: string, annotation: ParsedAnnotation | null }
 */
export function parseProductInput(input: string): {
  productName: string
  annotation: ParsedAnnotation | null
} {
  const trimmed = input.trim()
  if (!trimmed) {
    return { productName: '', annotation: null }
  }

  // Patterns for quantity detection
  const quantityPatterns = [
    /^(\d+)\s*(x|st|stuks?|pak|pakken)\b/i, // "2x", "5 stuks", "3 pakken"
    /^(\d+)\s*(gr|gram|kg|kilo|kilogram|liter|l|ml|cl|dl|g|mg)\b/i, // "500gr", "2 liter", "1.5 kg"
    /^(\d+(?:[.,]\d+)?)\s*(gr|gram|kg|kilo|kilogram|liter|l|ml|cl|dl|g|mg)\b/i, // "1.5 liter", "2,5 kg"
    /^(\d+)$/, // Just a number "2"
  ]

  // Pattern for parentheses
  const parenthesesPattern = /\(([^)]+)\)/g

  // Try to find where the product name ends and annotation begins
  // Strategy: look for quantity patterns or parentheses
  let productName = trimmed
  let annotationText = ''
  let annotation: ParsedAnnotation | null = null

  // Check for parentheses first (most explicit)
  const parenthesesMatches = [...trimmed.matchAll(parenthesesPattern)]
  if (parenthesesMatches.length > 0) {
    // Extract all parentheses content
    const parenthesesContent = parenthesesMatches
      .map((match) => match[0])
      .join(' ')
    annotationText = parenthesesContent

    // Remove parentheses from product name
    productName = trimmed.replace(parenthesesPattern, '').trim()

    // Check if there's quantity before or after parentheses
    const remainingText = productName
    for (const pattern of quantityPatterns) {
      const match = remainingText.match(pattern)
      if (match) {
        annotationText = `${match[0]} ${annotationText}`.trim()
        productName = remainingText.replace(pattern, '').trim()
        break
      }
    }
  } else {
    // No parentheses, check for quantity patterns
    for (const pattern of quantityPatterns) {
      const match = trimmed.match(new RegExp(`(.+?)\\s+(${pattern.source})`, 'i'))
      if (match && match[1] && match[2]) {
        productName = match[1].trim()
        annotationText = match[2].trim()
        break
      }
    }

    // If no quantity pattern found, check if there's extra text after a reasonable product name
    // Split on spaces and try to identify product vs annotation
    const words = trimmed.split(/\s+/)
    if (words.length > 2) {
      // For multi-word products like "Halfvolle melk", try to detect if last words are annotation
      // Simple heuristic: if last word looks like quantity or annotation, it's annotation
      const lastWord = words[words.length - 1]
      const secondLastWord = words[words.length - 2]

      // Check if last words form a quantity
      const lastTwoWords = `${secondLastWord} ${lastWord}`
      for (const pattern of quantityPatterns) {
        if (pattern.test(lastTwoWords)) {
          productName = words.slice(0, -2).join(' ')
          annotationText = lastTwoWords
          break
        }
      }

      // If no quantity found, check if last word is a number (likely quantity)
      if (/^\d+$/.test(lastWord)) {
        productName = words.slice(0, -1).join(' ')
        annotationText = lastWord
      }
    }
  }

  // Clean up product name (remove extra spaces)
  productName = productName.replace(/\s+/g, ' ').trim()

  // If we found annotation text, parse it
  if (annotationText) {
    const parsed: ParsedAnnotation = {
      fullText: annotationText,
    }

    // Extract quantity from annotation text
    for (const pattern of quantityPatterns) {
      const match = annotationText.match(pattern)
      if (match) {
        parsed.quantity = match[0]
        break
      }
    }

    // Extract parentheses content
    const parenMatch = annotationText.match(parenthesesPattern)
    if (parenMatch) {
      parsed.annotation = parenMatch.join(' ')
    } else if (!parsed.quantity) {
      // If no quantity and no parentheses, it's free text annotation
      parsed.annotation = annotationText
    }

    annotation = parsed
  }

  return { productName, annotation }
}

/**
 * Formats annotation for display in the shopping list
 */
export function formatAnnotation(annotation: ParsedAnnotation | null): string {
  if (!annotation) return ''
  return annotation.fullText
}
