'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Zap, Plus, Trash2 } from 'lucide-react'
import ShoppingListItem from './ShoppingListItem'
import { isFruit } from '@/lib/fruit-groente'

/** Day tokens or "later" (standalone or in parentheses) in description → item goes in "Later" section. Not inside a word (e.g. "woord" does not match "wo"). */
const LATER_DAY_ORDER: Record<string, number> = {
  maandag: 0, ma: 0, dinsdag: 1, di: 1, woensdag: 2, wo: 2, donderdag: 3, do: 3,
  vrijdag: 4, vr: 4, zaterdag: 5, za: 5, zondag: 6, zo: 6,
  later: 99, // no specific day → sort at end of Later section
}
// Match standalone token: at start, after whitespace, or inside ( ). "later" + day names (longer first so "ma" doesn't match inside "maandag").
const LATER_DAY_PATTERN = /(?:^|[\s(])(later|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)(?:$|[\s)])/i

function hasLaterDayToken(description: string | null): boolean {
  const d = description?.trim()
  if (!d) return false
  return LATER_DAY_PATTERN.test(d)
}

function getLaterDayFromDescription(description: string | null): string | null {
  const d = description?.trim()
  if (!d) return null
  const m = d.match(LATER_DAY_PATTERN)
  return m ? m[1].toLowerCase() : null
}

function isLaterItem(item: { description: string | null }): boolean {
  return hasLaterDayToken(item.description)
}

/** Remove day/later token from description; if token was in parens e.g. "(wo)", remove parens too. */
function stripLaterTokenFromDescription(description: string | null): string | null {
  const d = description?.trim()
  if (!d) return null
  const cleaned = d.replace(LATER_DAY_PATTERN, '').replace(/\s+/g, ' ').trim()
  return cleaned === '' ? null : cleaned
}

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

export interface ExpectedProduct {
  id: string
  name: string
  emoji: string
  category_id: string
  category: { id: string; name: string; display_order: number } | null
  days_until_expected: number
}

interface ShoppingListProps {
  items: ShoppingListItemData[]
  expectedProducts?: ExpectedProduct[]
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDelete: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onClearChecked?: () => void
  onAddExpectedToMain?: (product: ExpectedProduct) => void
  children?: React.ReactNode
}

