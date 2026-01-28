'use client'

import { useState, useEffect, useRef } from 'react'
import SearchOverlay from './SearchOverlay'
import ShoppingList from './ShoppingList'
import ShoppingListSkeleton from './ShoppingListSkeleton'
import PullToRefresh from './PullToRefresh'
import { parseProductInput } from '@/lib/annotation-parser'
import { createClient } from '@/lib/supabase/client'
import {
  useShoppingListItems,
  useSuggestions,
  useCheckItem,
  useUncheckItem,
  useDeleteItem,
  useUpdateDescription,
  useAddItem,
  useClearChecked,
  type ShoppingListItemData,
  type Suggestion,
  queryKeys,
} from '@/lib/hooks/use-shopping-list'
import { useQueryClient } from '@tanstack/react-query'
import { useScrollRestore } from '@/lib/hooks/use-scroll-restore'
import { haptic } from '@/lib/haptics'
import { useSearch } from './SearchContext'
import { formatTimeAgo } from '@/lib/format-time-ago'

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
  // Use TanStack Query hooks for data fetching
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useShoppingListItems()
  const { data: suggestions = [], isLoading: isLoadingSuggestions, refetch: refetchSuggestions } = useSuggestions()
  const queryClient = useQueryClient()

  // Mutations
  const checkItemMutation = useCheckItem()
  const uncheckItemMutation = useUncheckItem()
  const deleteItemMutation = useDeleteItem()
  const updateDescriptionMutation = useUpdateDescription()
  const addItemMutation = useAddItem()
  const clearCheckedMutation = useClearChecked()

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const { isSearchActive, setIsSearchActive } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [keepSuggestionsOpen, setKeepSuggestionsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addedResultIds, setAddedResultIds] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<{ userName: string; updatedAt: string } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { clearScroll } = useScrollRestore(scrollContainerRef)

  // Helper function to invalidate queries (used by realtime subscription)
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
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

  // Pull to refresh handler - use refetch for faster refresh
  const handleRefresh = async () => {
    clearScroll() // Clear scroll position on refresh
    // Use refetch instead of invalidate for faster response
    // Refetch immediately fetches new data, invalidate waits for next use
    await Promise.all([
      refetchItems(),
      refetchSuggestions(),
    ])
  }

  // Search products
  const handleSearch = async (query: string) => {
    // Don't update searchQuery here - it's already updated by onChange
    // This prevents clearing results while user is typing

    // If user starts typing, close suggestions
    if (query && query.trim().length > 0) {
      setKeepSuggestionsOpen(false)
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:104',message:'Search results received',data:{query,resultsCount:data.products?.length,results:data.products?.map((p:any)=>({id:p.id,name:p.name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        // Only update results if we got results, don't clear if search failed
        if (data.products && data.products.length > 0) {
          setSearchResults(data.products)
        } else {
          // Only clear if query is definitely not matching (not just typing)
          // Keep previous results while user is still typing
          const trimmedQuery = query.trim()
          if (trimmedQuery.length >= 3) {
            setSearchResults([])
          }
        }
      }
    } catch (error) {
      console.error('Error searching products:', error)
      // Don't clear results on error - keep previous results visible
    } finally {
      setIsSearching(false)
    }
  }

  const handleCloseSuggestions = () => {
    setKeepSuggestionsOpen(false)
    setIsSearchActive(false)
    setSearchQuery('')
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

  // Set up realtime subscription for shopping list items
  useEffect(() => {
    // Get household_id from user API
    const setupRealtime = async () => {
      try {
        const userResponse = await fetch('/api/user/current')
        if (!userResponse.ok) return
        
        const userData = await userResponse.json()
        if (!userData.household_id) return

        const supabase = createClient()
        
        // Subscribe to changes in shopping_list_items for this household
        // Use separate subscriptions for better reliability with DELETE events
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
            (payload) => {
              console.log('Realtime INSERT:', payload)
              invalidateQueries()
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'shopping_list_items',
              filter: `household_id=eq.${userData.household_id}`,
            },
            (payload) => {
              console.log('Realtime UPDATE:', payload)
              invalidateQueries()
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'shopping_list_items',
              filter: `household_id=eq.${userData.household_id}`,
            },
            (payload) => {
              console.log('Realtime DELETE:', payload)
              invalidateQueries()
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status)
          })

        // Cleanup subscription on unmount
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
      // Clear any existing timer for this item first
      const existingTimer = purchaseHistoryTimersRef.current.get(id)
      if (existingTimer) {
        clearTimeout(existingTimer)
        purchaseHistoryTimersRef.current.delete(id)
      }

      // Wait for mutation to complete and get the response
      const result = await checkItemMutation.mutateAsync(id)
      
      // Get the checked_at timestamp from the server response
      // This ensures we use the actual server time, not the optimistic update time
      const checkedAt = result?.item?.checked_at || new Date().toISOString()
      const checkedAtTime = new Date(checkedAt).getTime()
      const now = Date.now()
      const delay = 30000 - (now - checkedAtTime) // Adjust delay based on actual server time
      
      // Schedule purchase history recording after 30 seconds from server checked_at
      // Use max to ensure we don't go negative
      const timerDelay = Math.max(delay, 0)
      
      const timer = setTimeout(async () => {
        try {
          // Verify item is still checked before recording
          const checkResponse = await fetch(`/api/shopping-list/record-purchase/${id}`, {
            method: 'POST',
          })
          
          if (checkResponse.ok) {
            const result = await checkResponse.json()
            if (result.success) {
              // Refresh suggestions as purchase history affects predictions
              queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
              console.log(`✅ Purchase history recorded for item ${id}`)
            } else {
              console.warn(`⚠️ Purchase history not recorded for item ${id}:`, result.message)
            }
          } else {
            const errorData = await checkResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error(`❌ Error recording purchase history for item ${id}:`, errorData)
          }
        } catch (error) {
          console.error(`❌ Error recording purchase history for item ${id}:`, error)
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
      // Cancel purchase history timer if item is unchecked before 30 seconds
      const timer = purchaseHistoryTimersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        purchaseHistoryTimersRef.current.delete(id)
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

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:186',message:'handleSuggestionSelect entry',data:{suggestionId:suggestion.id,suggestionName:suggestion.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      // Fetch the product to get its category_id and full product info
      const productResponse = await fetch(`/api/products/${suggestion.id}`)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:190',message:'Product fetch response',data:{ok:productResponse.ok,status:productResponse.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (!productResponse.ok) {
        console.error('Failed to fetch product:', productResponse.status)
        return
      }

      const productData = await productResponse.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:196',message:'Product data received',data:{hasProduct:!!productData.product,productId:productData.product?.id,productName:productData.product?.name,categoryId:productData.product?.category_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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

      const requestBody = {
        product_id: suggestion.id, // Use product_id so it links to the product
        category_id: categoryId,
        quantity: '1',
        description: product.description || null, // Auto-populate from product description
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:210',message:'Creating shopping list item',data:{requestBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      // Fix: Use only mutation, not direct fetch (removes double-add bug)
      await addItemMutation.mutateAsync(requestBody)
      // Keep suggestions open after adding
      setKeepSuggestionsOpen(true)
      setIsSearchActive(true) // Keep search active to show suggestions
      setSearchQuery('') // Clear search query
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:231',message:'Exception in handleSuggestionSelect',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.error('Error adding suggestion to list:', error)
    }
  }

  const handleSearchResultSelect = async (result: SearchResult, query: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:235',message:'handleSearchResultSelect entry',data:{resultId:result.id,resultName:result.name,query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    try {
      // Extract annotation from query (everything after the product name)
      // The product name should match the search result name
      const productNameLower = result.name.toLowerCase()
      const queryLower = query.toLowerCase()
      
      let annotationText = ''
      if (queryLower.startsWith(productNameLower)) {
        // Extract everything after the product name
        annotationText = query.substring(result.name.length).trim()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:245',message:'Annotation extracted',data:{productName:result.name,query,annotationText,substringStart:result.name.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
      } else {
        // If product name doesn't match start of query, try parsing the whole query
        const parsed = parseProductInput(query)
        annotationText = parsed.annotation?.fullText || ''
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:249',message:'Annotation parsed via parser',data:{query,parsedAnnotation:parsed.annotation,annotationText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
      }

      // Use the selected product's category
      const categoryId = result.category?.id

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:297',message:'Category check',data:{resultId:result.id,hasCategory:!!result.category,categoryId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      if (!categoryId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:300',message:'Search result has no category - fetching product',data:{resultId:result.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        // Fetch product to get category_id
        try {
          const productResponse = await fetch(`/api/products/${result.id}`)
          if (productResponse.ok) {
            const productData = await productResponse.json()
            const fetchedCategoryId = productData.product?.category_id
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:307',message:'Fetched category from product',data:{fetchedCategoryId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
            // #endregion
            if (fetchedCategoryId) {
            // Fetch full product to get description
            const fullProductResponse = await fetch(`/api/products/${result.id}`)
            const fullProductData = fullProductResponse.ok ? await fullProductResponse.json() : null
            const productDescription = fullProductData?.product?.description || null
            
            // Use product description as initial description, or annotation if provided
            const initialDescription = annotationText || productDescription || null
            
              const requestBody = {
                product_id: result.id,
                category_id: fetchedCategoryId,
                quantity: '1',
                description: initialDescription,
              }
              await addItemMutation.mutateAsync(requestBody)
              // Mark result as added for green highlight
              setAddedResultIds((prev) => new Set(prev).add(result.id))
              // Clear search query so user can continue searching
              setSearchQuery('')
              // Keep overlay open
              return
            }
          }
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:342',message:'Error fetching product for category',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
        }
        console.error('Search result has no category')
        return
      }

      // Fetch full product to get description
      const fullProductResponse = await fetch(`/api/products/${result.id}`)
      const fullProductData = fullProductResponse.ok ? await fullProductResponse.json() : null
      const productDescription = fullProductData?.product?.description || null
      
      // Use product description as initial description, or annotation if provided
      const initialDescription = annotationText || productDescription || null
      
      const requestBody = {
        product_id: result.id,
        category_id: categoryId,
        quantity: '1',
        description: initialDescription,
      }
      await addItemMutation.mutateAsync(requestBody)
      // Mark result as added for green highlight
      setAddedResultIds((prev) => new Set(prev).add(result.id))
      // Clear search query so user can continue searching
      setSearchQuery('')
      // Keep overlay open
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:285',message:'Exception in handleSearchResultSelect',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      console.error('Error adding search result to list:', error)
    }
  }

  const handleSearchFocus = () => {
    setIsSearchActive(true)
    // Refresh suggestions when search becomes active
    queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
    
    // Prevent page scrolling when keyboard appears on mobile
    // Only apply on mobile devices
    if (window.innerWidth <= 768) {
      // Store current scroll position
      const scrollY = window.scrollY || window.pageYOffset
      // Save scroll position to data attribute
      document.documentElement.setAttribute('data-scroll-y', scrollY.toString())
      // Prevent body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    }
  }

  const handleSearchBlur = () => {
    // Restore scroll position when keyboard closes
    // Only apply on mobile devices
    if (window.innerWidth <= 768) {
      const scrollY = document.documentElement.getAttribute('data-scroll-y')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      document.documentElement.removeAttribute('data-scroll-y')
      
      if (scrollY) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(scrollY))
        })
      }
    }
    // Note: Don't close overlay on blur - let user close explicitly or with Escape
  }

  // Show suggestions if:
  // 1. List is empty (always show suggestions when not searching)
  // 2. OR search is active AND (no query OR query too short) - but NOT if there's a search query >= 2 chars
  // 3. OR keepSuggestionsOpen is true (after adding from suggestions)
  const showSearchResults = Boolean(isSearchActive && searchQuery && searchQuery.trim().length >= 2)
  const showSuggestions = 
    keepSuggestionsOpen ||
    (!showSearchResults && items.length === 0) || 
    (!showSearchResults && isSearchActive && (!searchQuery || searchQuery.trim().length < 2))
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:297',message:'Visibility state',data:{itemsLength:items.length,isSearchActive,searchQuery,searchQueryLength:searchQuery?.trim().length,showSuggestions,showSearchResults},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7'})}).catch(()=>{});
  }, [items.length, isSearchActive, searchQuery, showSuggestions, showSearchResults]);
  // #endregion

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
            <ShoppingList
              items={items}
              onCheck={handleCheck}
              onUncheck={handleUncheck}
              onDelete={handleDelete}
              onUpdateDescription={handleUpdateDescription}
              onClearChecked={handleClearChecked}
            />
          )}
        </PullToRefresh>
      </main>

      {/* Regular search bar (shown when overlay is not active) */}
      {!isSearchActive && (
        <div className="fixed bottom-[92px] left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-md">
            <div
              className="relative rounded-lg bg-white shadow-lg ring-1 ring-gray-200"
              onClick={handleSearchFocus}
            >
              <div className="flex items-center gap-3 px-4 py-3 cursor-text">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="flex-1 text-base text-gray-400">
                  Typ product (en toelichting)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Overlay */}
      <SearchOverlay
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        isSearching={isSearching}
        suggestions={suggestions}
        isLoadingSuggestions={isLoadingSuggestions}
        searchResults={searchResults}
        showSearchResults={showSearchResults}
        showSuggestions={showSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        onSearchResultSelect={handleSearchResultSelect}
        onCloseSuggestions={handleCloseSuggestions}
        addedResultIds={addedResultIds}
        onSearchFocus={handleSearchFocus}
      />

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
