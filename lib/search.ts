import Fuse from 'fuse.js'
import { Product } from '@/types/database'

// Fuse.js configuration for fuzzy search
export const fuseOptions = {
  keys: ['name'],
  threshold: 0.3, // 0 = exact match, 1 = match anything (lower = more strict)
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  // Normalize to handle singular/plural and case insensitivity
  getFn: (obj: Product, path: string) => {
    const value = obj.name
    return value ? value.toLowerCase() : ''
  },
}

/**
 * Search products using fuzzy matching
 * Handles singular/plural, small typos (1-2 wrong letters)
 */
export function searchProducts(
  products: Product[],
  query: string
): Product[] {
  if (!query || query.trim().length < 2) {
    return []
  }

  const fuse = new Fuse(products, fuseOptions)
  const results = fuse.search(query.trim())

  // Return products sorted by relevance (best matches first)
  return results.map((result) => result.item)
}
