'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useCategories, useProducts, type Category, type Product } from '@/lib/hooks/use-products'

const ProductList = dynamic(() => import('@/components/ProductList'), {
  loading: () => <div className="text-gray-500 p-4">Laden...</div>,
})

import PageLayout from './PageLayout'
const CategoryList = dynamic(() => import('@/components/CategoryList'), {
  loading: () => <div className="text-gray-500 p-4">Laden...</div>,
})

type Tab = 'producten' | 'categorieen'

export default function ProductenTabContent() {
  const [activeTab, setActiveTab] = useState<Tab>('producten')
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
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
          )}

          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('producten')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'producten'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Producten ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('categorieen')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'categorieen'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Categorieën ({categories.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'producten' ? (
            <ProductList
              products={products}
              categories={categories}
              onRefresh={handleRefresh}
            />
          ) : (
            <CategoryList categories={categories} onRefresh={handleRefresh} />
          )}
        </div>
    </PageLayout>
  )
}
