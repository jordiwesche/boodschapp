'use client'

import { ListPlus, Database, CornerDownLeft } from 'lucide-react'

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

interface InlineSearchDropdownProps {
  results: SearchResult[]
  query: string
  description: string | null
  isVisible: boolean
  isSearching: boolean
  onSelect: (result: SearchResult, query: string) => void
  onAddToListOnly: (productName: string, description: string | null) => void
  onAddToListAndSaveProduct: (productName: string, description: string | null) => void
}

export default function InlineSearchDropdown({
  results,
  query,
  description,
  isVisible,
  isSearching,
  onSelect,
  onAddToListOnly,
  onAddToListAndSaveProduct,
}: InlineSearchDropdownProps) {
  if (!isVisible || !query || query.trim().length < 2) {
    return null
  }

  if (isSearching) {
    return (
      <div className="mb-2 rounded-2xl bg-white p-4 shadow-lg">
        <p className="text-sm text-gray-500">Zoeken...</p>
      </div>
    )
  }

  if (results.length === 0) {
    const q = query.trim()
    const desc = description?.trim() || null
    return (
      <div className="mb-2 rounded-2xl bg-white p-4 shadow-lg space-y-3">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddToListOnly(q, desc)
          }}
          className="flex w-full items-center gap-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900 py-3"
        >
          <ListPlus className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="flex-1">Zet &quot;{q}&quot; op de lijst</span>
          <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Enter
          </span>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddToListAndSaveProduct(q, desc)
          }}
          className="flex w-full items-center gap-2 text-left text-sm font-medium text-blue-600 hover:text-blue-700 py-3"
        >
          <Database className="h-4 w-4 shrink-0" />
          Zet &quot;{q}&quot; op de lijst en voeg toe aan producten
        </button>
      </div>
    )
  }

  return (
    <div className="mb-2 rounded-2xl bg-white shadow-lg overflow-hidden">
      <div className="divide-y divide-gray-100">
        {results.map((result) => {
          // Extract annotation from query (everything after product name)
          const productNameLower = result.name.toLowerCase().trim()
          const queryLower = query.toLowerCase().trim()
          let annotationText = ''
          
          if (queryLower.startsWith(productNameLower)) {
            annotationText = query.substring(result.name.length).trim()
          }

          return (
            <button
              key={result.id}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(result, query)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{result.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">
                      {result.name}
                    </p>
                    {result.description && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {result.description}
                      </span>
                    )}
                    {description?.trim() && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {description.trim()}
                      </span>
                    )}
                    {annotationText && !description?.trim() && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
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
    </div>
  )
}
