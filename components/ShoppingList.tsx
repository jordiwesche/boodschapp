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
      // Use display_order from category, default to 999 for 'Overig'
      // Make sure we always use the category's display_order, not a fallback
      const displayOrder = item.category?.display_order !== undefined 
        ? item.category.display_order 
        : (categoryName === 'Overig' ? 999 : 999)

      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: item.category,
          categoryName,
          displayOrder,
          uncheckedItems: [],
          checkedItems: [],
        }
      } else {
        // If category already exists but display_order is missing or wrong, update it
        // This handles the case where the first item didn't have display_order
        if (item.category?.display_order !== undefined) {
          acc[categoryId].displayOrder = item.category.display_order
          // Also update the category object if it's more complete
          if (item.category) {
            acc[categoryId].category = item.category
          }
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

  // Sort unchecked items by category display_order, then alphabetically
  const sortedUncheckedItems = uncheckedItems.sort((a, b) => {
    const orderA = a.category?.display_order ?? 999
    const orderB = b.category?.display_order ?? 999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    const nameA = (a.product_name || '').toLowerCase()
    const nameB = (b.product_name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'nl')
  })

  // Sort checked items by checked_at (most recent first), then alphabetically
  const sortedCheckedItems = checkedItems.sort((a, b) => {
    if (a.checked_at && b.checked_at) {
      return new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    }
    if (a.checked_at) return -1
    if (b.checked_at) return 1
    const nameA = (a.product_name || '').toLowerCase()
    const nameB = (b.product_name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'nl')
  })

  // Group unchecked items by category for displaying category headers
  const uncheckedByCategory = sortedUncheckedItems.reduce((acc, item) => {
    const categoryId = item.category?.id || 'overig'
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: item.category,
        items: [],
      }
    }
    acc[categoryId].items.push(item)
    return acc
  }, {} as Record<string, { category: ShoppingListItemData['category']; items: ShoppingListItemData[] }>)

  // Get sorted category groups for unchecked items
  const sortedUncheckedCategories = Object.values(uncheckedByCategory).sort((a, b) => {
    const orderA = a.category?.display_order ?? 999
    const orderB = b.category?.display_order ?? 999
    return orderA - orderB
  })

  return (
    <div className="pb-32">
      {/* Unchecked items - grouped by category with headers */}
      {sortedUncheckedCategories.map((categoryGroup, index) => (
        <div key={categoryGroup.category?.id || 'overig'}>
          {/* Category header */}
          <h2 className={`mb-2 px-4 text-xs font-medium text-gray-500 tracking-wide ${index === 0 ? 'mt-0' : 'mt-4'}`}>
            {categoryGroup.category?.name || 'Overig'}
          </h2>
          {/* Items in this category */}
          {categoryGroup.items.map((item) => (
            <div key={item.id} className="mb-2">
              <ShoppingListItem
                item={item}
                onCheck={onCheck}
                onUncheck={onUncheck}
                onDelete={onDelete}
                onUpdateDescription={onUpdateDescription}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Checked items - all at the bottom, sorted by checked_at */}
      {sortedCheckedItems.length > 0 && (
        <>
          <h2 className="mb-2 mt-4 px-4 text-xs font-medium text-gray-500 tracking-wide">
            Afgevinkt
          </h2>
          {sortedCheckedItems.map((item) => (
            <div key={item.id} className="mb-2">
              <ShoppingListItem
                item={item}
                onCheck={onCheck}
                onUncheck={onUncheck}
                onDelete={onDelete}
                onUpdateDescription={onUpdateDescription}
              />
            </div>
          ))}
        </>
      )}

      {/* Clear checked items button - centered below checked items */}
      {checkedItemsCount > 0 && onClearChecked && (
        <div className="mt-10 flex justify-center">
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
    </div>
  )
}
