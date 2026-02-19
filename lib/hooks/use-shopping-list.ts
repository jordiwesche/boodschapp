'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdId } from '@/lib/hooks/use-household'

// Types
export interface ItemLabel {
  id: string
  name: string
  color: string
  type: 'smart' | 'custom'
  slug: string | null
}

export interface ShoppingListItemData {
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
  labels?: ItemLabel[]
}

export interface Suggestion {
  id: string
  emoji: string
  name: string
  suggestion_type: 'basic' | 'predicted'
}

export interface ExpectedProduct {
  id: string
  name: string
  emoji: string
  category_id: string
  category: { id: string; name: string; display_order: number } | null
  days_until_expected: number
}

// Query keys
export const queryKeys = {
  shoppingListItems: ['shopping-list-items'] as const,
  suggestions: ['suggestions'] as const,
  expectedProducts: ['expected-products'] as const,
  basicProducts: ['basic-products'] as const,
}

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Fruit & Groente': '🥬',
  'Vers, Vega, Vlees & Vis': '🥩',
  'Pasta, Oosters & Wereld': '🍝',
  'Brood & Bakkerij': '🍞',
  'Zuivel': '🥛',
  'Droog & Houdbaar': '🥫',
  'Dranken': '🥤',
  'Huishouden & Verzorging': '🧴',
  'Diepvries': '🧊',
  'Overig': '📦',
}

// Fetch functions
async function fetchShoppingListItems(householdId: string): Promise<ShoppingListItemData[]> {
  if (!householdId) return []
  const supabase = createClient()

  const { data: items, error } = await supabase
    .from('shopping_list_items')
    .select(`
      id, product_id, product_name, quantity, description,
      category_id, is_checked, checked_at, added_by, created_at, updated_at,
      product_categories ( id, name, display_order ),
      products ( id, emoji, name )
    `)
    .eq('household_id', householdId)
    .order('is_checked', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !items) {
    console.error('Failed to fetch shopping list items:', error)
    return []
  }

  // Fetch item labels
  const itemIds = items.map((i) => i.id)
  const labelsByItem: Record<string, ItemLabel[]> = {}
  if (itemIds.length > 0) {
    const { data: itemLabels } = await supabase
      .from('shopping_list_item_labels')
      .select('item_id, labels(id, name, color, type, slug)')
      .in('item_id', itemIds)

    if (itemLabels) {
      for (const row of itemLabels) {
        const raw = row.labels
        let label: { id: string; name: string; color: string; type: string; slug: string | null } | null = null
        if (Array.isArray(raw) && raw.length > 0 && raw[0]) {
          label = raw[0] as { id: string; name: string; color: string; type: string; slug: string | null }
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'id' in raw) {
          label = raw as unknown as { id: string; name: string; color: string; type: string; slug: string | null }
        }
        if (label?.id) {
          if (!labelsByItem[row.item_id]) labelsByItem[row.item_id] = []
          labelsByItem[row.item_id].push({
            id: label.id,
            name: label.name,
            color: label.color,
            type: label.type as 'smart' | 'custom',
            slug: label.slug ?? null,
          })
        }
      }
    }
  }

  // Collect IDs where joins failed so we can batch-fetch fallbacks
  const missingProductIds: string[] = []
  const missingCategoryIds: string[] = []

  for (const item of items) {
    const rp = item.products
    const hasProduct = rp && (
      (Array.isArray(rp) && rp.length > 0 && (rp[0] as { id?: string })?.id) ||
      (!Array.isArray(rp) && typeof rp === 'object' && (rp as { id?: string })?.id)
    )
    if (!hasProduct && item.product_id) missingProductIds.push(item.product_id)

    const rc = item.product_categories
    const hasCat = rc && (
      (Array.isArray(rc) && rc.length > 0 && (rc[0] as { id?: string })?.id) ||
      (!Array.isArray(rc) && typeof rc === 'object' && (rc as { id?: string })?.id)
    )
    if (!hasCat && item.category_id) missingCategoryIds.push(item.category_id)
  }

  // Batch-fetch missing products and categories (avoid N+1)
  const productMap: Record<string, { id: string; emoji: string; name: string }> = {}
  const categoryMap: Record<string, { id: string; name: string; display_order: number }> = {}

  if (missingProductIds.length > 0) {
    const uniqueIds = [...new Set(missingProductIds)]
    const { data: prods } = await supabase
      .from('products')
      .select('id, emoji, name')
      .in('id', uniqueIds)
    if (prods) for (const p of prods) productMap[p.id] = p
  }

  if (missingCategoryIds.length > 0) {
    const uniqueIds = [...new Set(missingCategoryIds)]
    const { data: cats } = await supabase
      .from('product_categories')
      .select('id, name, display_order')
      .in('id', uniqueIds)
    if (cats) for (const c of cats) categoryMap[c.id] = c
  }

  return items.map((item) => {
    // Resolve product from join or fallback (nullable FK can return object or array)
    let product: { id: string; emoji: string; name: string } | null = null
    const rawProd = item.products
    if (rawProd) {
      if (Array.isArray(rawProd) && rawProd.length > 0 && (rawProd[0] as { id?: string })?.id) {
        product = rawProd[0] as { id: string; emoji: string; name: string }
      } else if (!Array.isArray(rawProd) && typeof rawProd === 'object' && (rawProd as { id?: string })?.id) {
        product = rawProd as unknown as { id: string; emoji: string; name: string }
      }
    }
    if (!product && item.product_id && productMap[item.product_id]) {
      product = productMap[item.product_id]
    }

    // Resolve category from join or fallback
    let category: { id: string; name: string; display_order: number } | null = null
    const rawCat = item.product_categories
    if (rawCat) {
      if (Array.isArray(rawCat) && rawCat.length > 0 && (rawCat[0] as { id?: string })?.id) {
        category = rawCat[0] as { id: string; name: string; display_order: number }
      } else if (!Array.isArray(rawCat) && typeof rawCat === 'object' && (rawCat as { id?: string })?.id) {
        category = rawCat as unknown as { id: string; name: string; display_order: number }
      }
    }
    if (!category && item.category_id && categoryMap[item.category_id]) {
      category = categoryMap[item.category_id]
    }

    const emoji = product
      ? product.emoji
      : (category?.name ? CATEGORY_EMOJI_MAP[category.name] ?? '📦' : '📦')

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || (product ? product.name : null),
      emoji,
      quantity: item.quantity,
      description: item.description,
      category_id: item.category_id,
      category: category
        ? { id: category.id, name: category.name, display_order: category.display_order }
        : null,
      is_checked: item.is_checked,
      checked_at: item.checked_at,
      created_at: item.created_at,
      labels: labelsByItem[item.id] || [],
    }
  })
}

