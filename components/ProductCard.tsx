'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Star } from 'lucide-react'
import { calculatePurchaseFrequency } from '@/lib/prediction'
import { formatPurchaseFrequency } from '@/lib/format-frequency'
import { PurchaseHistory } from '@/types/database'

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
  frequency_correction_factor?: number
  created_at: string
  updated_at: string
}

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onToggleBasic?: (product: Product) => void
  onDelete?: (productId: string) => void // Optional, not used in card display
  /** Toon alleen wanneer sortering op Koopfrequentie staat */
  showPurchaseInfo?: boolean
}

export default function ProductCard({ product, onEdit, onToggleBasic, showPurchaseInfo = false }: ProductCardProps) {
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch purchase history alleen wanneer we het tonen
  useEffect(() => {
    if (!showPurchaseInfo) return

    const fetchPurchaseHistory = async () => {
      setLoadingHistory(true)
      try {
        const response = await fetch(`/api/products/${product.id}/purchase-history`)
        if (response.ok) {
          const data = await response.json()
          setPurchaseHistory(data.history || [])
        }
      } catch (error) {
        console.error('Error fetching purchase history:', error)
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchPurchaseHistory()
  }, [product.id, showPurchaseInfo])

  // Calculate frequency (apply correction factor for display consistency)
  const rawFrequency = calculatePurchaseFrequency(purchaseHistory)
  const correctionFactor = product.frequency_correction_factor ?? 1
  const frequencyDays = rawFrequency != null ? rawFrequency * correctionFactor : null
  const frequencyText = formatPurchaseFrequency(frequencyDays)
  const purchaseCount = purchaseHistory.length

  return (
    <div 
      onClick={() => onEdit(product)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            <span className="text-lg shrink-0 flex items-center">{product.emoji}</span>
            <div className="flex-1 min-w-0 flex items-center">
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 min-w-0 text-[16px] font-medium text-gray-900">{product.name}</h3>
                </div>
                {/* Purchase history info - alleen bij sortering op Koopfrequentie */}
                {showPurchaseInfo && !loadingHistory && purchaseCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <ShoppingCart className="h-3 w-3 shrink-0" />
                    <span>
                      {purchaseCount}x
                      {frequencyText && (
                        <> • {frequencyText}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {product.description && (
            <p className="ml-7 mt-0.5 text-xs text-gray-600 truncate">
              {product.description}
            </p>
          )}
          {product.is_popular && (
            <div className="ml-7 mt-1">
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Populair
              </span>
            </div>
          )}
        </div>
        {onToggleBasic && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleBasic(product)
            }}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 focus:outline-none"
            aria-label={product.is_basic ? 'Verwijder uit Basics' : 'Markeer als Basics'}
          >
            {product.is_basic ? (
              <Star size={20} className="fill-yellow-500 text-yellow-500" />
            ) : (
              <Star size={20} className="stroke-2 text-gray-300" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
