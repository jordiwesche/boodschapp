'use client'

import { CheckSquare } from 'lucide-react'
import ShoppingListItem from './ShoppingListItem'

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

interface ShoppingListProps {
  items: ShoppingListItemData[]
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDelete: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onClearChecked?: () => void
}

export default function ShoppingList({
  items,
  onCheck,
  onUncheck,
  onDelete,
  onUpdateDescription,
  onClearChecked,
}: ShoppingListProps) {
  const checkedItemsCount = items.filter((item) => item.is_checked).length
  // Separate checked and unchecked items
  const uncheckedItems = items.filter((item) => !item.is_checked)
  const checkedItems = items.filter((item) => item.is_checked)

  // Group all items by category
  const groupedByCategory = items.reduce(
    (acc, item) => {
      const categoryName = item.category?.name || 'Overig'
      const categoryId = item.category?.id || 'overig'
      const displayOrder = item.category?.display_order ?? 999

      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: item.category,
          categoryName,
          displayOrder,
          uncheckedItems: [],
          checkedItems: [],
        }
      }

      if (item.is_checked) {
        acc[categoryId].checkedItems.push(item)
      } else {
        acc[categoryId].uncheckedItems.push(item)
      }

      return acc
    },
    {} as Record<
      string,
      {
        category: ShoppingListItemData['category']
        categoryName: string
        displayOrder: number
        uncheckedItems: ShoppingListItemData[]
        checkedItems: ShoppingListItemData[]
      }
    >
  )

  // Sort categories:
  // 1. Categories with unchecked items first (sorted by display_order)
  // 2. Categories with only checked items (sorted by display_order)
  const categoriesWithUnchecked = Object.values(groupedByCategory).filter(
    (group) => group.uncheckedItems.length > 0
  )
  const categoriesOnlyChecked = Object.values(groupedByCategory).filter(
    (group) => group.uncheckedItems.length === 0 && group.checkedItems.length > 0
  )

  const sortedCategoriesWithUnchecked = [...categoriesWithUnchecked].sort(
    (a, b) => a.displayOrder - b.displayOrder
  )
  const sortedCategoriesOnlyChecked = [...categoriesOnlyChecked].sort(
    (a, b) => a.displayOrder - b.displayOrder
  )

  const allSortedCategories = [
    ...sortedCategoriesWithUnchecked,
    ...sortedCategoriesOnlyChecked,
  ]

  if (allSortedCategories.length === 0) {
    return (
      <div className="pb-32">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Je boodschappenlijst is leeg</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      {/* Clear checked items button */}
      {checkedItemsCount > 0 && onClearChecked && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onClearChecked}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Wis alle afgevinkte items"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Wis afgevinkte items ({checkedItemsCount})</span>
          </button>
        </div>
      )}
      
      {allSortedCategories.map((group) => (
        <div key={group.category?.id || 'overig'} className="mb-6">
          {/* Category header */}
          <h2 className="mb-2 text-sm font-medium text-gray-500">
            {group.categoryName}
          </h2>

          {/* Unchecked items */}
          {group.uncheckedItems.length > 0 && (
            <div>
              {group.uncheckedItems.map((item) => (
                <ShoppingListItem
                  key={item.id}
                  item={item}
                  onCheck={onCheck}
                  onUncheck={onUncheck}
                  onDelete={onDelete}
                  onUpdateDescription={onUpdateDescription}
                />
              ))}
            </div>
          )}

          {/* Checked items (within same category) */}
          {group.checkedItems.length > 0 && (
            <div>
              {group.checkedItems.map((item) => (
                <ShoppingListItem
                  key={item.id}
                  item={item}
                  onCheck={onCheck}
                  onUncheck={onUncheck}
                  onDelete={onDelete}
                  onUpdateDescription={onUpdateDescription}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
