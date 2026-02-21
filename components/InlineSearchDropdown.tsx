'use client'

import { CornerDownLeft, ArrowUpLeft } from 'lucide-react'
import { getQueryRemainderAsDescription } from '@/lib/search'
import { predictCategoryAndEmoji } from '@/lib/predict-category-emoji'

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
  /** When no match: show toelichting field (invulknop) */
  onFillForQuery?: () => void
}

function ActionButtons({
  q,
  desc,
  emoji,
  addToListOnlyIndex,
  addAndSaveIndex,
  highlightedIndex,
  onAddToListOnly,
  onAddToListAndSaveProduct,
  onFillForQuery,
}: {
  q: string
  desc: string | null
  /** Predicted emoji when no match (matchLevel 3) */
  emoji?: string
  addToListOnlyIndex: number
  addAndSaveIndex: number
  highlightedIndex: number
  onAddToListOnly: (productName: string, description: string | null) => void
  onAddToListAndSaveProduct: (productName: string, description: string | null) => void
  /** Show toelichting field (invulknop) when no match */
  onFillForQuery?: () => void
}) {
  const isAddToListHighlighted = highlightedIndex === addToListOnlyIndex
  const isAddAndSaveHighlighted = highlightedIndex === addAndSaveIndex
  const highlightClasses = 'bg-blue-50 hover:bg-blue-100'
  const defaultClasses = 'hover:bg-gray-50'
  const hasNoMatch = !!emoji && !!onFillForQuery

  const AddToListRow = () => (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {hasNoMatch && <span className="text-lg shrink-0">{emoji}</span>}
      <span className="min-w-0 truncate">&quot;{q}&quot; toevoegen</span>
      {isAddToListHighlighted && (
        <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Enter
        </span>
      )}
    </div>
  )

  const AddAndSaveRow = () => (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {hasNoMatch && <span className="text-lg shrink-0">{emoji}</span>}
      <span className="min-w-0 truncate">&quot;{q}&quot; toevoegen en opslaan</span>
      {isAddAndSaveHighlighted && (
        <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
          <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Enter
        </span>
      )}
    </div>
  )

  return (
    <div className="divide-y divide-gray-100">
      <div className={`flex items-center gap-2 py-3 px-4 transition-colors ${
        isAddToListHighlighted ? highlightClasses : defaultClasses
      }`}>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddToListOnly(q, desc)
          }}
          className="flex flex-1 min-w-0 items-center gap-2 text-left text-sm font-medium text-gray-900"
        >
          <AddToListRow />
        </button>
        {hasNoMatch && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFillForQuery!()
            }}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            aria-label="Vul toelichting in"
          >
            <ArrowUpLeft className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      <div className={`flex items-center gap-2 py-3 px-4 transition-colors ${
        isAddAndSaveHighlighted ? `${highlightClasses} text-blue-700` : `${defaultClasses} text-blue-600 hover:text-blue-700`
      }`}>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddToListAndSaveProduct(q, desc)
          }}
          className="flex flex-1 min-w-0 items-center gap-2 text-left text-sm font-medium"
        >
          <AddAndSaveRow />
        </button>
        {hasNoMatch && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFillForQuery!()
            }}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            aria-label="Vul toelichting in"
          >
            <ArrowUpLeft className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
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
  onFillForQuery,
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
    const predicted = predictCategoryAndEmoji(q)
    return (
      <div className="mb-2 rounded-[16px] bg-white shadow-lg overflow-hidden">
        <ActionButtons
          q={q}
          desc={desc}
          emoji={predicted.emoji}
          addToListOnlyIndex={0}
          addAndSaveIndex={1}
          highlightedIndex={highlightedIndex}
          onAddToListOnly={onAddToListOnly}
          onAddToListAndSaveProduct={onAddToListAndSaveProduct}
          onFillForQuery={onFillForQuery}
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
                    <p className="font-medium text-gray-900">
                      {result.name}
                    </p>
                    {(effectiveDesc || result.description) && (
                      <span className="text-[14px] text-gray-500 whitespace-nowrap">
                        {effectiveDesc || result.description}
                      </span>
                    )}
                    {index === highlightedIndex && index === 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-normal text-gray-500">
                        <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
                        Enter
                      </span>
                    )}
                  </div>
                  {result.category && (
                    <p className="text-xs text-gray-400 mt-0.5">
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
                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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
