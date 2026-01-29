'use client'

import { useState, useEffect, useRef } from 'react'
import FloatingAddButton from './FloatingAddButton'
import EmptyListItem from './EmptyListItem'
import InlineSearchDropdown from './InlineSearchDropdown'
import ShoppingList from './ShoppingList'
import ShoppingListSkeleton from './ShoppingListSkeleton'
import PullToRefresh from './PullToRefresh'
import { createClient } from '@/lib/supabase/client'
import {
  useShoppingListItems,
  useCheckItem,
  useUncheckItem,
  useDeleteItem,
  useUpdateDescription,
  useAddItem,
  useClearChecked,
  queryKeys,
} from '@/lib/hooks/use-shopping-list'
import { useQueryClient } from '@tanstack/react-query'
import { useScrollRestore } from '@/lib/hooks/use-scroll-restore'
import { haptic } from '@/lib/haptics'
import { formatTimeAgo } from '@/lib/format-time-ago'

interface SearchResult {
  id: string
  emoji: string
  name: string
  description?: string | null
  score?: number | null
  category: {
    id: string
    name: string
    display_order: number
  } | null
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep letters/numbers/spaces/hyphens
    .replace(/\s+/g, ' ')
}

function tokenize(input: string): string[] {
  const stopwords = new Set([
    'de',
    'het',
    'een',
    'voor',
    'van',
    'met',
    'en',
    'in',
    'op',
    'aan',
    'bij',
    'naar',
    'te',
    'om',
  ])

  return normalizeForMatch(input)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))
}

function tokenOverlapRatio(a: string, b: string): number {
  const aTokens = tokenize(a)
  const bTokens = tokenize(b)
  if (aTokens.length === 0 || bTokens.length === 0) return 0

  const bSet = new Set(bTokens)
  let overlap = 0
  for (const t of aTokens) {
    if (bSet.has(t)) overlap += 1
  }
  return overlap / Math.max(aTokens.length, bTokens.length)
}

function isAcceptableMatch(query: string, candidateName: string, score?: number | null): boolean {
  const q = normalizeForMatch(query)
  const c = normalizeForMatch(candidateName)

  // Exact match always acceptable
  if (q === c) return true

  // If we have Fuse score: require both good score and strong token overlap
  const SCORE_CUTOFF = 0.25
  const OVERLAP_CUTOFF = 0.7
  const overlap = tokenOverlapRatio(query, candidateName)

  if (typeof score === 'number') {
    return score <= SCORE_CUTOFF && overlap >= OVERLAP_CUTOFF
  }

  // Fallback: only accept if token overlap is very strong
  return overlap >= 0.85
}

