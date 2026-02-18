'use client'

import { ListPlus, Database, CornerDownLeft, ArrowUpLeft } from 'lucide-react'
import { getQueryRemainderAsDescription } from '@/lib/search'

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

export type MatchLevel = 1 | 2 | 3

interface InlineSearchDropdownProps {
  results: SearchResult[]
  query: string
  description: string | null
  /** Parsed from query (e.g. "4" from "4 appels") so result shows as "Appels" with description "4" */
  queryAnnotation?: string | null
  matchLevel: MatchLevel
  isVisible: boolean
  isSearching: boolean
  /** Index of result highlighted by keyboard navigation (arrow keys) */
  highlightedIndex?: number
  onSelect: (result: SearchResult, query: string) => void
  onFillIntoSearch: (result: SearchResult) => void
  onAddToListOnly: (productName: string, description: string | null) => void
  onAddToListAndSaveProduct: (productName: string, description: string | null) => void
}

function ActionButtons({
  q,
  desc,
  addToListOnlyIndex,
  addAndSaveIndex,
  highlightedIndex,
  onAddToListOnly,
  onAddToListAndSaveProduct,
}: {
  q: string
  desc: string | null
  /** Index of "Zet op lijst" in the full dropdown item list */
  addToListOnlyIndex: number
  /** Index of "Zet op lijst en voeg toe" in the full dropdown item list */
  addAndSaveIndex: number
  highlightedIndex: number
  onAddToListOnly: (productName: string, description: string | null) => void
  onAddToListAndSaveProduct: (productName: string, description: string | null) => void
}) {
  const isAddToListHighlighted = highlightedIndex === addToListOnlyIndex
  const isAddAndSaveHighlighted = highlightedIndex === addAndSaveIndex
  const highlightClasses = 'bg-blue-50 hover:bg-blue-100'
  const defaultClasses = 'hover:bg-gray-50'
  return (
    <div className="divide-y divide-gray-100">
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onAddToListOnly(q, desc)
        }}
        className={`flex w-full items-center gap-2 text-left text-sm font-medium text-gray-900 py-3 px-4 transition-colors ${
          isAddToListHighlighted ? highlightClasses : defaultClasses
        }`}
      >
        <ListPlus className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="flex-1">Zet &quot;{q}&quot; op de lijst</span>
        {isAddToListHighlighted && (
          <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Enter
          </span>
        )}
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onAddToListAndSaveProduct(q, desc)
        }}
        className={`flex w-full items-center gap-2 text-left text-sm font-medium py-3 px-4 transition-colors ${
          isAddAndSaveHighlighted ? `${highlightClasses} text-blue-700` : `${defaultClasses} text-blue-600 hover:text-blue-700`
        }`}
      >
        <Database className="h-4 w-4 shrink-0 text-gray-500" />
        <span className="flex-1">Zet &quot;{q}&quot; op de lijst en voeg toe aan producten</span>
        {isAddAndSaveHighlighted && (
          <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Enter
          </span>
        )}
      </button>
    </div>
  )
}

export default function InlineSearchDropdown({
  results,
  query,
  description,
  queryAnnotation,
  matchLevel,
  isVisible,
  isSearching,
  highlightedIndex = 0,
  onSelect,
  onFillIntoSearch,
  onAddToListOnly,
  onAddToListAndSaveProduct,
}: InlineSearchDropdownProps) {
  if (!isVisible || !query || query.trim().length < 2) {
    return null
  }

  if (isSearching) {
    return (
      <div className="mb-2 rounded-[16px] bg-white p-4 shadow-lg">
        <p className="text-sm text-gray-500">Zoeken...</p>
      </div>
    )
  }

  const q = query.trim()
  const desc = description?.trim() || null

  if (matchLevel === 3) {
    return (
      <div className="mb-2 rounded-[16px] bg-white shadow-lg overflow-hidden">
        <ActionButtons
          q={q}
          desc={desc}
          addToListOnlyIndex={0}
          addAndSaveIndex={1}
          highlightedIndex={highlightedIndex}
          onAddToListOnly={onAddToListOnly}
          onAddToListAndSaveProduct={onAddToListAndSaveProduct}
        />
      </div>
    )
  }

  const showResults = matchLevel === 1 || matchLevel === 2
  const showActionButtons = matchLevel === 2

  return (
    <div className="mb-2 rounded-[16px] bg-white shadow-lg overflow-hidden">
      {showResults && results.length > 0 && (
        <div className="divide-y divide-gray-100">
          {results.map((result, index) => {
          const remainderDesc = getQueryRemainderAsDescription(query.trim(), result.name)
          const effectiveDesc = description?.trim() || queryAnnotation?.trim() || remainderDesc || ''

          return (
            <div
              key={result.id}
              className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${
                index === highlightedIndex ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
              }`}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect(result, query)
                }}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
              >
                <span className="text-lg shrink-0">{result.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {result.name}
                      </p>
                      {index === highlightedIndex && index === 0 && (
                        <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
                          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
                          Enter
                        </span>
                      )}
                    </span>
                    {(effectiveDesc || result.description) && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {effectiveDesc || result.description}
                      </span>
                    )}
                  </div>
                  {result.category && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.category.name}
                    </p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onFillIntoSearch(result)
                }}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                aria-label="Vul productnaam in"
              >
                <ArrowUpLeft className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )
        })}
        </div>
      )}
      {showActionButtons && (
        <div className="border-t border-gray-100">
          <ActionButtons
            q={q}
            desc={desc}
            addToListOnlyIndex={results.length}
            addAndSaveIndex={results.length + 1}
            highlightedIndex={highlightedIndex}
            onAddToListOnly={onAddToListOnly}
            onAddToListAndSaveProduct={onAddToListAndSaveProduct}
          />
        </div>
      )}
    </div>
  )
}
