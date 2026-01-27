'use client'

import { useState, useEffect, useRef } from 'react'
import SearchBar from './SearchBar'
import SuggestionBlock from './SuggestionBlock'
import SearchResults from './SearchResults'
import ShoppingList from './ShoppingList'
import { parseProductInput } from '@/lib/annotation-parser'
import { createClient } from '@/lib/supabase/client'

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
  const [keepSuggestionsOpen, setKeepSuggestionsOpen] = useState(false)

  // Fetch shopping list items
  const fetchItems = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:55',message:'fetchItems entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    try {
      const response = await fetch('/api/shopping-list')
      if (response.ok) {
        const data = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:60',message:'Items fetched',data:{itemsCount:data.items?.length,items:data.items?.map((i:any)=>({id:i.id,productId:i.product_id,productName:i.product_name,emoji:i.emoji}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setItems(data.items || [])
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:64',message:'Error fetching items',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
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
    // Don't update searchQuery here - it's already updated by onChange
    // This prevents clearing results while user is typing

    // If user starts typing, close suggestions
    if (query && query.trim().length > 0) {
      setKeepSuggestionsOpen(false)
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([])
      return
    }

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
    fetchItems()
    fetchSuggestions()

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
              fetchItems()
              fetchSuggestions()
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
              fetchItems()
              fetchSuggestions()
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
              fetchItems()
              fetchSuggestions()
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
  }, [])

  const purchaseHistoryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleCheck = async (id: string) => {
    try {
      const response = await fetch(`/api/shopping-list/check/${id}`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh items and suggestions
        await fetchItems()
        await fetchSuggestions()

        // Schedule purchase history recording after 30 seconds
        // Clear any existing timer for this item
        const existingTimer = purchaseHistoryTimersRef.current.get(id)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        const timer = setTimeout(async () => {
          try {
            // Verify item is still checked before recording
            const checkResponse = await fetch(`/api/shopping-list/record-purchase/${id}`, {
              method: 'POST',
            })
            if (checkResponse.ok) {
              // Refresh suggestions as purchase history affects predictions
              await fetchSuggestions()
            }
          } catch (error) {
            console.error('Error recording purchase history:', error)
          } finally {
            purchaseHistoryTimersRef.current.delete(id)
          }
        }, 30000) // 30 seconds

        purchaseHistoryTimersRef.current.set(id, timer)
      } else {
        console.error('Error checking item')
      }
    } catch (error) {
      console.error('Error checking item:', error)
    }
  }

  const handleUncheck = async (id: string) => {
    try {
      // Cancel purchase history timer if item is unchecked before 30 seconds
      const timer = purchaseHistoryTimersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        purchaseHistoryTimersRef.current.delete(id)
      }

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
      const response = await fetch('/api/shopping-list/clear-checked', {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchItems()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error clearing checked items:', errorData)
        alert('Er is een fout opgetreden bij het verwijderen van de items.')
      }
    } catch (error) {
      console.error('Error clearing checked items:', error)
      alert('Er is een fout opgetreden bij het verwijderen van de items.')
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
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:222',message:'Shopping list POST response',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      if (response.ok) {
        const responseData = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:225',message:'Item created successfully',data:{itemId:responseData.item?.id,productId:responseData.item?.product_id,productName:responseData.item?.product_name,emoji:responseData.item?.emoji},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        await fetchItems()
        await fetchSuggestions() // Refresh suggestions to remove the added product
        // Keep suggestions open after adding
        setKeepSuggestionsOpen(true)
        setIsSearchActive(true) // Keep search active to show suggestions
        setSearchQuery('') // Clear search query
      } else {
        const errorData = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:228',message:'Error adding suggestion',data:{error:errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        console.error('Error adding suggestion:', errorData)
      }
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
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:260',message:'Creating shopping list item from search',data:{requestBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
              // #endregion
              const response = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              })
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:273',message:'Search result POST response',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
              // #endregion
              if (response.ok) {
                const responseData = await response.json()
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:275',message:'Search result item created',data:{itemId:responseData.item?.id,description:responseData.item?.description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
                // #endregion
                await fetchItems()
                setTimeout(() => {
                  setSearchQuery('')
                  setIsSearchActive(false)
                  setSearchResults([])
                }, 500)
                return
              } else {
                const errorData = await response.json().catch(() => ({}))
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:283',message:'Error adding search result',data:{error:errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
                // #endregion
                console.error('Error adding search result:', errorData)
                return
              }
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:260',message:'Creating shopping list item from search',data:{requestBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:273',message:'Search result POST response',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      if (response.ok) {
        const responseData = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:275',message:'Search result item created',data:{itemId:responseData.item?.id,description:responseData.item?.description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:283',message:'Error adding search result',data:{error:errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        console.error('Error adding search result:', errorData)
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:285',message:'Exception in handleSearchResultSelect',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      console.error('Error adding search result to list:', error)
    }
  }

  const handleSearchFocus = () => {
    setIsSearchActive(true)
    fetchSuggestions() // Refresh suggestions when search becomes active
    
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
    
    // Don't hide immediately to allow clicks on results
    // Increase timeout to ensure clicks are processed
    setTimeout(() => {
      setIsSearchActive(false)
    }, 300)
  }

  // Show suggestions if:
  // 1. List is empty (always show suggestions when not searching)
  // 2. OR search is active AND (no query OR query too short) - but NOT if there's a search query >= 2 chars
  // 3. OR keepSuggestionsOpen is true (after adding from suggestions)
  const showSearchResults = isSearchActive && searchQuery && searchQuery.trim().length >= 2
  const showSuggestions = 
    keepSuggestionsOpen ||
    (!showSearchResults && items.length === 0) || 
    (!showSearchResults && isSearchActive && (!searchQuery || searchQuery.trim().length < 2))
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShoppingListPage.tsx:297',message:'Visibility state',data:{itemsLength:items.length,isSearchActive,searchQuery,searchQueryLength:searchQuery?.trim().length,showSuggestions,showSearchResults},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7'})}).catch(()=>{});
  }, [items.length, isSearchActive, searchQuery, showSuggestions, showSearchResults]);
  // #endregion

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
          onClearChecked={handleClearChecked}
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
          onClose={handleCloseSuggestions}
          isVisible={showSuggestions}
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
