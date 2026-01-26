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

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult, query: string) => void
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
            {results.map((result) => {
              // Extract annotation from query (everything after product name)
              const productNameLower = result.name.toLowerCase().trim()
              const queryLower = query.toLowerCase().trim()
              let annotationText = ''
              
              // #region agent log
              const logData = {resultName:result.name,query,productNameLower,queryLower,startsWith:queryLower.startsWith(productNameLower)};
              // #endregion
              
              if (queryLower.startsWith(productNameLower)) {
                // Extract everything after the product name (use original case for exact length)
                const productNameInQuery = query.substring(0, result.name.length)
                annotationText = query.substring(result.name.length).trim()
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SearchResults.tsx:54',message:'Annotation extraction',data:{...logData,productNameInQuery,annotationText,substringStart:result.name.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
                // #endregion
              } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SearchResults.tsx:60',message:'Annotation extraction failed - no match',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
                // #endregion
              }

              return (
                <button
                  key={result.id}
                  onMouseDown={(e) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SearchResults.tsx:61',message:'onMouseDown fired',data:{resultId:result.id,resultName:result.name,query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                    // #endregion
                    // Use onMouseDown instead of onClick to fire before blur
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(result, query)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{result.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
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
      </div>
    </div>
  )
}
