'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
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

// Fetch functions
async function fetchShoppingListItems(): Promise<ShoppingListItemData[]> {
  const response = await fetch('/api/shopping-list')
  if (!response.ok) {
    throw new Error('Failed to fetch shopping list items')
  }
  const data = await response.json()
  return data.items || []
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

async function fetchBasicProducts(): Promise<BasicProduct[]> {
  const response = await fetch('/api/products?is_basic=true')
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  const products = data.products || []
  return products.map((p: { id: string; name: string; emoji: string; category_id: string; category?: { id: string; name: string; display_order: number } | null }) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    category_id: p.category_id,
    category: p.category ?? null,
  }))
}

// Hooks
export function useShoppingListItems() {
  return useQuery({
    queryKey: queryKeys.shoppingListItems,
    queryFn: fetchShoppingListItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  return useQuery({
    queryKey: queryKeys.basicProducts,
    queryFn: fetchBasicProducts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Mutations
export function useCheckItem() {
  const queryClient = useQueryClient()

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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingListItems })

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )

      // Optimistically update
      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
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
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.shoppingListItems, context.previousItems)
      }
    },
    onSettled: () => {
      // Final sync
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })
    },
  })
}

export function useUncheckItem() {
  const queryClient = useQueryClient()

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
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingListItems })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
          previousItems.map((item) =>
            item.id === id ? { ...item, is_checked: false, checked_at: null } : item
          )
        )
      }

      return { previousItems }
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.shoppingListItems, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()

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
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingListItems })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
          previousItems.filter((item) => item.id !== id)
        )
      }

      return { previousItems }
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.shoppingListItems, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useUpdateDescription() {
  const queryClient = useQueryClient()

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
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingListItems })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
          previousItems.map((item) =>
            item.id === id ? { ...item, description: description || null } : item
          )
        )
      }

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.shoppingListItems, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingListItems })
    },
  })
}

export function useAddItem() {
  const queryClient = useQueryClient()

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
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingListItems })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )

      // Create optimistic item (temporary ID, will be replaced by server response)
      const optimisticItem: ShoppingListItemData = {
        id: `temp-${Date.now()}`,
        product_id: newItemData.product_id || null,
        product_name: newItemData.product_name || null,
        emoji: '📦', // Default emoji, will be updated by server
        quantity: newItemData.quantity || '1',
        description: newItemData.description || null,
        category_id: newItemData.category_id,
        category: null, // Will be updated by server
        is_checked: false,
        checked_at: null,
        created_at: new Date().toISOString(),
      }

      if (previousItems) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
          [optimisticItem, ...previousItems]
        )
      }

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.shoppingListItems, context.previousItems)
      }
    },
    onSuccess: (data) => {
      // Replace optimistic item with real item from server
      const currentItems = queryClient.getQueryData<ShoppingListItemData[]>(
        queryKeys.shoppingListItems
      )
      if (currentItems && data.item) {
        queryClient.setQueryData<ShoppingListItemData[]>(
          queryKeys.shoppingListItems,
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
