'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import ProductCard from './ProductCard'
import ProductForm from './ProductForm'
import FixedActionBar from './FixedActionBar'

interface Category {
  id: string
  name: string
  display_order: number
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
}

interface ProductListProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
}

type SortOption = 'alfabetisch' | 'koopfrequentie'

export default function ProductList({ products, categories, onRefresh }: ProductListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('alfabetisch')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filteredByCategory = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

  const filteredProducts = searchQuery.trim()
    ? filteredByCategory.filter((p) => {
        const q = searchQuery.toLowerCase().trim()
        const name = (p.name || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    : filteredByCategory

  // Group products by category and sort by category display_order
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryId = product.category_id
    const category = categories.find(cat => cat.id === categoryId)
    const categoryName = category?.name || 'Onbekend'
    const categoryOrder = category?.display_order ?? 9999
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName,
        categoryOrder,
        products: []
      }
    }
    acc[categoryId].products.push(product)
    return acc
  }, {} as Record<string, { categoryId: string; categoryName: string; categoryOrder: number; products: Product[] }>)

  const sortProducts = (a: Product, b: Product) => {
    if (sortBy === 'koopfrequentie') {
      const countA = a.purchase_count ?? 0
      const countB = b.purchase_count ?? 0
      if (countB !== countA) return countB - countA
    }
    return a.name.localeCompare(b.name, 'nl')
  }

  // Sort categories by display_order, then sort products within each category
  const sortedCategories = Object.values(productsByCategory)
    .sort((a, b) => a.categoryOrder - b.categoryOrder)
    .map(cat => ({
      ...cat,
      products: cat.products.sort(sortProducts)
    }))

  const handleAdd = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDeleteFromList = async (productId: string) => {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
      return
    }

    setDeletingProductId(productId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon product niet verwijderen')
      }

      setSuccess('Product verwijderd')
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleDeleteFromForm = async () => {
    if (!editingProduct) return
    
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
      return
    }

    setDeletingProductId(editingProduct.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon product niet verwijderen')
      }

      setSuccess('Product verwijderd')
      setShowForm(false)
      setEditingProduct(null)
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleSave = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon product niet opslaan')
      }

      setSuccess(editingProduct ? 'Product bijgewerkt' : 'Product toegevoegd')
      setShowForm(false)
      setEditingProduct(null)
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setError('')
  }

  if (showForm) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <ProductForm
          product={editingProduct || undefined}
          categories={categories}
          products={products}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={editingProduct ? handleDeleteFromForm : undefined}
          loading={loading}
        />
      </div>
    )
  }

  return (
    <>
    <div className="space-y-4 pb-20">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4">
          <select
            id="categoryFilter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter op categorie"
            className="min-w-0 flex-1 rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="" className="text-gray-500">Alle categorieën</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sorteren"
            className="min-w-0 flex-1 rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="alfabetisch">Alfabetisch</option>
            <option value="koopfrequentie">Koopfrequentie</option>
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="productSearch"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Product zoeken..."
            className="block w-full rounded-md border-gray-200 bg-gray-100 py-2 pl-10 pr-3 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">
            {searchQuery.trim()
              ? 'Geen producten gevonden voor je zoekopdracht'
              : selectedCategory
                ? 'Geen producten in deze categorie'
                : 'Nog geen producten. Voeg je eerste product toe!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((categoryGroup) => (
            <div key={categoryGroup.categoryId}>
              <h3 className="mb-3 text-sm font-medium text-gray-500">
                {categoryGroup.categoryName}
              </h3>
              <div className="space-y-3">
                {categoryGroup.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDeleteFromList}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6">
            <p className="text-gray-900">Product verwijderen...</p>
          </div>
        </div>
      )}
    </div>
    <FixedActionBar
      right={
        <button
          onClick={handleAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Product toevoegen
        </button>
      }
    />
    </>
  )
}
