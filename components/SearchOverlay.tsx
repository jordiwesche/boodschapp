'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import SearchBar from './SearchBar'
import SuggestionBlock from './SuggestionBlock'
import SearchResults from './SearchResults'
import { useSearch } from './SearchContext'

interface SearchOverlayProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onSearch: (query: string) => void
  isSearching: boolean
  suggestions: Array<{
    id: string
    emoji: string
    name: string
    suggestion_type: 'basic' | 'predicted'
  }>
  isLoadingSuggestions: boolean
  searchResults: Array<{
    id: string
    emoji: string
    name: string
    description?: string | null
    category: {
      id: string
      name: string
      display_order: number
    } | null
  }>
  showSearchResults: boolean
  showSuggestions: boolean
  onSuggestionSelect: (suggestion: {
    id: string
    emoji: string
    name: string
    suggestion_type: 'basic' | 'predicted'
  }) => void
  onSearchResultSelect: (result: {
    id: string
    emoji: string
    name: string
    description?: string | null
    category: {
      id: string
      name: string
      display_order: number
    } | null
  }, query: string) => void
  onCloseSuggestions: () => void
  addedResultIds: Set<string>
  onSearchFocus?: () => void
}

export default function SearchOverlay({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  suggestions,
  isLoadingSuggestions,
  searchResults,
  showSearchResults,
  showSuggestions,
  onSuggestionSelect,
  onSearchResultSelect,
  onCloseSuggestions,
  addedResultIds,
  onSearchFocus,
}: SearchOverlayProps) {
  const { isSearchActive, setIsSearchActive } = useSearch()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input when overlay opens
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      // Small delay to ensure overlay is rendered
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isSearchActive])

  // Handle Escape key to close overlay
  useEffect(() => {
    if (!isSearchActive) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchActive(false)
        onSearchQueryChange('')
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSearchActive, setIsSearchActive, onSearchQueryChange])

  if (!isSearchActive) {
    return null
  }

  const handleClose = () => {
    setIsSearchActive(false)
    onSearchQueryChange('')
  }

  const handleSearchFocus = () => {
    // Focus is already handled by parent, just ensure overlay stays open
    setIsSearchActive(true)
    // Call parent handler to refresh suggestions
    onSearchFocus?.()
  }

  const handleSearchBlur = () => {
    // Don't close on blur - let user close explicitly or with Escape
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Sluiten"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Content container */}
      <div className="flex flex-col h-full">
        {/* Search results area - scrollable, takes up available space */}
        {showSearchResults && (
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <SearchResults
              results={searchResults}
              onSelect={onSearchResultSelect}
              isVisible={true}
              query={searchQuery}
              addedResultIds={addedResultIds}
            />
          </div>
        )}

        {/* Suggestions area - 40px gap above search bar, at bottom */}
        <div className="flex-shrink-0 px-4 pb-4">
          {showSuggestions && (
            <>
              {isLoadingSuggestions ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <SuggestionBlock
                    suggestions={suggestions}
                    onSelect={onSuggestionSelect}
                    onClose={onCloseSuggestions}
                    isVisible={showSuggestions}
                  />
                </div>
              )}
            </>
          )}

          {/* Search bar at bottom */}
          <SearchBar
            value={searchQuery}
            onChange={onSearchQueryChange}
            onSearch={onSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Typ product (en toelichting)"
            isLoading={isSearching}
            inOverlay={true}
            inputRef={searchInputRef}
          />
        </div>
      </div>
    </div>
  )
}
