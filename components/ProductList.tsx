'use client'

import { useState, useMemo, useEffect } from 'react'
import { haptic } from '@/lib/haptics'
import { Search, List, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import ProductCard from './ProductCard'
import ProductForm from './ProductForm'
import { formatDayLabel, daySortKey } from '@/lib/format-day-label'
import { useQuery } from '@tanstack/react-query'

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
  last_purchased_at?: string | null
}

interface ProductListProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => void
  error?: string
}

type ViewType = 'alle' | 'vaak' | 'laatst'

export default function ProductList({ products, categories, onRefresh, error: errorProp }: ProductListProps) {
  const { data: purchaseHistoryData } = useQuery({
    queryKey: ['purchase-history-laatst-gekocht'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-history/laatst-gekocht')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      return data.items as { id: string; product_name: string; emoji: string; purchased_at: string }[]
    },
    staleTime: 2 * 60 * 1000,
  })
  const purchaseHistoryItems = purchaseHistoryData ?? []
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<ViewType>('alle')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [hasInitialExpanded, setHasInitialExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; source: 'list' | 'form' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [optimisticBasics, setOptimisticBasics] = useState<Record<string, boolean>>({})

  // Clear optimistic overrides when server data has caught up (e.g. after other refresh)
  useEffect(() => {
    setOptimisticBasics((prev) => {
      const next = { ...prev }
      let changed = false
      for (const pid of Object.keys(next)) {
        const p = products.find((x) => x.id === pid)
        if (p && p.is_basic === next[pid]) {
          delete next[pid]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [products])

  const filteredProducts = searchQuery.trim()
    ? products.filter((p) => {
        const q = searchQuery.toLowerCase().trim()
        const name = (p.name || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    : products

  const filteredPurchaseHistory = useMemo(() => {
    if (!searchQuery.trim()) return purchaseHistoryItems
    const q = searchQuery.toLowerCase().trim()
    return purchaseHistoryItems.filter(
      (i) => (i.product_name || '').toLowerCase().includes(q)
    )
  }, [purchaseHistoryItems, searchQuery])

  type Section = { label: string; products: Product[] }

  const sections = useMemo((): Section[] => {
    if (view === 'vaak') {
      const sorted = [...filteredProducts].sort((a, b) => {
        const cA = a.purchase_count ?? 0
        const cB = b.purchase_count ?? 0
        if (cB !== cA) return cB - cA
        return a.name.localeCompare(b.name, 'nl')
      })
      return [{ label: '', products: sorted }]
    }
    if (view === 'alle') {
      const byCat = filteredProducts.reduce((acc, product) => {
        const categoryId = product.category_id
        const category = categories.find((c) => c.id === categoryId)
        const categoryName = category?.name || 'Onbekend'
        const categoryOrder = category?.display_order ?? 9999
        if (!acc[categoryId]) acc[categoryId] = { categoryName, categoryOrder, products: [] }
        acc[categoryId].products.push(product)
        return acc
      }, {} as Record<string, { categoryName: string; categoryOrder: number; products: Product[] }>)
      return Object.values(byCat)
        .sort((a, b) => a.categoryOrder - b.categoryOrder)
        .map((g) => ({
          label: g.categoryName,
          products: g.products.sort((a, b) => a.name.localeCompare(b.name, 'nl')),
        }))
    }
    return []
  }, [view, filteredProducts, categories])

  type DateSection = { label: string; sortKey: string; items: { id: string; product_name: string; emoji: string }[] }
  const dateSections = useMemo((): DateSection[] => {
    if (view !== 'laatst') return []
    const byDay = new Map<string, { items: { id: string; product_name: string; emoji: string }[]; purchasedAt: string }>()
    for (const item of filteredPurchaseHistory) {
      const label = formatDayLabel(item.purchased_at)
      if (!byDay.has(label)) byDay.set(label, { items: [], purchasedAt: item.purchased_at })
      byDay.get(label)!.items.push({ id: item.id, product_name: item.product_name, emoji: item.emoji })
    }
    return Array.from(byDay.entries())
      .sort(([, a], [, b]) => daySortKey(a.purchasedAt).localeCompare(daySortKey(b.purchasedAt)))
      .map(([label, { items, purchasedAt }]) => ({
        label,
        sortKey: daySortKey(purchasedAt),
        items,
      }))
  }, [view, filteredPurchaseHistory])

  useEffect(() => {
    if (view === 'laatst' && dateSections.length > 0 && !hasInitialExpanded) {
      setExpandedDates((prev) => {
        const next = new Set(prev)
        next.add(dateSections[0].label)
        return next
      })
      setHasInitialExpanded(true)
    }
    if (view !== 'laatst') setHasInitialExpanded(false)
  }, [view, dateSections, hasInitialExpanded])

  const handleAdd = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDeleteFromList = (productId: string) => {
    haptic('light')
    setProductToDelete({ id: productId, source: 'list' })
    setShowDeleteConfirmModal(true)
  }

  const handleDeleteFromForm = () => {
    if (!editingProduct) return
    haptic('light')
    setProductToDelete({ id: editingProduct.id, source: 'form' })
    setShowDeleteConfirmModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    haptic('medium')

    const productId = productToDelete.id
    const fromForm = productToDelete.source === 'form'
    setShowDeleteConfirmModal(false)
    setProductToDelete(null)
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

      haptic('success')
      setSuccess('Product verwijderd')
      if (fromForm) {
        setShowForm(false)
        setEditingProduct(null)
      }
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

      haptic('success')
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

  const handleToggleBasic = async (product: Product) => {
    haptic('light')
    const newValue = !product.is_basic
    // Optimistic update: direct UI feedback
    setOptimisticBasics((prev) => ({ ...prev, [product.id]: newValue }))
    setError('')
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_basic: newValue }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon Basics-status niet bijwerken')
      }

      // No refresh: optimistic state stays, UI remains instant
    } catch (err) {
      setOptimisticBasics((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  if (showForm) {
    return (
      <>
        <div className="rounded-[16px] bg-white p-6 shadow">
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
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => { setShowDeleteConfirmModal(false); setProductToDelete(null) }} />
            <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
              <p className="text-gray-900">Weet je zeker dat je dit product wilt verwijderen?</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirmModal(false); setProductToDelete(null) }}
                  className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
    <div className="space-y-4 pb-20">
      {(errorProp || error) && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{errorProp || error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      {/* View tabs - icoon boven tekst, in witte wrapper */}
      <div className="flex gap-2">
        {[
          { id: 'alle' as const, label: 'Alle producten', icon: List },
          { id: 'vaak' as const, label: 'Vaak gekocht', icon: TrendingUp },
          { id: 'laatst' as const, label: 'Laatst gekocht', icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              haptic('light')
              setView(id)
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-2.5 text-sm font-medium transition-colors ${
              view === id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
            aria-pressed={view === id}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate text-center text-xs leading-tight">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="productSearch"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Product zoeken..."
            className="block w-full rounded-[40px] border-[#dbdee3] bg-[#eceef1] py-2 pl-10 pr-3 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
          />
        </div>

      {view === 'laatst' ? (
        dateSections.length === 0 ? (
          <div className="rounded-[16px] bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              {searchQuery.trim()
                ? 'Geen aankopen gevonden voor je zoekopdracht'
                : 'Nog geen aankopen. Vink producten op je lijst aan om ze hier te zien.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dateSections.map((section) => {
              const isExpanded = expandedDates.has(section.label)
              return (
                <div
                  key={section.label}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light')
                      setExpandedDates((prev) => {
                        const next = new Set(prev)
                        if (next.has(section.label)) next.delete(section.label)
                        else next.add(section.label)
                        return next
                      })
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                  >
                    <span>{section.label}</span>
                    <span className="flex shrink-0 items-center gap-4 text-gray-400">
                      {section.items.length} producten
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                      )}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 text-gray-700"
                          >
                            <span className="text-lg shrink-0">{item.emoji}</span>
                            <span className="text-[16px]">{item.product_name || 'Onbekend product'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[16px] bg-white p-8 text-center shadow">
          <p className="text-gray-600">
            {searchQuery.trim()
              ? 'Geen producten gevonden voor je zoekopdracht'
              : 'Nog geen producten. Voeg je eerste product toe!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={`${section.label ?? 'flat'}-${idx}`}>
              {section.label ? (
                <h3 className="mb-3 text-sm font-medium text-gray-500">{section.label}</h3>
              ) : null}
              <div className="space-y-2">
                {section.products.map((product) => {
                  const effectiveIsBasic = product.id in optimisticBasics
                    ? optimisticBasics[product.id]
                    : product.is_basic
                  const displayProduct = { ...product, is_basic: effectiveIsBasic }
                  return (
                    <ProductCard
                      key={product.id}
                      product={displayProduct}
                      onEdit={handleEdit}
                      onToggleBasic={handleToggleBasic}
                      onDelete={handleDeleteFromList}
                      showPurchaseInfo={view === 'vaak'}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => { setShowDeleteConfirmModal(false); setProductToDelete(null) }} />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">Weet je zeker dat je dit product wilt verwijderen?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirmModal(false); setProductToDelete(null) }}
                className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-[16px] bg-white p-6">
            <p className="text-gray-900">Product verwijderen...</p>
          </div>
        </div>
      )}
    </div>
    <button
      onClick={handleAdd}
      className="fixed bottom-[100px] right-4 z-40 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
    >
      + Product toevoegen
    </button>
    </>
  )
}
