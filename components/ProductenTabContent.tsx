'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ProductList = dynamic(() => import('@/components/ProductList'), {
  loading: () => <div className="text-gray-500 p-4">Laden...</div>,
})

const CategoryList = dynamic(() => import('@/components/CategoryList'), {
  loading: () => <div className="text-gray-500 p-4">Laden...</div>,
})

interface Category {
  id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

interface Product {
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
  created_at: string
  updated_at: string
  purchase_count?: number
  last_purchased_at?: string | null
}

type Tab = 'producten' | 'categorieen'

export default function ProductenTabContent() {
  const [activeTab, setActiveTab] = useState<Tab>('producten')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        setError('Kon categorieën niet ophalen')
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het ophalen van categorieën')
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?include=purchase_count')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        setError('Kon producten niet ophalen')
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het ophalen van producten')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError('')
    await Promise.all([fetchCategories(), fetchProducts()])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData()
  }

  if (loading) {
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
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-transparent">
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 sm:px-6 sm:pt-12 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Producten</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
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
      </main>
    </div>
  )
}
