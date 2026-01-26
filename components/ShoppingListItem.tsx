'use client'

import { useState } from 'react'
import { Check, X, Pencil } from 'lucide-react'

interface ShoppingListItemData {
  id: string
  product_id: string | null
  product_name: string | null
  emoji: string
  quantity: string
  description: string | null
  category_id: string
  category: {
    id: string
    name: string
    display_order: number
  } | null
  is_checked: boolean
  checked_at: string | null
  created_at: string
}

interface ShoppingListItemProps {
  item: ShoppingListItemData
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDelete: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
}

export default function ShoppingListItem({
  item,
  onCheck,
  onUncheck,
  onDelete,
  onUpdateDescription,
}: ShoppingListItemProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editValue, setEditValue] = useState(item.description || '')

  const handleCheck = async () => {
    if (item.is_checked) {
      onUncheck?.(item.id)
    } else {
      onCheck(item.id)
    }
  }

  const handleDelete = () => {
    if (confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
      onDelete(item.id)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingDescription(true)
    setEditValue(item.description || '')
  }

  const handleSaveDescription = () => {
    onUpdateDescription(item.id, editValue.trim())
    setIsEditingDescription(false)
  }

  const handleCancelEdit = () => {
    setEditValue(item.description || '')
    setIsEditingDescription(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveDescription()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div
      className={`flex items-center gap-3 border-t border-b border-gray-200 py-2 px-3 transition-opacity ${
        item.is_checked ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheck}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          item.is_checked
            ? 'border-blue-600 bg-blue-600'
            : 'border-gray-300 hover:border-blue-500'
        }`}
        aria-label={item.is_checked ? 'Afgevinkt' : 'Afvinken'}
      >
        {item.is_checked && <Check className="h-3 w-3 text-white" />}
      </button>

      {/* Emoji */}
      <span className="text-lg shrink-0">{item.emoji}</span>

      {/* Product name and description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${
              item.is_checked ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}
          >
            {item.product_name || 'Onbekend product'}
          </span>
          {item.description && !isEditingDescription && (
            <span className="text-sm text-gray-900">{item.description}</span>
          )}
        </div>
      </div>

      {/* Edit description button */}
      {!isEditingDescription && (
        <button
          onClick={handleEditClick}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Bewerk toelichting"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      {/* Edit description input */}
      {isEditingDescription && (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveDescription}
            onKeyDown={handleKeyDown}
            placeholder="Toelichting..."
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Verwijderen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
