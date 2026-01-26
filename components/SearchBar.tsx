'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  onSearch?: (query: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export default function SearchBar({
  onSearch,
  onFocus,
  onBlur,
  placeholder = 'Typ product (en toelichting)',
  value: controlledValue,
  onChange,
}: SearchBarProps) {
  const [isActive, setIsActive] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const query = controlledValue !== undefined ? controlledValue : internalQuery

  const handleFocus = () => {
    setIsActive(true)
    onFocus?.()
  }

  const handleBlur = () => {
    // Delay blur to allow click events on suggestions
    setTimeout(() => {
      setIsActive(false)
      onBlur?.()
    }, 200)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (controlledValue === undefined) {
      setInternalQuery(value)
    }
    onChange?.(value)

    // Debounce search calls (300ms)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearch?.(value)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
      <div className="mx-auto max-w-md">
        <div
          className={`relative rounded-lg bg-white shadow-lg transition-all ${
            isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
