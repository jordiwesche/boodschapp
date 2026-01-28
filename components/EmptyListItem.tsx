'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Check } from 'lucide-react'

interface EmptyListItemProps {
  query: string
  onQueryChange: (query: string) => void
  onAdd: (query: string) => void
  onCancel: () => void
  autoFocus?: boolean
}

export default function EmptyListItem({
  query,
  onQueryChange,
  onAdd,
  onCancel,
  autoFocus = true,
}: EmptyListItemProps) {
  const [showAddButton, setShowAddButton] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount (with better mobile support)
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Multiple attempts for mobile - some devices need more time
      const focusInput = () => {
        if (inputRef.current) {
          // Try multiple methods for mobile
          const isMobile = window.innerWidth <= 768
          
          if (isMobile) {
            // Method 1: Direct click and focus
            inputRef.current.click()
            inputRef.current.focus()
            
            // Method 2: Force focus with selection after a delay
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus()
                if (inputRef.current.setSelectionRange) {
                  inputRef.current.setSelectionRange(0, 0)
                }
              }
            }, 100)
            
            // Method 3: Another attempt after longer delay
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus()
              }
            }, 300)
          } else {
            // Desktop: simple focus
            inputRef.current.focus()
          }
        }
      }
      
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        setTimeout(focusInput, 50)
      })
    }
  }, [autoFocus])

  // Show add button when typing
  useEffect(() => {
    setShowAddButton(query.trim().length > 0)
  }, [query])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onQueryChange(value)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (query.trim()) {
      onAdd(query.trim())
      onQueryChange('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        {/* Checkbox (non-interactive, visual only) */}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
          <Check className="h-3 w-3 text-transparent" />
        </div>

        {/* Input field */}
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Typ product..."
            className="w-full border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            style={{ fontSize: '16px' }}
          />
        </form>

        {/* Add button (appears when typing) */}
        {showAddButton && (
          <button
            onClick={() => handleSubmit()}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
            aria-label="Toevoegen"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Annuleren"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
