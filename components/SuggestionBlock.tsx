'use client'

import { X } from 'lucide-react'
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
      suggestions.forEach((suggestion, index) => {
        const element = suggestionRefs.current.get(suggestion.id)
        if (element) {
          element.style.opacity = '0'
          element.style.transform = 'translateY(10px)'
          element.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out'
          setTimeout(() => {
            if (element) {
              element.style.opacity = '1'
              element.style.transform = 'translateY(0)'
            }
          }, 50 + index * 30) // 30ms stagger delay
        }
      })
    }
  }, [isVisible, suggestions])

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-32 left-0 right-0 z-30 px-4 transition-opacity duration-200">
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white p-3 shadow-lg relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex flex-wrap gap-2 pr-6">
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
      </div>
    </div>
  )
}