export default function ShoppingList({
  items,
  expectedProducts = [],
  onCheck,
  onUncheck,
  onDelete,
  onUpdateDescription,
  onClearChecked,
  onAddExpectedToMain,
  children,
}: ShoppingListProps) {
  const checkedItemsCount = items.filter((item) => item.is_checked).length
  const [checkedSectionOpen, setCheckedSectionOpen] = useState(false)
  const [showClearCheckedModal, setShowClearCheckedModal] = useState(false)
  // Separate checked and unchecked items; unchecked split into normal vs "Later" (description = weekday)
  const uncheckedItems = items.filter((item) => !item.is_checked)
  const laterUncheckedItems = uncheckedItems.filter(isLaterItem)
  const normalUncheckedItems = uncheckedItems.filter((item) => !isLaterItem(item))
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
        <div className="bg-white rounded-[16px] p-8 text-center">
          <p className="text-gray-500">Je boodschappenlijst is leeg</p>
        </div>
      </div>
    )
  }

  // Sort normal unchecked items by category display_order, then alphabetically
  const sortedNormalUnchecked = [...normalUncheckedItems].sort((a, b) => {
    const orderA = a.category?.display_order ?? 999
    const orderB = b.category?.display_order ?? 999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    const nameA = (a.product_name || '').toLowerCase()
    const nameB = (b.product_name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'nl')
  })

  // Sort "Later" items by day token in description (ma first) then by product name
  const sortedLaterUnchecked = [...laterUncheckedItems].sort((a, b) => {
    const dayA = getLaterDayFromDescription(a.description)
    const dayB = getLaterDayFromDescription(b.description)
    const orderA = Number((dayA && LATER_DAY_ORDER[dayA]) ?? 99)
    const orderB = Number((dayB && LATER_DAY_ORDER[dayB]) ?? 99)
    if (orderA !== orderB) return orderA - orderB
    const nameA = (a.product_name || '').toLowerCase()
    const nameB = (b.product_name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'nl')
  })

  // Sort checked items by checked_at (most recent first), then alphabetically
  const sortedCheckedItems = [...checkedItems].sort((a, b) => {
    if (a.checked_at && b.checked_at) {
      return new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    }
    if (a.checked_at) return -1
    if (b.checked_at) return 1
    const nameA = (a.product_name || '').toLowerCase()
    const nameB = (b.product_name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'nl')
  })

  // Group normal unchecked items by category for displaying category headers (later items go in separate section)
  const uncheckedByCategory = sortedNormalUnchecked.reduce((acc, item) => {
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

  const cardClass = 'bg-white rounded-[16px] p-4'

  return (
    <div className="pb-32 flex flex-col flex-1 min-h-0 gap-4">
      {/* 1. Urgent: alle categoriesecties (Fruit & Groente t/m Overig) */}
      {sortedUncheckedCategories.length > 0 && (
        <div className={cardClass}>
          {sortedUncheckedCategories.map((categoryGroup, index) => {
            const categoryName = categoryGroup.category?.name || ''
            const isFruitGroente = categoryName === 'Fruit & Groente'
            const itemsToRender = isFruitGroente
              ? (() => {
                  const fruit = categoryGroup.items.filter((item) => isFruit(item.product_name || ''))
                  const groente = categoryGroup.items.filter((item) => !isFruit(item.product_name || ''))
                  const byName = (a: ShoppingListItemData, b: ShoppingListItemData) =>
                    (a.product_name || '').toLowerCase().localeCompare((b.product_name || '').toLowerCase(), 'nl')
                  return [...fruit.sort(byName), ...groente.sort(byName)]
                })()
              : categoryGroup.items

            return (
              <div key={categoryGroup.category?.id || 'overig'} className={index === 0 ? '' : 'mt-4'}>
                <h2 className="mb-2 text-sm font-medium text-gray-500 tracking-wide">
                  {categoryGroup.category?.name || 'Overig'}
                </h2>
                <div>
                  {itemsToRender.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className={itemIndex === itemsToRender.length - 1 ? '' : 'border-b border-gray-200'}
                      data-shopping-list-item
                    >
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
              </div>
            )
          })}
        </div>
      )}

      {/* 2. Afgevinkt */}
      {checkedItemsCount > 0 && (
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCheckedSectionOpen((open) => !open)}
              className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-medium text-gray-500 tracking-wide"
              aria-expanded={checkedSectionOpen}
            >
              {checkedSectionOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span>Afgevinkt ({checkedItemsCount})</span>
            </button>
            {onClearChecked && (
              <button
                type="button"
                onClick={() => setShowClearCheckedModal(true)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Wis alle afgevinkte items"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {checkedSectionOpen && (
            <div className="mt-2">
              {sortedCheckedItems.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className={itemIndex === sortedCheckedItems.length - 1 ? '' : 'border-b border-gray-200'}
                >
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
          )}
        </div>
      )}

      {/* 3. Binnenkort (was Later) */}
      {sortedLaterUnchecked.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-2 text-sm font-medium text-gray-500 tracking-wide flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            Binnenkort
          </h2>
          <div>
            {sortedLaterUnchecked.map((item, itemIndex) => (
              <div
                key={item.id}
                className={itemIndex === sortedLaterUnchecked.length - 1 ? '' : 'border-b border-gray-200'}
                data-shopping-list-item
              >
                <ShoppingListItem
                  item={item}
                  onCheck={onCheck}
                  onUncheck={onUncheck}
                  onDelete={onDelete}
                  onUpdateDescription={onUpdateDescription}
                  showMoveToMain={true}
                  onMoveToMain={() => onUpdateDescription(item.id, stripLaterTokenFromDescription(item.description) ?? '')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Verwacht (op basis van koopfrequentie) */}
      {expectedProducts.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-2 text-sm font-medium text-gray-500 tracking-wide flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            Verwacht
          </h2>
          <div>
            {expectedProducts.map((product, index) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 py-3 ${index === expectedProducts.length - 1 ? '' : 'border-b border-gray-200'}`}
              >
                <span className="text-lg shrink-0">{product.emoji}</span>
                <span className="flex-1 min-w-0 font-medium text-gray-900">{product.name}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {product.days_until_expected === 0 ? 'vandaag' : `over ${product.days_until_expected}d`}
                </span>
                {onAddExpectedToMain && (
                  <button
                    type="button"
                    onClick={() => onAddExpectedToMain(product)}
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Toevoegen aan hoofdlijst"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: bevestiging wissen afgevinkte items */}
      {showClearCheckedModal && onClearChecked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" aria-hidden onClick={() => setShowClearCheckedModal(false)} />
          <div className="relative rounded-lg bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">
              Weet je zeker dat je alle {checkedItemsCount} afgevinkte item{checkedItemsCount !== 1 ? 's' : ''} wilt wissen?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearCheckedModal(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearChecked()
                  setShowClearCheckedModal(false)
                }}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Wissen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Klikzone direct onder laatste item (children van parent) */}
      {children}
    </div>
  )
}
