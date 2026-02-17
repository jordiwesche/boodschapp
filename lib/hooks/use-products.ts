'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PurchaseHistory } from '@/types/database'

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

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products?include=purchase_count')
  if (!response.ok) throw new Error('Failed to fetch products')
  const data = await response.json()
  return data.products || []
}

async function fetchProduct(id: string): Promise<Product | null> {
  const response = await fetch(`/api/products/${id}`)
  if (!response.ok) return null
  const data = await response.json()
  return data.product || null
}

async function fetchProductPurchaseHistory(productId: string): Promise<PurchaseHistory[]> {
  const response = await fetch(`/api/products/${productId}/purchase-history`)
  if (!response.ok) return []
  const data = await response.json()
  return (data.history || []) as PurchaseHistory[]
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.product(productId ?? ''),
    queryFn: () => fetchProduct(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProductPurchaseHistory(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.productPurchaseHistory(productId ?? ''),
    queryFn: () => fetchProductPurchaseHistory(productId!),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  })
}

export async function prefetchProducts(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.categories }),
    queryClient.prefetchQuery({ queryKey: queryKeys.products }),
  ])
}
