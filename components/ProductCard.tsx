'use client'

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
}

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete?: (productId: string) => void // Optional, not used in card display
}

export default function ProductCard({ product, onEdit }: ProductCardProps) {

  return (
    <div 
      onClick={() => onEdit(product)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg shrink-0 flex items-center">{product.emoji}</span>
            <div className="flex-1 min-w-0 flex items-center">
              <div className="flex items-center gap-2 w-full">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                {product.is_basic && (
                  <span className="text-yellow-500 shrink-0">★</span>
                )}
              </div>
            </div>
          </div>
          {product.description && (
            <p className="ml-7 mt-0.5 text-xs text-gray-600 truncate">
              {product.description}
            </p>
          )}
          <div className="ml-7 mt-1 flex flex-wrap items-center gap-1.5">
            {product.category && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                {product.category.name}
              </span>
            )}
            {product.is_popular && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Populair
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
