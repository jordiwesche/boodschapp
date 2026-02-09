'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import FloatingAddButton from './FloatingAddButton'
import { EMOJI_PICKER_LIST } from '@/lib/emoji-picker-list'
import EmptyListItem from './EmptyListItem'
import InlineSearchDropdown from './InlineSearchDropdown'
import ShoppingList from './ShoppingList'
import ShoppingListSkeleton from './ShoppingListSkeleton'
import PullToRefresh from './PullToRefresh'
import { createClient } from '@/lib/supabase/client'
import {
  useShoppingListItems,
  useExpectedProducts,
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
import { predictCategoryAndEmoji } from '@/lib/predict-category-emoji'
import { findCategoryIdByPredictedName } from '@/lib/category-aliases'
import { parseProductInput } from '@/lib/annotation-parser'
import { getQueryRemainderAsDescription } from '@/lib/search'

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

function SaveProductEmojiDropdown({
  emojiSearchQuery,
  setEmojiSearchQuery,
  onSelect,
  onClose,
  anchorRef,
}: {
  emojiSearchQuery: string
  setEmojiSearchQuery: (q: string) => void
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 280 })

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const dropdownHeight = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight
    setPosition({
      top: openAbove ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [anchorRef])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  const filtered = emojiSearchQuery
    ? EMOJI_PICKER_LIST.filter((item) =>
        item.name.toLowerCase().includes(emojiSearchQuery.toLowerCase())
      )
    : EMOJI_PICKER_LIST

  return (
    <div
      ref={dropdownRef}
      className="rounded-md border border-gray-200 bg-white shadow-lg"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: 'min(320px, 50vh)',
        zIndex: 9999,
      }}
    >
      <div className="border-b border-gray-200 p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={emojiSearchQuery}
            onChange={(e) => setEmojiSearchQuery(e.target.value)}
            placeholder="Zoek emoji..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-8 gap-1">
            {filtered.map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() => onSelect(item.emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-gray-100"
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-500">Geen emoji&apos;s gevonden</div>
        )}
      </div>
    </div>
  )
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

/** Known Dutch singular ↔ plural pairs (normalized lower case). Checked first so e.g. banaan ↔ bananen always matches. */
const DUTCH_SINGULAR_PLURAL_PAIRS: [string, string][] = [
  ['banaan', 'bananen'],
  ['appel', 'appels'],
  ['peer', 'peren'],
  ['sinaasappel', 'sinaasappelen'],
  ['citroen', 'citroenen'],
  ['tomaat', 'tomaten'],
  ['aardappel', 'aardappelen'],
  ['ui', 'uien'],
  ['komkommer', 'komkommers'],
]

function isKnownSingularPluralPair(q: string, c: string): boolean {
  if (q === c) return true
  for (const [a, b] of DUTCH_SINGULAR_PLURAL_PAIRS) {
    if ((q === a && c === b) || (q === b && c === a)) return true
  }
  return false
}

/** True if query and name are exact match (normalized) or Dutch singular/plural (banaan/bananen, appel/appels). */
function isExactOrSingularPluralMatch(query: string, name: string): boolean {
  const q = normalizeForMatch(query)
  const c = normalizeForMatch(name)
  if (q === c) return true
  if (q.length < 2 || c.length < 2) return false
  if (isKnownSingularPluralPair(q, c)) return true
  if (q + 's' === c || c + 's' === q) return true
  if (c.endsWith('en') && c.length >= 4) {
    const stemC = c.slice(0, -2)
    if (q === stemC || (q.startsWith(stemC) && q.length === stemC.length + 1)) return true
  }
  if (q.endsWith('en') && q.length >= 4) {
    const stemQ = q.slice(0, -2)
    if (c === stemQ || (c.startsWith(stemQ) && c.length === stemQ.length + 1)) return true
  }
  return false
}

/** 1 = perfect, 2 = word match / small diff, 3 = no good match. Based on best result only. */
function getMatchLevel(query: string, results: SearchResult[]): 1 | 2 | 3 {
  if (!results || results.length === 0) return 3
  const best = results[0]
  const score = best.score ?? null
  const overlap = tokenOverlapRatio(query, best.name)

  if (isExactOrSingularPluralMatch(query, best.name)) return 1
  if (typeof score === 'number' && score <= 0.1 && overlap === 1) return 1

  if (typeof score === 'number' && score <= 0.35) return 2
  if (overlap >= 0.5) return 2

  // Query contains product name (e.g. "grote zak spinazie" → Spinazie): show results
  const qNorm = normalizeForMatch(query)
  const nameNorm = normalizeForMatch(best.name)
  if (nameNorm.length >= 2 && qNorm.includes(nameNorm)) return 2

  return 3
}

