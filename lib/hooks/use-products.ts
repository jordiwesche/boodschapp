'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PurchaseHistory } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdId } from '@/lib/hooks/use-household'

export interface Category {
  id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  emoji: string
  name: string
  description?: string | null
  category_id: string
  category?: {
    id: string
    name: string
    display_order: number
  } | null
  is_basic: boolean
  is_popular: boolean
  frequency_correction_factor?: number
  created_at: string
  updated_at: string
  purchase_count?: number
  last_purchased_at?: string | null
}

export const queryKeys = {
  categories: ['categories'] as const,
  products: ['products'] as const,
  product: (id: string) => ['product', id] as const,
  productPurchaseHistory: (id: string) => ['product-purchase-history', id] as const,
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) throw new Error('Failed to fetch categories')
  const data = await response.json()
  return data.categories || []
}

async function fetchProducts(householdId: string): Promise<Product[]> {
  if (!householdId) return []
  const supabase = createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, emoji, name, description, category_id,
      is_basic, is_popular, frequency_correction_factor,
      created_at, updated_at,
      product_categories ( id, name, display_order )
    `)
    .eq('household_id', householdId)
    .order('name', { ascending: true })

  if (error || !products) {
    console.error('Failed to fetch products:', error)
    return []
  }

  const productIds = products.map((p) => p.id)
  const purchaseCountById: Record<string, number> = {}
  const lastPurchasedById: Record<string, string> = {}

  if (productIds.length > 0) {
    const { data: rows } = await supabase
      .from('purchase_history')
      .select('product_id, purchased_at')
      .eq('household_id', householdId)
      .in('product_id', productIds)

    if (rows) {
      for (const row of rows) {
        const pid = row.product_id
        purchaseCountById[pid] = (purchaseCountById[pid] ?? 0) + 1
        if (row.purchased_at) {
          const existing = lastPurchasedById[pid]
          if (!existing || row.purchased_at > existing) {
            lastPurchasedById[pid] = row.purchased_at
          }
        }
      }
    }
  }

  return products.map((product) => {
    const rawCat = product.product_categories
    const cat = Array.isArray(rawCat) && rawCat.length > 0
      ? rawCat[0]
      : rawCat && typeof rawCat === 'object' && !Array.isArray(rawCat)
        ? rawCat as { id: string; name: string; display_order: number }
        : null

    return {
      id: product.id,
      emoji: product.emoji,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      category: cat ? { id: cat.id, name: cat.name, display_order: cat.display_order } : null,
      is_basic: product.is_basic,
      is_popular: product.is_popular,
      frequency_correction_factor: product.frequency_correction_factor ?? 1,
      created_at: product.created_at,
      updated_at: product.updated_at,
      purchase_count: purchaseCountById[product.id] ?? 0,
      last_purchased_at: lastPurchasedById[product.id] ?? null,
    }
  })
}

async function fetchProduct(id: string, householdId: string): Promise<Product | null> {
  if (!householdId) return null
  const supabase = createClient()
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, emoji, name, description, category_id,
      is_basic, is_popular, frequency_correction_factor,
      created_at, updated_at,
      product_categories ( id, name, display_order )
    `)
    .eq('id', id)
    .eq('household_id', householdId)
    .single()

  if (error || !product) return null

  const cat = Array.isArray(product.product_categories) && product.product_categories.length > 0
    ? product.product_categories[0]
    : null

  return {
    id: product.id,
    emoji: product.emoji,
    name: product.name,
    description: product.description,
    category_id: product.category_id,
    category: cat ? { id: cat.id, name: cat.name, display_order: cat.display_order } : null,
    is_basic: product.is_basic,
    is_popular: product.is_popular,
    frequency_correction_factor: product.frequency_correction_factor ?? 1,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}

async function fetchProductPurchaseHistory(productId: string, householdId: string): Promise<PurchaseHistory[]> {
  if (!householdId) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchase_history')
    .select('*')
    .eq('household_id', householdId)
    .eq('product_id', productId)
    .order('purchased_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch purchase history:', error)
    return []
  }
  return (data || []) as PurchaseHistory[]
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProducts() {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...queryKeys.products, householdId],
    queryFn: () => fetchProducts(householdId!),
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProduct(productId: string | null) {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...queryKeys.product(productId ?? ''), householdId],
    queryFn: () => fetchProduct(productId!, householdId!),
    enabled: !!productId && !!householdId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProductPurchaseHistory(productId: string | null) {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...queryKeys.productPurchaseHistory(productId ?? ''), householdId],
    queryFn: () => fetchProductPurchaseHistory(productId!, householdId!),
    enabled: !!productId && !!householdId,
    staleTime: 2 * 60 * 1000,
  })
}

export async function prefetchProducts(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.categories }),
    queryClient.prefetchQuery({ queryKey: queryKeys.products }),
  ])
}
