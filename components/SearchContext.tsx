'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface SearchContextType {
  isSearchActive: boolean
  setIsSearchActive: (active: boolean) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearchActive, setIsSearchActive] = useState(false)

  return (
    <SearchContext.Provider value={{ isSearchActive, setIsSearchActive }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
