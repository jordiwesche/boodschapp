'use client'

import { useState } from 'react'
import Link from 'next/link'
import { haptic } from '@/lib/haptics'
import { ChevronDown, ChevronRight, Clock, Zap, Plus, Trash2, Star, ShoppingCart, LayoutList, List, Package } from 'lucide-react'
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

export interface BasicProduct {
  id: string
  name: string
  emoji: string
  category_id: string
  category: { id: string; name: string; display_order: number } | null
}

interface ShoppingListProps {
  items: ShoppingListItemData[]
  expectedProducts?: ExpectedProduct[]
  basicProducts?: BasicProduct[]
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDelete: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onClearChecked?: () => void
  onAddExpectedToMain?: (product: ExpectedProduct) => void
  onAddBasicToMain?: (product: BasicProduct) => void
  children?: React.ReactNode
}

export default function ShoppingList({
  items,
  expectedProducts = [],
  basicProducts = [],
  onCheck,
  onUncheck,
  onDelete,
  onUpdateDescription,
  onClearChecked,
  onAddExpectedToMain,
  onAddBasicToMain,
  children,
}: ShoppingListProps) {
  const checkedItemsCount = items.filter((item) => item.is_checked).length
  const [checkedSectionOpen, setCheckedSectionOpen] = useState(false)
  const [basicsSectionOpen, setBasicsSectionOpen] = useState(false)
  const [showClearCheckedModal, setShowClearCheckedModal] = useState(false)
  const [showCategoryTitles, setShowCategoryTitles] = useState(false)
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

  // Basics: exclude products already in list (any section), sort by category then name
  const productIdsInList = new Set(items.map((i) => i.product_id).filter(Boolean))
  const basicsNotInList = basicProducts
    .filter((p) => !productIdsInList.has(p.id))
    .sort((a, b) => {
      const orderA = a.category?.display_order ?? 999
      const orderB = b.category?.display_order ?? 999
      if (orderA !== orderB) return orderA - orderB
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'nl')
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

  const cardClass = 'rounded-[16px] border-2 border-white bg-white/80 p-4'
  const mainListCardClass = 'rounded-[16px] border-2 border-gray-200 bg-white/80 p-4'

  return (
    <div className="pb-16 flex flex-col flex-1 min-h-0 gap-4">
      {/* 1. Hoofdlijst – altijd tonen */}
      <div className={mainListCardClass}>
        <div className="mb-2 flex h-8 min-h-8 items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
            <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            Lijst
          </h2>
          {sortedUncheckedCategories.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowCategoryTitles((v) => !v)}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-pressed={showCategoryTitles}
              aria-label={showCategoryTitles ? 'Lijst compacter maken' : 'Lijst uitgebreider maken'}
            >
              {showCategoryTitles ? (
                <LayoutList className="h-4 w-4" strokeWidth={2} />
              ) : (
                <List className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
        {sortedUncheckedCategories.length > 0 ? (
          sortedUncheckedCategories.map((categoryGroup, index) => {
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

            const isOverig = (categoryGroup.category?.name || 'Overig') === 'Overig'
            const categorySpacing =
              index === 0
                ? showCategoryTitles ? 'mt-4' : ''
                : showCategoryTitles
                  ? 'mt-4'
                  : isOverig
                    ? 'mt-2'
                    : ''
            return (
              <div key={categoryGroup.category?.id || 'overig'} className={categorySpacing}>
                {sortedUncheckedCategories.length > 1 && showCategoryTitles && (
                  <h3 className="mb-2 text-xs font-normal uppercase tracking-wide text-gray-500">
                    {categoryGroup.category?.name || 'Overig'}
                  </h3>
                )}
                <div>
                  {itemsToRender.map((item) => (
                    <div
                      key={item.id}
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
          })
        ) : (
          <p className="text-gray-500">Je boodschappenlijst is leeg</p>
        )}
      </div>

      {/* 2. Afgevinkt */}
      {checkedItemsCount > 0 && (
        <div className={cardClass}>
          <div className="flex h-8 min-h-8 items-center justify-between gap-2">
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
                onClick={() => {
                  haptic('light')
                  setShowClearCheckedModal(true)
                }}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Wis alle afgevinkte items"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {checkedSectionOpen && (
            <div className="mt-2">
              {sortedCheckedItems.map((item) => (
                <div key={item.id}>
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
          <h2 className="mb-2 flex h-8 min-h-8 items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
            <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            Binnenkort
          </h2>
          <div>
            {sortedLaterUnchecked.map((item) => (
              <div
                key={item.id}
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
          <h2 className="mb-2 flex h-8 min-h-8 items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
            <Zap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            Verwacht
          </h2>
          <div>
            {expectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 py-2"
              >
                <span className="text-lg shrink-0">{product.emoji}</span>
                <span className="flex-1 min-w-0 font-medium text-gray-900">{product.name}</span>
                <span className="text-sm text-gray-400 shrink-0">
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

      {/* 5. Basics (ster-icoon) – altijd tonen */}
      <div className={cardClass}>
        <div className="flex h-8 min-h-8 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setBasicsSectionOpen((open) => !open)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-medium text-gray-500 tracking-wide"
            aria-expanded={basicsSectionOpen}
          >
            {basicsSectionOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <Star className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>Basics ({basicsNotInList.length})</span>
          </button>
        </div>
        {basicsSectionOpen && (
          <div className="mt-2">
            {basicsNotInList.length > 0 ? (
              basicsNotInList.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="text-lg shrink-0">{product.emoji}</span>
                  <span className="flex-1 min-w-0 font-medium text-gray-900">{product.name}</span>
                  {onAddBasicToMain && (
                    <button
                      type="button"
                      onClick={() => onAddBasicToMain(product)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Toevoegen aan hoofdlijst"
                    >
                      <Plus className="h-5 w-5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                Ga naar{' '}
                <Link href="/producten" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                  <Package className="h-4 w-4 shrink-0" />
                  Producten
                </Link>
                {' '}en markeer producten als Basic{' '}
                <Star className="inline-block h-4 w-4 shrink-0 align-middle text-gray-400" />
                {' '}om ze altijd snel terug te vinden.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal: bevestiging wissen afgevinkte items */}
      {showClearCheckedModal && onClearChecked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => setShowClearCheckedModal(false)} />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">
              Weet je zeker dat je alle {checkedItemsCount} afgevinkte item{checkedItemsCount !== 1 ? 's' : ''} wilt wissen?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearCheckedModal(false)}
                className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic('medium')
                  onClearChecked()
                  setShowClearCheckedModal(false)
                }}
                className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
