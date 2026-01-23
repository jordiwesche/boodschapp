'use client'

import { Pencil } from 'lucide-react'

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

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete?: (productId: string) => void // Optional, not used in card display
}

export default function ProductCard({ product, onEdit }: ProductCardProps) {

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{product.emoji}</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              {product.description && (
                <p className="mt-1 text-sm text-gray-600">{product.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {product.category && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {product.category.name}
                  </span>
                )}
                {product.is_basic && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Basis
                  </span>
                )}
                {product.is_popular && (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    Populair
                  </span>
                )}
              </div>
              {product.purchase_pattern && (
                <p className="mt-1 text-xs text-gray-500">
                  Aankoop patroon: elke {product.purchase_pattern.frequency} {product.purchase_pattern.unit === 'days' ? 'dagen' : 'weken'}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={() => onEdit(product)}
            className="rounded-md bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
            aria-label="Bewerk product"
          >
            <Pencil size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