function isAcceptableMatch(query: string, candidateName: string, score?: number | null): boolean {
  const q = normalizeForMatch(query)
  const c = normalizeForMatch(candidateName)

  // Exact match always acceptable
  if (q === c) return true

  // Dutch singular/plural: first known pairs (banaan ↔ bananen etc.), then -s/-en rules
  if (q.length >= 2 && c.length >= 2) {
    if (isKnownSingularPluralPair(q, c)) return true
    if (q + 's' === c || c + 's' === q) return true // appel ↔ appels
    // -en plural: bananen → stem "banan", singular "banaan" (stem + one char)
    if (c.endsWith('en') && c.length >= 4) {
      const stemC = c.slice(0, -2)
      if (q === stemC || (q.startsWith(stemC) && q.length === stemC.length + 1)) return true
    }
    if (q.endsWith('en') && q.length >= 4) {
      const stemQ = q.slice(0, -2)
      if (c === stemQ || (c.startsWith(stemQ) && c.length === stemQ.length + 1)) return true
    }
  }

  // If we have Fuse score: require both good score and strong token overlap
  const SCORE_CUTOFF = 0.25
  const OVERLAP_CUTOFF = 0.7
  const overlap = tokenOverlapRatio(query, candidateName)
  let result: boolean
  if (typeof score === 'number') {
    result = score <= SCORE_CUTOFF && overlap >= OVERLAP_CUTOFF
  } else {
    result = overlap >= 0.85
  }
  // #region agent log
  if (query !== candidateName) {
    fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'ShoppingListPage.tsx:isAcceptableMatch',
        message: 'match check',
        data: { query, candidateName, q, c, score, overlap, result },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H1,H3',
      }),
    }).catch(() => {})
  }
  // #endregion
  return result
}

