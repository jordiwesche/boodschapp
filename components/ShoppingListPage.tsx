'use client'

import { useState, useEffect } from 'react'
import SearchBar from './SearchBar'
import SuggestionBlock from './SuggestionBlock'
import SearchResults from './SearchResults'
import ShoppingList from './ShoppingList'
import { parseProductInput } from '@/lib/annotation-parser'

interface ShoppingListItemData {
  id: string
  product_id: string | null
  product_name: string | null
  emoji: string
  quantity: string
  description: string | null
  category_id: string
  category: {
    id: string
    name: string
    display_order: number
  } | null
  is_checked: boolean
  checked_at: string | null
  created_at: string
}

interface Suggestion {
  id: string
  emoji: string
  name: string
  suggestion_type: 'basic' | 'predicted'
}

interface SearchResult {
  id: string
  emoji: string
  name: string
  category: {
    id: string
    name: string
    display_order: number
  } | null
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItemData[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch shopping list items
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/shopping-list')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch suggestions
  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  // Search products
  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (!query || query.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.products || [])
      }
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    }
  }

  useEffect(() => {
    fetchItems()
    fetchSuggestions()
  }, [])

  const handleCheck = async (id: string) => {
    try {
      const response = await fetch(`/api/shopping-list/check/${id}`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh items and suggestions
        await fetchItems()
        await fetchSuggestions()
      } else {
        console.error('Error checking item')
      }
    } catch (error) {
      console.error('Error checking item:', error)
    }
  }

  const handleUncheck = async (id: string) => {
    try {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_checked: false,
        }),
      })

      if (response.ok) {
        await fetchItems()
      } else {
        console.error('Error unchecking item')
      }
    } catch (error) {
      console.error('Error unchecking item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchItems()
      } else {
        console.error('Error deleting item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleUpdateDescription = async (id: string, description: string) => {
    try {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description || null,
        }),
      })

      if (response.ok) {
        await fetchItems()
      } else {
        console.error('Error updating description')
      }
    } catch (error) {
      console.error('Error updating description:', error)
    }
  }

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    try {
      // Fetch the product to get its category_id and full product info
      const productResponse = await fetch(`/api/products/${suggestion.id}`)
      if (!productResponse.ok) {
        console.error('Failed to fetch product:', productResponse.status)
        return
      }

      const productData = await productResponse.json()
      const product = productData.product

      if (!product) {
        console.error('Product not found in response')
        return
      }

      const categoryId = product.category_id

      if (!categoryId) {
        console.error('Product has no category_id')
        return
      }

      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: suggestion.id, // Use product_id so it links to the product
          category_id: categoryId,
          quantity: '1',
        }),
      })

      if (response.ok) {
        await fetchItems()
        setSearchQuery('')
        setIsSearchActive(false)
      } else {
        const errorData = await response.json()
        console.error('Error adding suggestion:', errorData)
      }
    } catch (error) {
      console.error('Error adding suggestion to list:', error)
    }
  }

  const handleSearchResultSelect = async (result: SearchResult, query: string) => {
    try {
      // Extract annotation from query (everything after the product name)
      // The product name should match the search result name
      const productNameLower = result.name.toLowerCase()
      const queryLower = query.toLowerCase()
      
      let annotationText = ''
      if (queryLower.startsWith(productNameLower)) {
        // Extract everything after the product name
        annotationText = query.substring(result.name.length).trim()
      } else {
        // If product name doesn't match start of query, try parsing the whole query
        const parsed = parseProductInput(query)
        annotationText = parsed.annotation?.fullText || ''
      }

      // Use the selected product's category
      const categoryId = result.category?.id

      if (!categoryId) {
        console.error('Search result has no category')
        return
      }

      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: result.id,
          category_id: categoryId,
          quantity: '1',
          description: annotationText || null,
        }),
      })

      if (response.ok) {
        await fetchItems()
        // Don't clear search query immediately - let user see it was added
        // Clear after a short delay or when they interact again
        setTimeout(() => {
          setSearchQuery('')
          setIsSearchActive(false)
          setSearchResults([])
        }, 500)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error adding search result:', errorData)
      }
    } catch (error) {
      console.error('Error adding search result to list:', error)
    }
  }

  const handleSearchFocus = () => {
    setIsSearchActive(true)
    fetchSuggestions() // Refresh suggestions when search becomes active
  }

  const handleSearchBlur = () => {
    // Don't hide immediately to allow clicks on results
    // Increase timeout to ensure clicks are processed
    setTimeout(() => {
      setIsSearchActive(false)
    }, 300)
  }

  // Show suggestions if:
  // 1. Search is active AND (no query OR query too short) AND (list is empty OR normal behavior)
  // 2. OR if list is completely empty (always show suggestions)
  const showSuggestions = 
    (items.length === 0) || 
    (isSearchActive && (!searchQuery || searchQuery.trim().length < 2))
  
  const showSearchResults = isSearchActive && searchQuery && searchQuery.trim().length >= 2

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <p className="text-gray-500">Laden...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Boodschappen</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <ShoppingList
          items={items}
          onCheck={handleCheck}
          onUncheck={handleUncheck}
          onDelete={handleDelete}
          onUpdateDescription={handleUpdateDescription}
        />
      </main>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        onFocus={handleSearchFocus}
        onBlur={handleSearchBlur}
        placeholder="Typ product (en toelichting)"
      />

      {showSuggestions && (
        <SuggestionBlock
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          isVisible={true}
        />
      )}

      {showSearchResults && (
        <SearchResults
          results={searchResults}
          onSelect={handleSearchResultSelect}
          isVisible={true}
          query={searchQuery}
        />
      )}
    </div>
  )
}
