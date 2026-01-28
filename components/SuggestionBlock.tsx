'use client'

import { useEffect, useRef } from 'react'

interface Suggestion {
  id: string
  emoji: string
  name: string
  suggestion_type: 'basic' | 'predicted'
}

interface SuggestionBlockProps {
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  onClose: () => void
  isVisible: boolean
}

export default function SuggestionBlock({
  suggestions,
  onSelect,
  onClose,
  isVisible,
}: SuggestionBlockProps) {
  const suggestionRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Stagger fade-in animation for suggestions
  useEffect(() => {
    if (isVisible && suggestions.length > 0) {
      // Reset all elements to initial state first
      suggestions.forEach((suggestion) => {
        const element = suggestionRefs.current.get(suggestion.id)
        if (element) {
          element.style.opacity = '0'
          element.style.transform = 'translateY(10px)'
          element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
        }
      })
      
      // Then animate them in with stagger
      suggestions.forEach((suggestion, index) => {
        const element = suggestionRefs.current.get(suggestion.id)
        if (element) {
          setTimeout(() => {
            if (element) {
              element.style.opacity = '1'
              element.style.transform = 'translateY(0)'
            }
          }, 100 + index * 50) // 100ms initial delay + 50ms per item for better visibility
        }
      })
    }
  }, [isVisible, suggestions])

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div className="w-full transition-opacity duration-200">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            ref={(el) => {
              if (el) {
                suggestionRefs.current.set(suggestion.id, el)
              } else {
                suggestionRefs.current.delete(suggestion.id)
              }
            }}
            onClick={() => onSelect(suggestion)}
            style={{ opacity: 0, transform: 'translateY(10px)' }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              suggestion.suggestion_type === 'basic'
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            <span className="mr-1.5">{suggestion.emoji}</span>
            {suggestion.name}
          </button>
        ))}
      </div>
    </div>
  )
}
