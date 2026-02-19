'use client'

import dynamic from 'next/dynamic'
import { useCategories, useProducts } from '@/lib/hooks/use-products'

const ProductList = dynamic(() => import('@/components/ProductList'), {
  loading: () => <div className="text-gray-500 p-4">Laden...</div>,
})

import PageLayout from './PageLayout'

export default function ProductenTabContent() {
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories()
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts()

  const loading = categoriesLoading || productsLoading
  const error = categoriesError ? 'Kon categorieën niet ophalen' : productsError ? 'Kon producten niet ophalen' : ''

  const handleRefresh = () => {
    refetchCategories()
    refetchProducts()
  }

  if (loading && categories.length === 0 && products.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout title="Producten" dataPwaMain="default">
      <div className="rounded-[16px] border border-gray-200 bg-white overflow-visible p-4">
        <ProductList
          products={products}
          categories={categories}
          onRefresh={handleRefresh}
          error={error}
        />
      </div>
    </PageLayout>
  )
}
