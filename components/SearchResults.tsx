'use client'

interface SearchResult {
  id: string
  emoji: string
  name: string
  category: {
    id: string
    name: string
    display_order: number
  } | null
}

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
  isVisible: boolean
  query: string
}

export default function SearchResults({
  results,
  onSelect,
  isVisible,
  query,
}: SearchResultsProps) {
  if (!isVisible || !query || query.trim().length < 2) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="fixed bottom-32 left-0 right-0 z-30 px-4">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <p className="text-sm text-gray-500">Geen resultaten gevonden</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-32 left-0 right-0 z-30 px-4 max-h-64 overflow-y-auto">
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white shadow-lg">
          <div className="divide-y divide-gray-200">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{result.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    {result.category && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {result.category.name}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