async function fetchSuggestions(): Promise<Suggestion[]> {
  const response = await fetch('/api/suggestions')
  if (!response.ok) {
    throw new Error('Failed to fetch suggestions')
  }
  const data = await response.json()
  return data.suggestions || []
}

async function fetchExpectedProducts(): Promise<ExpectedProduct[]> {
  const response = await fetch('/api/products/expected')
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return data.expected || []
}

export interface BasicProduct {
  id: string
  name: string
  emoji: string
  category_id: string
  category: { id: string; name: string; display_order: number } | null
}

async function fetchBasicProducts(householdId: string): Promise<BasicProduct[]> {
  if (!householdId) return []
  const supabase = createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, emoji, name, category_id,
      product_categories ( id, name, display_order )
    `)
    .eq('household_id', householdId)
    .eq('is_basic', true)
    .order('name', { ascending: true })

  if (error || !products) return []

  return products.map((p) => {
    const rawCat = p.product_categories
    const cat = Array.isArray(rawCat) && rawCat.length > 0
      ? rawCat[0]
      : rawCat && typeof rawCat === 'object' && !Array.isArray(rawCat)
        ? rawCat as { id: string; name: string; display_order: number }
        : null

    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      category_id: p.category_id,
      category: cat ? { id: cat.id, name: cat.name, display_order: cat.display_order } : null,
    }
  })
}

// Hooks
export function useShoppingListItems() {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...queryKeys.shoppingListItems, householdId],
    queryFn: () => fetchShoppingListItems(householdId!),
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSuggestions() {
  return useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: fetchSuggestions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useExpectedProducts() {
  return useQuery({
    queryKey: queryKeys.expectedProducts,
    queryFn: fetchExpectedProducts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useBasicProducts() {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...queryKeys.basicProducts, householdId],
    queryFn: () => fetchBasicProducts(householdId!),
    enabled: !!householdId,
    staleTime: 2 * 60 * 1000,
  })
}

// Helper: build the full shopping list query key including householdId
function useListKey() {
  const { householdId } = useHouseholdId()
  return [...queryKeys.shoppingListItems, householdId] as const
}

// Mutations
export function useCheckItem() {
  const queryClient = useQueryClient()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shopping-list/check/${id}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to check item')
      }
      return response.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          previousItems.map((item) =>
            item.id === id
              ? { ...item, is_checked: true, checked_at: new Date().toISOString() }
              : item
          )
        )
      }

      return { previousItems }
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
    },
  })
}

export function useUncheckItem() {
  const queryClient = useQueryClient()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_checked: false,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to uncheck item')
      }
      return response.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          previousItems.map((item) =>
            item.id === id ? { ...item, is_checked: false, checked_at: null } : item
          )
        )
      }

      return { previousItems }
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete item')
      }
      return response.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          previousItems.filter((item) => item.id !== id)
        )
      }

      return { previousItems }
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useUpdateDescription() {
  const queryClient = useQueryClient()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description || null,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to update description')
      }
      return response.json()
    },
    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          previousItems.map((item) =>
            item.id === id ? { ...item, description: description || null } : item
          )
        )
      }

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useAddItem() {
  const queryClient = useQueryClient()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async (data: {
      product_id?: string
      product_name?: string
      quantity?: string
      category_id: string
      description?: string | null
      from_verwacht?: boolean
      expected_days?: number
    }) => {
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add item')
      }
      return response.json()
    },
    onMutate: async (newItemData) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)

      const optimisticItem: ShoppingListItemData = {
        id: `temp-${Date.now()}`,
        product_id: newItemData.product_id || null,
        product_name: newItemData.product_name || null,
        emoji: '📦',
        quantity: newItemData.quantity || '1',
        description: newItemData.description || null,
        category_id: newItemData.category_id,
        category: null,
        is_checked: false,
        checked_at: null,
        created_at: new Date().toISOString(),
      }

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          [optimisticItem, ...previousItems]
        )
      }

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSuccess: (data) => {
      const currentItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)
      if (currentItems && data.item) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          currentItems.map((item) =>
            item.id.startsWith('temp-') ? data.item : item
          )
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
      queryClient.invalidateQueries({ queryKey: queryKeys.expectedProducts })
    },
  })
}

export function useClearChecked() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/shopping-list/clear-checked', {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to clear checked items')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}