export default function ShoppingListPage() {
  // Use TanStack Query hooks for data fetching
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useShoppingListItems()
  const { data: expectedProducts = [] } = useExpectedProducts()
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
  const [highlightedResultIndex, setHighlightedResultIndex] = useState(0)
  const [isSearchingEmptyItem, setIsSearchingEmptyItem] = useState(false)
  const [showEmptyItemDropdown, setShowEmptyItemDropdown] = useState(false)
  const [emptyItemKey, setEmptyItemKey] = useState(0) // Key to force remount for focus
  const [shouldFocusEmptyItem, setShouldFocusEmptyItem] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchCacheRef = useRef<Map<string, SearchResult[]>>(new Map())
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const emptyItemContainerRef = useRef<HTMLDivElement>(null)
  const emptyItemJustClosedRef = useRef(false)
  const emptyItemJustAddedRef = useRef(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<{ userName: string; updatedAt: string } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { clearScroll } = useScrollRestore(scrollContainerRef)

  // Save Product modal (actie 3: add to list + save new product)
  const [saveProductModalOpen, setSaveProductModalOpen] = useState(false)
  const [saveProductModalName, setSaveProductModalName] = useState('')
  const [saveProductModalDescription, setSaveProductModalDescription] = useState<string | null>(null)
  const [saveProductModalCategoryId, setSaveProductModalCategoryId] = useState('')
  const [saveProductModalEmoji, setSaveProductModalEmoji] = useState('📦')
  const [saveProductModalCategories, setSaveProductModalCategories] = useState<{ id: string; name: string; display_order: number }[]>([])
  const [saveProductModalSaving, setSaveProductModalSaving] = useState(false)
  const [saveProductModalError, setSaveProductModalError] = useState<string | null>(null)
  const [showSaveProductEmojiPicker, setShowSaveProductEmojiPicker] = useState(false)
  const [saveProductEmojiSearchQuery, setSaveProductEmojiSearchQuery] = useState('')
  const saveProductEmojiButtonRef = useRef<HTMLButtonElement>(null)

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

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedResultIndex(0)
  }, [emptyItemSearchResults])

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

  // Open Save Product modal (actie 3) – pre-fill name, category, emoji; parse e.g. "4 appels" → name "appels", description "4"
  const handleOpenSaveProductModal = async (productName: string, description: string | null) => {
    if (!productName.trim()) return
    haptic('light')
    const parsed = parseProductInput(productName.trim())
    const name = parsed.productName || productName.trim()
    const effectiveDesc = description?.trim() || (parsed.annotation?.fullText ?? null)
    const prediction = predictCategoryAndEmoji(name)
    const predictedCategoryName = prediction.categoryName
    const predictedEmoji = prediction.emoji

    setSaveProductModalName(name)
    setSaveProductModalDescription(effectiveDesc)
    setSaveProductModalCategoryId('')
    setSaveProductModalEmoji(predictedEmoji)
    setSaveProductModalError(null)
    setSaveProductModalOpen(true)

    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        const categories = data.categories || []
        setSaveProductModalCategories(categories)
        const matchedId = findCategoryIdByPredictedName(predictedCategoryName, categories)
        if (matchedId) {
          setSaveProductModalCategoryId(matchedId)
        } else if (categories.length > 0) {
          const overig = categories.find((c: { name: string }) => c.name === 'Overig')
          if (overig) setSaveProductModalCategoryId(overig.id)
        }
      }
    } catch {
      setSaveProductModalError('Kon categorieën niet laden.')
    }
  }

  const handleCloseSaveProductModal = () => {
    setSaveProductModalOpen(false)
    setSaveProductModalName('')
    setSaveProductModalDescription(null)
    setSaveProductModalCategoryId('')
    setSaveProductModalEmoji('📦')
    setSaveProductModalCategories([])
    setSaveProductModalError(null)
    setShowSaveProductEmojiPicker(false)
    setSaveProductEmojiSearchQuery('')
  }

  const handleSaveProductModalSave = async () => {
    const name = saveProductModalName.trim()
    if (!name) {
      setSaveProductModalError('Naam is verplicht')
      return
    }
    let categoryId = saveProductModalCategoryId
    if (!categoryId && saveProductModalCategories.length > 0) {
      const overig = saveProductModalCategories.find((c: { name: string }) => c.name === 'Overig')
      if (overig) categoryId = overig.id
    }
    if (!categoryId) {
      setSaveProductModalError('Selecteer een categorie')
      return
    }

    setSaveProductModalSaving(true)
    setSaveProductModalError(null)

    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: null,
      product_name: name,
      emoji: saveProductModalEmoji || '📦',
      quantity: '1',
      description: saveProductModalDescription,
      category_id: categoryId,
      category: saveProductModalCategories.find((c: { id: string }) => c.id === categoryId) ?? null,
      is_checked: false,
      checked_at: null,
      created_at: new Date().toISOString(),
    }
    queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => [optimisticItem, ...old])

    setEmptyItemQuery('')
    setEmptyItemDescription('')
    setEmptyItemSearchResults([])
    setShowEmptyItemDropdown(false)

    try {
      const createRes = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category_id: categoryId,
          emoji: saveProductModalEmoji?.trim() || '📦',
        }),
      })
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Kon product niet aanmaken')
      }
      const createData = await createRes.json()
      const productId = createData.product?.id
      if (!productId) throw new Error('Geen product-id teruggekregen')

      const addRes = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          category_id: categoryId,
          quantity: '1',
          description: saveProductModalDescription,
        }),
      })
      if (!addRes.ok) {
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
          old.filter((item: { id: string }) => item.id !== tempId)
        )
        throw new Error('Kon item niet aan de lijst toevoegen')
      }
      const addData = await addRes.json()
      queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => {
        const filtered = old.filter((item: { id: string }) => item.id !== tempId)
        return [addData.item, ...filtered]
      })
      handleCloseSaveProductModal()
      emptyItemJustAddedRef.current = true
      setShouldFocusEmptyItem(true)
      setEmptyItemKey((prev) => prev + 1)
    } catch (err) {
      queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) =>
        old.filter((item: { id: string }) => item.id !== tempId)
      )
      setSaveProductModalError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setSaveProductModalSaving(false)
    }
  }

  // Close entire empty item when clicking/tapping outside empty item + dropdown
  useEffect(() => {
    if (!showEmptyItemDropdown) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const el = emptyItemContainerRef.current
      if (!el) return
      const target = e.target as Node
      // Don't close when clicking on a list item (e.g. delete button) – that should delete the item, not close empty row
      if ((target as Element).closest?.('[data-shopping-list-item]')) return
      if (!el.contains(target)) {
        emptyItemJustClosedRef.current = true
        handleCloseEmptyItem()
      }
    }
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('touchstart', handlePointerDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('touchstart', handlePointerDown, true)
    }
  }, [showEmptyItemDropdown])

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'ShoppingListPage.tsx:handleEmptyItemAdd',
              message: 'search match check',
              data: {
                productName: productName.trim(),
                firstResultName: matchedProduct.name,
                firstResultCategoryId: matchedProduct.category?.id ?? null,
                firstResultScore: matchedProduct.score,
                isAcceptableMatch: ok,
                willUseMatch: ok,
                willCreateNew: !ok,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              hypothesisId: 'H1,H3',
            }),
          }).catch(() => {})
          // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'ShoppingListPage.tsx:handleEmptyItemAdd fallback',
            message: 'categoryId was null, using Overig fallback',
            data: { productName: productName.trim(), productId },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'H1',
          }),
        }).catch(() => {})
        // #endregion
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
        emptyItemJustAddedRef.current = true
        setShouldFocusEmptyItem(true)
        setEmptyItemKey((prev) => prev + 1)
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
    const parsed = parseProductInput(productName.trim())
    const name = parsed.productName || productName.trim()
    const effectiveDesc = description?.trim() || (parsed.annotation?.fullText ?? null) || null
    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: null,
      product_name: name,
      emoji: '📦',
      quantity: '1',
      description: effectiveDesc,
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
          description: effectiveDesc,
        }),
      })
      if (addResponse.ok) {
        const addData = await addResponse.json()
        queryClient.setQueryData(queryKeys.shoppingListItems, (old: any[] = []) => {
          const filtered = old.filter((item) => item.id !== tempId)
          return [addData.item, ...filtered]
        })
        emptyItemJustAddedRef.current = true
        setShouldFocusEmptyItem(true)
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

  // Handle search result select from dropdown: keep description from toelichting, result, parsed query, or query remainder (e.g. "ongebrande hazelnoten" → product Hazelnoten, description "ongebrande")
  const handleEmptyItemResultSelect = async (result: SearchResult, query: string) => {
    haptic('light')
    const fromToelichting = emptyItemDescription.trim() || null
    const fromResult = result.description?.trim() || null
    const parsed = parseProductInput(query.trim())
    const fromParsedQuery = parsed.annotation?.fullText?.trim() || null
    const queryRemainder = getQueryRemainderAsDescription(query.trim(), result.name)
    // Prefer query remainder (all words around product name) over annotation parser so e.g. "2 liter halfvolle melk" → "2 liter"
    const effectiveDescription = fromToelichting || fromResult || queryRemainder || fromParsedQuery

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

    // Optimistic update – gebruik result.name zodat geen "Onbekend product" of skeleton zichtbaar is
    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      product_id: result.id,
      product_name: result.name,
      emoji: result.emoji,
      quantity: '1',
      description: effectiveDescription || null,
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
        description: effectiveDescription,
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
        emptyItemJustAddedRef.current = true
        setShouldFocusEmptyItem(true)
        setEmptyItemKey((prev) => prev + 1)
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

  // Arrow-key navigation for search results and action buttons (desktop)
  const handleEmptyItemProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const matchLevel =
      emptyItemSearchResults.length === 0 ? 3 : getMatchLevel(emptyItemQuery, emptyItemSearchResults)
    const totalItems =
      matchLevel === 3 ? 2 : matchLevel === 2 ? emptyItemSearchResults.length + 2 : emptyItemSearchResults.length
    const canNavigate = showEmptyItemDropdown && emptyItemQuery.trim().length >= 2 && totalItems > 0
    if (!canNavigate) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedResultIndex((prev) => (prev + 1) % totalItems)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedResultIndex((prev) => (prev - 1 + totalItems) % totalItems)
      return true
    }
    if (e.key === 'Enter') {
      const idx = highlightedResultIndex
      if (idx < 0 || idx >= totalItems) return false
      e.preventDefault()
      if (matchLevel === 3) {
        if (idx === 0) handleAddToListOnly(emptyItemQuery.trim(), emptyItemDescription.trim() || null)
        else handleOpenSaveProductModal(emptyItemQuery.trim(), emptyItemDescription.trim() || null)
      } else if (matchLevel === 2) {
        const n = emptyItemSearchResults.length
        if (idx < n) handleEmptyItemResultSelect(emptyItemSearchResults[idx], emptyItemQuery.trim())
        else if (idx === n) handleAddToListOnly(emptyItemQuery.trim(), emptyItemDescription.trim() || null)
        else handleOpenSaveProductModal(emptyItemQuery.trim(), emptyItemDescription.trim() || null)
      } else {
        handleEmptyItemResultSelect(emptyItemSearchResults[idx], emptyItemQuery.trim())
      }
      return true
    }
    return false
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
              /* Geen filter: DELETE payload ondersteunt filter soms niet; refetch toont alleen eigen huishouden */
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

  const handleCheck = async (id: string) => {
    haptic('light')
    try {
      const result = await checkItemMutation.mutateAsync(id)
      if (result?.item?.product_id) {
        try {
          const res = await fetch(`/api/shopping-list/record-purchase/${id}`, { method: 'POST' })
          if (res.ok) {
            const data = await res.json()
            if (data.success) {
              queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
            }
          }
        } catch (err) {
          console.error('Error recording purchase history for item', id, err)
        }
      }
    } catch (error) {
      setErrorMessage('Kon item niet afvinken. Probeer het opnieuw.')
      setTimeout(() => setErrorMessage(null), 5000)
      console.error('Error checking item:', error)
    }
  }

  const handleUncheck = async (id: string) => {
    haptic('light')
    try {
      try {
        await fetch(`/api/shopping-list/cancel-purchase/${id}`, { method: 'POST' })
      } catch {
        // ignore; uncheck regardless
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

  // Enter: open empty item with focus when closed; when open + empty, EmptyListItem closes on Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      if (isEmptyItemOpen) return
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      handleOpenEmptyItem()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEmptyItemOpen])

  // Lock body scroll when Save Product modal is open (prevents background scroll + pull-to-refresh on mobile)
  useEffect(() => {
    if (!saveProductModalOpen) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [saveProductModalOpen])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-transparent">
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
        className="mx-auto w-full max-w-7xl flex-1 flex flex-col min-h-0 px-4 py-4 sm:px-6 lg:px-8"
      >
        <PullToRefresh
          onRefresh={handleRefresh}
          scrollContainerRef={scrollContainerRef}
          disabled={saveProductModalOpen}
        >
          {isLoadingItems ? (
            <ShoppingListSkeleton />
          ) : (
            <div className="flex flex-1 flex-col min-h-0">
              {/* Empty item at top + dropdown (wrapper for click-outside) */}
              {isEmptyItemOpen && (
                <div ref={emptyItemContainerRef} className="mb-4">
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
                      // #region agent log
                      const firstResult = emptyItemSearchResults[0]
                      const acceptable = firstResult
                        ? isAcceptableMatch(name.trim(), firstResult.name, firstResult.score)
                        : null
                      fetch('http://127.0.0.1:7242/ingest/4e8afde7-201f-450c-b739-0857f7f9dd6a', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          location: 'ShoppingListPage.tsx:onAdd',
                          message: 'onAdd branch',
                          data: {
                            query: name.trim(),
                            resultsLength: emptyItemSearchResults.length,
                            firstResultName: firstResult?.name,
                            firstResultCategoryId: firstResult?.category?.id ?? null,
                            isAcceptableMatch: acceptable,
                            willCallListOnly:
                              showEmptyItemDropdown &&
                              emptyItemSearchResults.length === 0 &&
                              name.trim().length >= 2,
                          },
                          timestamp: Date.now(),
                          sessionId: 'debug-session',
                          hypothesisId: 'H1,H3',
                        }),
                      }).catch(() => {})
                      // #endregion
                      const trimmed = name.trim()
                      const matchLevel =
                        emptyItemSearchResults.length === 0
                          ? 3
                          : getMatchLevel(trimmed, emptyItemSearchResults)
                      if ((matchLevel === 1 || matchLevel === 2) && firstResult) {
                        handleEmptyItemResultSelect(firstResult, trimmed)
                      } else {
                        handleAddToListOnly(trimmed, desc)
                      }
                    }}
                    onCancel={() => {
                      handleCloseEmptyItem()
                      setShouldFocusEmptyItem(false)
                    }}
                    autoFocus={shouldFocusEmptyItem}
                    onFocusComplete={() => setShouldFocusEmptyItem(false)}
                    onProductKeyDown={handleEmptyItemProductKeyDown}
                  />
                  {/* Inline search dropdown */}
                  {showEmptyItemDropdown && emptyItemQuery.trim().length >= 2 && (
                    <InlineSearchDropdown
                      results={emptyItemSearchResults}
                      query={emptyItemQuery}
                      description={emptyItemDescription}
                      queryAnnotation={parseProductInput(emptyItemQuery).annotation?.fullText ?? null}
                      matchLevel={
                        emptyItemSearchResults.length === 0
                          ? 3
                          : getMatchLevel(emptyItemQuery, emptyItemSearchResults)
                      }
                      isVisible={true}
                      isSearching={isSearchingEmptyItem}
                      highlightedIndex={highlightedResultIndex}
                      onSelect={handleEmptyItemResultSelect}
                      onAddToListOnly={handleAddToListOnly}
                      onAddToListAndSaveProduct={handleOpenSaveProductModal}
                    />
                  )}
                </div>
              )}
              <ShoppingList
                items={items}
                expectedProducts={expectedProducts}
                onCheck={handleCheck}
                onUncheck={handleUncheck}
                onDelete={handleDelete}
                onUpdateDescription={handleUpdateDescription}
                onClearChecked={handleClearChecked}
                onAddExpectedToMain={async (product) => {
                  haptic('light')
                  try {
                    await addItemMutation.mutateAsync({
                      product_id: product.id,
                      category_id: product.category_id,
                      quantity: '1',
                      from_verwacht: true,
                      expected_days: product.days_until_expected,
                    })
                  } catch (error) {
                    setErrorMessage('Kon item niet toevoegen. Probeer het opnieuw.')
                    setTimeout(() => setErrorMessage(null), 5000)
                    console.error('Error adding expected product:', error)
                  }
                }}
              >
                {/* Klikzone direct onder laatste item: open/sluit leeg item */}
                <div
                  className="flex-1 min-h-[20vh]"
                  onClick={() => {
                    if (emptyItemJustClosedRef.current) {
                      emptyItemJustClosedRef.current = false
                      return
                    }
                    if (emptyItemJustAddedRef.current) {
                      emptyItemJustAddedRef.current = false
                      return
                    }
                    if (isEmptyItemOpen && !emptyItemQuery.trim()) {
                      handleCloseEmptyItem()
                    } else if (!isEmptyItemOpen) {
                      handleOpenEmptyItem()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (isEmptyItemOpen && !emptyItemQuery.trim()) {
                        handleCloseEmptyItem()
                      } else if (!isEmptyItemOpen) {
                        handleOpenEmptyItem()
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Leeg item openen of sluiten"
                />
              </ShoppingList>
            </div>
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

      {/* Save Product modal (actie 3: add to list + save new product) */}
      {saveProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overscroll-contain"
          style={{ overflow: 'auto' }}
          onClick={(e) => e.target === e.currentTarget && handleCloseSaveProductModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-product-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="save-product-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
              Nieuw product opslaan
            </h2>
            {saveProductModalError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {saveProductModalError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="save-product-name" className="block text-sm font-medium text-gray-700">
                  Naam
                </label>
                <input
                  id="save-product-name"
                  type="text"
                  value={saveProductModalName}
                  onChange={(e) => setSaveProductModalName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bijv. Melk"
                />
              </div>
              <div>
                <label htmlFor="save-product-category" className="block text-sm font-medium text-gray-700">
                  Categorie
                </label>
                <select
                  id="save-product-category"
                  value={saveProductModalCategoryId}
                  onChange={(e) => setSaveProductModalCategoryId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecteer categorie</option>
                  {saveProductModalCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label id="save-product-emoji-label" className="block text-sm font-medium text-gray-700">
                  Emoji
                </label>
                <div className="relative mt-1">
                  <button
                    ref={saveProductEmojiButtonRef}
                    type="button"
                    id="save-product-emoji"
                    aria-haspopup="listbox"
                    aria-expanded={showSaveProductEmojiPicker}
                    aria-labelledby="save-product-emoji-label"
                    onClick={() => setShowSaveProductEmojiPicker((v) => !v)}
                    className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-2xl shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {saveProductModalEmoji || '📦'}
                  </button>
                  {showSaveProductEmojiPicker &&
                    createPortal(
                      <SaveProductEmojiDropdown
                        emojiSearchQuery={saveProductEmojiSearchQuery}
                        setEmojiSearchQuery={setSaveProductEmojiSearchQuery}
                        onSelect={(emoji) => {
                          setSaveProductModalEmoji(emoji)
                          setShowSaveProductEmojiPicker(false)
                        }}
                        onClose={() => setShowSaveProductEmojiPicker(false)}
                        anchorRef={saveProductEmojiButtonRef}
                      />,
                      document.body
                    )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseSaveProductModal}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={handleSaveProductModalSave}
                disabled={saveProductModalSaving}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saveProductModalSaving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
