'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch?: (query: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  isLoading?: boolean
  inOverlay?: boolean
}

export default function SearchBar({
  onSearch,
  onFocus,
  onBlur,
  placeholder = 'Typ product (en toelichting)',
  value: controlledValue,
  onChange,
  isLoading = false,
  inOverlay = false,
}: SearchBarProps) {
  const [isActive, setIsActive] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = controlledValue !== undefined ? controlledValue : internalQuery

  const handleFocus = () => {
    setIsActive(true)
    // Subtle scale animation on focus
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out'
      containerRef.current.style.transform = 'scale(1.02)'
    }
    onFocus?.()
  }

  const handleBlur = () => {
    // Delay blur to allow click events on suggestions
    setTimeout(() => {
      setIsActive(false)
      // Scale back on blur
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.2s ease-in'
        containerRef.current.style.transform = 'scale(1)'
      }
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

  if (inOverlay) {
    return (
      <div className="w-full">
        <div
          ref={containerRef}
          className={`relative rounded-lg bg-white shadow-lg transition-all ${
            isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
            <input
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-[92px] left-0 right-0 z-40 px-4">
      <div className="mx-auto max-w-md">
        <div
          ref={containerRef}
          className={`relative rounded-lg bg-white shadow-lg transition-all ${
            isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
            <input
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
