'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProductList from '@/components/ProductList'
import CategoryList from '@/components/CategoryList'

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
  default_quantity: string
  category_id: string
  category?: {
    id: string
    name: string
    display_order: number
  } | null
  is_basic: boolean
  is_popular: boolean
  purchase_pattern?: {
    frequency: number
    unit: string
  } | null
  created_at: string
  updated_at: string
}

type Tab = 'producten' | 'categorieen'

export default function ProfielProductenPage() {
  const router = useRouter()
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
      const response = await fetch('/api/products')
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
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Terug"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Producten & Categorieën</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
        <div className="rounded-lg bg-white p-6 shadow">
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
      </main>
    </div>
  )
}