export default function ShoppingListPage() {
  // Use TanStack Query hooks for data fetching
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useShoppingListItems()
  const queryClient = useQueryClient()

  // Mutations
  const checkItemMutation = useCheckItem()
  const uncheckItemMutation = useUncheckItem()
  const deleteItemMutation = useDeleteItem()
  const updateDescriptionMutation = useUpdateDescription()
  const addItemMutation = useAddItem()
  const clearCheckedMutation = useClearChecked()

  // Empty item state (product name + toelichting)
  const [isEmptyItemOpen, setIsEmptyItemOpen] = useState(false)
  const [emptyItemQuery, setEmptyItemQuery] = useState('')
  const [emptyItemDescription, setEmptyItemDescription] = useState('')
  const [emptyItemSearchResults, setEmptyItemSearchResults] = useState<SearchResult[]>([])
  const [isSearchingEmptyItem, setIsSearchingEmptyItem] = useState(false)
  const [showEmptyItemDropdown, setShowEmptyItemDropdown] = useState(false)
  const [emptyItemKey, setEmptyItemKey] = useState(0) // Key to force remount for focus
  const [shouldFocusEmptyItem, setShouldFocusEmptyItem] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchCacheRef = useRef<Map<string, SearchResult[]>>(new Map())
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<{ userName: string; updatedAt: string } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { clearScroll } = useScrollRestore(scrollContainerRef)

  // Helper function to invalidate queries (used by realtime subscription)
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    // Refresh last update info when items change
    fetchLastUpdate()
  }

  // Fetch last update info
  const fetchLastUpdate = async () => {
    try {
      const response = await fetch('/api/shopping-list/last-update')
      if (response.ok) {
        const data = await response.json()
        setLastUpdate(data.lastUpdate)
      }
    } catch (error) {
      console.error('Error fetching last update:', error)
    }
  }

  // Fetch last update on mount
  useEffect(() => {
    fetchLastUpdate()
  }, [])

  // Update last update info when items change (triggered by realtime subscription)
  useEffect(() => {
    fetchLastUpdate()
  }, [items.length])

  // Pull to refresh handler
  const handleRefresh = async () => {
    clearScroll()
    await refetchItems()
  }

  // Empty item handlers
  const handleOpenEmptyItem = () => {
    setIsEmptyItemOpen(true)
    setEmptyItemQuery('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)
    setEmptyItemKey((prev) => prev + 1) // Force remount for focus
    setShouldFocusEmptyItem(true) // Trigger focus after mount
    
    // Scroll to top so empty item is visible
    requestAnimationFrame(() => {
      const emptyItem = document.querySelector('input[placeholder="Product / item"]')
      if (emptyItem) {
        emptyItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }

  const handleCloseEmptyItem = () => {
    setIsEmptyItemOpen(false)
    setEmptyItemQuery('')
    setEmptyItemDescription('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)
    setIsSearchingEmptyItem(false)
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
      searchAbortRef.current = null
    }
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current)
      searchDebounceTimerRef.current = null
    }
  }

  // Search handler for empty item (near-instant)
  const handleEmptyItemSearch = async (query: string) => {
    setEmptyItemQuery(query)

    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current)
    }

    if (!query || query.trim().length < 2) {
      // Cancel any in-flight request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort()
        searchAbortRef.current = null
      }
      setEmptyItemSearchResults([])
      setIsSearchingEmptyItem(false)
      setShowEmptyItemDropdown(false)
      return
    }

    const normalizedQuery = query.trim().toLowerCase()

    // Show dropdown immediately (will show "Zoeken..." or cached results)
    setShowEmptyItemDropdown(true)

    // Serve cached results instantly if available
    const cached = searchCacheRef.current.get(normalizedQuery)
    if (cached) {
      setEmptyItemSearchResults(cached)
      setIsSearchingEmptyItem(false)
      return
    }

    // Tiny debounce (0ms) to batch rapid state updates; still feels instant
    searchDebounceTimerRef.current = setTimeout(async () => {
      setIsSearchingEmptyItem(true)

      // Abort any previous request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort()
      }
      const controller = new AbortController()
      searchAbortRef.current = controller

      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (response.ok) {
          const data = await response.json()
          const results: SearchResult[] = Array.isArray(data.products) ? data.products : []
          searchCacheRef.current.set(normalizedQuery, results)
          setEmptyItemSearchResults(results)
        }
      } catch (error) {
        // Ignore abort errors (expected when typing fast)
        if ((error as any)?.name !== 'AbortError') {
          console.error('Error searching products:', error)
        }
      } finally {
        setIsSearchingEmptyItem(false)
      }
    }, 0)
  }

  // Add product from empty item (optimistic UI) – list + save to product DB
  const handleEmptyItemAdd = async (productName: string, description: string | null) => {
    if (!productName.trim()) {
      handleCloseEmptyItem()
      return
    }

    haptic('light')

    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: null,
      product_name: productName.trim(),
      emoji: '📦',
      quantity: '1',
      description: description,
      category_id: '',
      category: null,
      is_checked: false,
      checked_at: null,
      created_at: new Date().toISOString(),
    }

    queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => [
      optimisticItem,
      ...old,
    ])

    setEmptyItemQuery('')
    setEmptyItemDescription('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)

    try {
      let searchResponse = await fetch(`/api/products/search?q=${encodeURIComponent(productName.trim())}`)
      let productId: string | null = null
      let categoryId: string | null = null
      let emoji = '📦'

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (Array.isArray(searchData.products) && searchData.products.length > 0) {
          const matchedProduct = searchData.products[0]
          const ok = isAcceptableMatch(productName.trim(), matchedProduct.name, matchedProduct.score)
          if (ok) {
            productId = matchedProduct.id
            categoryId = matchedProduct.category?.id || null
            emoji = matchedProduct.emoji
          }
        }
      }

      // If no match, create new product
      if (!productId) {
        const createResponse = await fetch('/api/products/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: productName }),
        })

        if (createResponse.ok) {
          const createData = await createResponse.json()
          productId = createData.product.id
          // IMPORTANT: Use the category_id from the created product
          categoryId = createData.product.category_id
          emoji = createData.product.emoji
          
          // Double-check: if category_id is still null, something went wrong
          if (!categoryId) {
            console.error('Created product but category_id is null:', createData.product)
          }
        }
      }

      // Fallback: get category if still missing (shouldn't happen, but safety check)
      if (!categoryId) {
        const userResponse = await fetch('/api/user/current')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          const categoryResponse = await fetch('/api/categories')
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json()
            const categories = categoryData.categories || []
            const overigCategory = categories.find((c: any) => c.name === 'Overig')
            if (overigCategory) {
              categoryId = overigCategory.id
            }
          }
        }
      }

      // Ensure we have a category_id before proceeding
      if (!categoryId) {
        // Remove optimistic item on error
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
          old.filter((item) => item.id !== tempId)
        )
        setErrorMessage('Kon categorie niet vinden. Probeer het opnieuw.')
        setTimeout(() => setErrorMessage(null), 5000)
        return
      }

      const requestBody = {
        product_id: productId,
        product_name: productId ? null : productName.trim(),
        category_id: categoryId,
        quantity: '1',
        description: description,
      }

      const addResponse = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (addResponse.ok) {
        const addData = await addResponse.json()
        const newItem = addData.item

        // Replace optimistic item with real item
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => {
          const filtered = old.filter((item) => item.id !== tempId)
          return [newItem, ...filtered]
        })

        // Keep empty item open and force remount for focus
        setEmptyItemKey((prev) => prev + 1)
        // Focus will be handled by EmptyListItem's autoFocus prop
      } else {
        // Error: remove optimistic item
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
          old.filter((item) => item.id !== tempId)
        )
        setErrorMessage('Kon product niet toevoegen. Probeer het opnieuw.')
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error adding product:', error)
      // Remove optimistic item on error
      queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
        old.filter((item) => item.id !== tempId)
      )
      setErrorMessage('Kon product niet toevoegen. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  // Add to list only (one-time item, no product in DB)
  const handleAddToListOnly = async (productName: string, description: string | null) => {
    if (!productName.trim()) {
      handleCloseEmptyItem()
      return
    }
    haptic('light')
    const name = productName.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: null,
      product_name: name,
      emoji: '📦',
      quantity: '1',
      description: description,
      category_id: '',
      category: null,
      is_checked: false,
      checked_at: null,
      created_at: new Date().toISOString(),
    }
    queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => [
      optimisticItem,
      ...old,
    ])
    setEmptyItemQuery('')
    setEmptyItemDescription('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)
    try {
      const categoryResponse = await fetch('/api/categories')
      if (!categoryResponse.ok) {
        throw new Error('Kon categorieën niet ophalen')
      }
      const categoryData = await categoryResponse.json()
      const categories = categoryData.categories || []
      const overigCategory = categories.find((c: any) => c.name === 'Overig')
      if (!overigCategory) {
        throw new Error('Overig-categorie niet gevonden')
      }
      const addResponse = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: name,
          category_id: overigCategory.id,
          quantity: '1',
          description: description,
        }),
      })
      if (addResponse.ok) {
        const addData = await addResponse.json()
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => {
          const filtered = old.filter((item) => item.id !== tempId)
          return [addData.item, ...filtered]
        })
        setEmptyItemKey((prev) => prev + 1)
      } else {
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
          old.filter((item) => item.id !== tempId)
        )
        setErrorMessage('Kon item niet toevoegen.')
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error adding list-only item:', error)
      queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
        old.filter((item) => item.id !== tempId)
      )
      setErrorMessage('Kon item niet toevoegen.')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  // Handle search result select from dropdown (query = product name; description from toelichting field)
  const handleEmptyItemResultSelect = async (result: SearchResult, _query: string) => {
    haptic('light')
    const annotationText = emptyItemDescription.trim() || null

    // Get category
    let categoryId = result.category?.id
    if (!categoryId) {
      const productResponse = await fetch(`/api/products/${result.id}`)
      if (productResponse.ok) {
        const productData = await productResponse.json()
        categoryId = productData.product?.category_id
      }
    }

    if (!categoryId) {
      setErrorMessage('Kon categorie niet vinden')
      setTimeout(() => setErrorMessage(null), 5000)
      return
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: result.id,
      product_name: null,
      emoji: result.emoji,
      quantity: '1',
      description: annotationText || null,
      category_id: categoryId,
      category: result.category,
      is_checked: false,
      checked_at: null,
      created_at: new Date().toISOString(),
    }

    queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => [
      optimisticItem,
      ...old,
    ])

    setEmptyItemQuery('')
    setEmptyItemDescription('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)

    try {
      const requestBody = {
        product_id: result.id,
        category_id: categoryId,
        quantity: '1',
        description: annotationText,
      }

      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        // Replace optimistic item
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => {
          const filtered = old.filter((item) => item.id !== tempId)
          return [data.item, ...filtered]
        })
        // Keep empty item open and force remount for focus
        setEmptyItemKey((prev) => prev + 1)
        // Focus will be handled by EmptyListItem's autoFocus prop
      } else {
        // Remove optimistic item on error
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
          old.filter((item) => item.id !== tempId)
        )
        setErrorMessage('Kon product niet toevoegen')
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error adding product:', error)
      queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
        old.filter((item) => item.id !== tempId)
      )
      setErrorMessage('Kon product niet toevoegen')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current)
      }
    }
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const userResponse = await fetch('/api/user/current')
        if (!userResponse.ok) return
        
        const userData = await userResponse.json()
        if (!userData.household_id) return

        const supabase = createClient()
        
        const channel = supabase
          .channel('shopping_list_items_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'shopping_list_items',
              filter: `household_id=eq.${userData.household_id}`,
            },
            () => invalidateQueries()
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'shopping_list_items',
              filter: `household_id=eq.${userData.household_id}`,
            },
            () => invalidateQueries()
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'shopping_list_items',
              filter: `household_id=eq.${userData.household_id}`,
            },
            () => invalidateQueries()
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Error setting up realtime subscription:', error)
      }
    }

    const cleanup = setupRealtime()
    
    return () => {
      if (cleanup) {
        cleanup.then((cleanupFn) => {
          if (cleanupFn) cleanupFn()
        })
      }
    }
  }, [queryClient])

  const purchaseHistoryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleCheck = async (id: string) => {
    haptic('light')
    try {
      const existingTimer = purchaseHistoryTimersRef.current.get(id)
      if (existingTimer) {
        clearTimeout(existingTimer)
        purchaseHistoryTimersRef.current.delete(id)
      }

      const result = await checkItemMutation.mutateAsync(id)
      
      const checkedAt = result?.item?.checked_at || new Date().toISOString()
      const checkedAtTime = new Date(checkedAt).getTime()
      const now = Date.now()
      const delay = 30000 - (now - checkedAtTime)
      const timerDelay = Math.max(delay, 0)
      
      const timer = setTimeout(async () => {
        try {
          const checkResponse = await fetch(`/api/shopping-list/record-purchase/${id}`, {
            method: 'POST',
          })
          
          if (checkResponse.ok) {
            const result = await checkResponse.json()
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
            }
          }
        } catch (error) {
          console.error(`Error recording purchase history for item ${id}:`, error)
        } finally {
          purchaseHistoryTimersRef.current.delete(id)
        }
      }, timerDelay)

      purchaseHistoryTimersRef.current.set(id, timer)
    } catch (error) {
      setErrorMessage('Kon item niet afvinken. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error checking item:', error)
    }
  }

  const handleUncheck = async (id: string) => {
    haptic('light')
    try {
      const timer = purchaseHistoryTimersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
      }
      await uncheckItemMutation.mutateAsync(id)
    } catch (error) {
      setErrorMessage('Kon item niet unchecken. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error unchecking item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    haptic('medium')
    try {
      await deleteItemMutation.mutateAsync(id)
    } catch (error) {
      setErrorMessage('Kon item niet verwijderen. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error deleting item:', error)
    }
  }

  const handleUpdateDescription = async (id: string, description: string) => {
    try {
      await updateDescriptionMutation.mutateAsync({ id, description })
    } catch (error) {
      setErrorMessage('Kon toelichting niet opslaan. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error updating description:', error)
    }
  }

  const handleClearChecked = async () => {
    const checkedCount = items.filter((item) => item.is_checked).length
    
    if (checkedCount === 0) {
      return
    }

    const confirmed = confirm(
      `Weet je zeker dat je alle ${checkedCount} afgevinkte item${checkedCount > 1 ? 's' : ''} wilt verwijderen?`
    )

    if (!confirmed) {
      return
    }

    try {
      await clearCheckedMutation.mutateAsync()
    } catch (error) {
      setErrorMessage('Kon afgevinkte items niet verwijderen. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error clearing checked items:', error)
    }
  }

  // Cleanup purchase history timers on unmount
  useEffect(() => {
    return () => {
      purchaseHistoryTimersRef.current.forEach((timer) => {
        clearTimeout(timer)
      })
      purchaseHistoryTimersRef.current.clear()
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Boodschappen</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              {lastUpdate.userName} • {formatTimeAgo(lastUpdate.updatedAt)}
            </p>
          )}
        </div>
      </header>

      <main 
        ref={scrollContainerRef}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <PullToRefresh onRefresh={handleRefresh} scrollContainerRef={scrollContainerRef}>
          {isLoadingItems ? (
            <ShoppingListSkeleton />
          ) : (
            <>
              {/* Empty item at top */}
              {isEmptyItemOpen && (
                <>
                  <EmptyListItem
                    key={emptyItemKey}
                    productName={emptyItemQuery}
                    onProductNameChange={(v) => {
                      setEmptyItemQuery(v)
                      handleEmptyItemSearch(v)
                    }}
                    description={emptyItemDescription}
                    onDescriptionChange={setEmptyItemDescription}
                    onAdd={(name, desc) => {
                      if (showEmptyItemDropdown && emptyItemSearchResults.length === 0 && name.trim().length >= 2) {
                        handleAddToListOnly(name.trim(), desc)
                      } else {
                        handleEmptyItemAdd(name, desc)
                      }
                    }}
                    onCancel={() => {
                      handleCloseEmptyItem()
                      setShouldFocusEmptyItem(false)
                    }}
                    autoFocus={shouldFocusEmptyItem}
                    onFocusComplete={() => setShouldFocusEmptyItem(false)}
                  />
                  {/* Inline search dropdown */}
                  {showEmptyItemDropdown && emptyItemQuery.trim().length >= 2 && (
                    <InlineSearchDropdown
                      results={emptyItemSearchResults}
                      query={emptyItemQuery}
                      description={emptyItemDescription}
                      isVisible={true}
                      isSearching={isSearchingEmptyItem}
                      onSelect={handleEmptyItemResultSelect}
                      onAddToListOnly={handleAddToListOnly}
                      onAddToListAndSaveProduct={handleEmptyItemAdd}
                    />
                  )}
                </>
              )}
              <ShoppingList
                items={items}
                onCheck={handleCheck}
                onUncheck={handleUncheck}
                onDelete={handleDelete}
                onUpdateDescription={handleUpdateDescription}
                onClearChecked={handleClearChecked}
              />
            </>
          )}
        </PullToRefresh>
      </main>

      {/* Floating add button */}
      <FloatingAddButton onClick={handleOpenEmptyItem} />

      {/* Error message toast */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="mx-auto max-w-md rounded-lg bg-red-50 border border-red-200 px-4 py-3 shadow-lg">
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}
