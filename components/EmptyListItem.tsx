'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Check } from 'lucide-react'

interface EmptyListItemProps {
  query: string
  onQueryChange: (query: string) => void
  onAdd: (query: string) => void
  onCancel: () => void
  autoFocus?: boolean
  onFocusComplete?: () => void
}

export default function EmptyListItem({
  query,
  onQueryChange,
  onAdd,
  onCancel,
  autoFocus = true,
  onFocusComplete,
}: EmptyListItemProps) {
  const [showAddButton, setShowAddButton] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount (with better mobile support)
  // Use callback ref for immediate focus when element is mounted
  const inputCallbackRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (node && autoFocus) {
      // Focus immediately when element is mounted (works better on mobile)
      // iOS Safari allows focus if it's triggered synchronously during render
      // Use multiple attempts for better mobile compatibility
      const focusAttempts = [
        () => {
          node.focus()
          if (window.innerWidth <= 768) {
            node.click()
          }
        },
        () => {
          requestAnimationFrame(() => {
            node.focus()
            if (window.innerWidth <= 768) {
              node.click()
            }
          })
        },
      ]
      
      // Try immediate focus
      focusAttempts[0]()
      
      // Try with requestAnimationFrame
      focusAttempts[1]()
      
      // Notify parent that focus attempt is complete
      if (onFocusComplete) {
        setTimeout(() => onFocusComplete(), 100)
      }
    }
  }

  // Also try focus in useEffect as fallback
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Immediate focus attempt
      inputRef.current.focus()
      if (window.innerWidth <= 768) {
        inputRef.current.click()
      }
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
    } else {
      // If query is empty, close the empty item
      onCancel()
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
            ref={inputCallbackRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Typ product..."
            className="w-full border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            style={{ fontSize: '16px' }}
            autoFocus={autoFocus}
            inputMode="text"
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
