'use client'

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
  isVisible: boolean
  isSearching: boolean
  onSelect: (result: SearchResult, query: string) => void
}

export default function InlineSearchDropdown({
  results,
  query,
  isVisible,
  isSearching,
  onSelect,
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
    return (
      <div className="mb-2 rounded-2xl bg-white p-4 shadow-lg">
        <p className="text-sm text-gray-500">Geen resultaten gevonden</p>
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
    </div>
  )
}
