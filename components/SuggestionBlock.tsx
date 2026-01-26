'use client'

interface Suggestion {
  id: string
  emoji: string
  name: string
  suggestion_type: 'basic' | 'predicted'
}

interface SuggestionBlockProps {
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  isVisible: boolean
}

export default function SuggestionBlock({
  suggestions,
  onSelect,
  isVisible,
}: SuggestionBlockProps) {
  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-32 left-0 right-0 z-30 px-4 transition-opacity duration-200">
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
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
