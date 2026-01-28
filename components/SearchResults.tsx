'use client'

import { Check } from 'lucide-react'

interface SearchResult {
  id: string
  emoji: string
  name: string
  description?: string | null
  category: {
    id: string
    name: string
    display_order: number
  } | null
}

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult, query: string) => void
  isVisible: boolean
  query: string
  addedResultIds?: Set<string>
}

export default function SearchResults({
  results,
  onSelect,
  isVisible,
  query,
  addedResultIds = new Set(),
}: SearchResultsProps) {
  if (!isVisible || !query || query.trim().length < 2) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="w-full py-4">
        <p className="text-sm text-gray-500">Geen resultaten gevonden</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {results.map((result) => {
        const isAdded = addedResultIds.has(result.id)
        // Extract annotation from query (everything after product name)
        const productNameLower = result.name.toLowerCase().trim()
        const queryLower = query.toLowerCase().trim()
        let annotationText = ''
        
        if (queryLower.startsWith(productNameLower)) {
          // Extract everything after the product name
          annotationText = query.substring(result.name.length).trim()
        }

        return (
          <button
            key={result.id}
            onMouseDown={(e) => {
              // Use onMouseDown instead of onClick to fire before blur
              e.preventDefault()
              e.stopPropagation()
              onSelect(result, query)
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{result.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">
                    {result.name}
                  </p>
                  {isAdded && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      toegevoegd
                    </span>
                  )}
                  {result.description && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {result.description}
                    </span>
                  )}
                  {annotationText && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {annotationText}
                    </span>
                  )}
                </div>
                {result.category && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.category.name}
                  </p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
