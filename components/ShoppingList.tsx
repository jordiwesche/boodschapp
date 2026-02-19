'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { haptic } from '@/lib/haptics'
import { ChevronDown, ChevronRight, Clock, Zap, Plus, Check, Trash2, Star, ShoppingCart, MoreVertical, Package } from 'lucide-react'
import type { ItemLabel } from '@/lib/hooks/use-shopping-list'

const STORAGE_KEY_CATEGORY = 'boodschapp-show-category-titles'
const STORAGE_KEY_EMOJI = 'boodschapp-show-emojis'

function getStoredBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue
  const v = localStorage.getItem(key)
  if (v === null) return defaultValue
  return v === 'true'
}

function setStoredBool(key: string, value: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, String(value))
}
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

function hasZsmLabel(item: { labels?: ItemLabel[] }): boolean {
  return (item.labels ?? []).some((l) => l.slug === 'zsm')
}

function hasLaterLabel(item: { labels?: ItemLabel[] }): boolean {
  return (item.labels ?? []).some((l) => l.slug === 'later')
}

function isLaterItem(item: { description: string | null; labels?: ItemLabel[] }): boolean {
  return hasLaterLabel(item) || hasLaterDayToken(item.description)
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
  labels?: ItemLabel[]
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
  onRemoveBasicFromMain?: (product: BasicProduct) => void
  onMainListHeaderClick?: () => void
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
  onRemoveBasicFromMain,
  onMainListHeaderClick,
  children,
}: ShoppingListProps) {
  const checkedItemsCount = items.filter((item) => item.is_checked).length
  const [checkedSectionOpen, setCheckedSectionOpen] = useState(false)
  const [basicsSectionOpen, setBasicsSectionOpen] = useState(false)
  const [showClearCheckedModal, setShowClearCheckedModal] = useState(false)
  const [showCategoryTitles, setShowCategoryTitles] = useState(() => getStoredBool(STORAGE_KEY_CATEGORY, false))
  const [showEmojis, setShowEmojis] = useState(() => getStoredBool(STORAGE_KEY_EMOJI, true))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setStoredBool(STORAGE_KEY_CATEGORY, showCategoryTitles)
  }, [showCategoryTitles])

  useEffect(() => {
    setStoredBool(STORAGE_KEY_EMOJI, showEmojis)
  }, [showEmojis])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleAddWithAnimation = (id: string, callback: () => void) => {
    haptic('light')
    setAddingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      callback()
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 500)
  }
  // Separate checked and unchecked items; split into z.s.m. | normal | Later
  const uncheckedItems = items.filter((item) => !item.is_checked)
  const zsmUncheckedItems = uncheckedItems.filter(hasZsmLabel)
  const laterUncheckedItems = uncheckedItems.filter((item) => !hasZsmLabel(item) && isLaterItem(item))
  const normalUncheckedItems = uncheckedItems.filter((item) => !hasZsmLabel(item) && !isLaterItem(item))
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

  // Sort z.s.m. items by category then name
  const sortedZsmUnchecked = [...zsmUncheckedItems].sort((a, b) => {
    const orderA = a.category?.display_order ?? 999
    const orderB = b.category?.display_order ?? 999
    if (orderA !== orderB) return orderA - orderB
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

  // Basics: show all, sort by category then name; track which are on the list (unchecked only – checked items don't count)
  const productIdsInList = new Set(items.filter((i) => !i.is_checked).map((i) => i.product_id).filter(Boolean))
  const basicsAll = [...basicProducts].sort((a, b) => {
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

  const cardClass = 'rounded-[16px] border-2 border-white bg-white p-4'
  const mainListCardClass = 'rounded-[16px] border-2 border-gray-200 bg-white p-4'

  return (
    <div className="pb-16 flex flex-col flex-1 min-h-0 gap-4">
      {/* 1. Hoofdlijst – altijd tonen */}
      <div className={mainListCardClass}>
        <div className="mb-2 flex h-8 min-h-8 items-center justify-between gap-2">
          {onMainListHeaderClick ? (
            <button
              type="button"
              onClick={() => {
                haptic('light')
                onMainListHeaderClick()
              }}
              className="flex flex-1 min-w-0 items-center gap-1.5 text-left text-sm font-medium text-gray-500 tracking-wide hover:text-gray-700 transition-colors cursor-pointer -mx-2 px-2 py-1 rounded"
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              Lijst
            </button>
          ) : (
            <h2 className="flex flex-1 min-w-0 items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              Lijst
            </h2>
          )}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setDropdownOpen((v) => !v)
              }}
              className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-expanded={dropdownOpen}
              aria-label="Lijstopties"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryTitles((v) => !v)
                    haptic('light')
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>Categorienamen</span>
                  <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${showCategoryTitles ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showCategoryTitles ? 'left-4' : 'left-0.5'}`} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojis((v) => !v)
                    haptic('light')
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>Emoji&apos;s</span>
                  <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${showEmojis ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showEmojis ? 'left-4' : 'left-0.5'}`} />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-4">
        {/* z.s.m. – bovenaan de hoofdlijst */}
        {sortedZsmUnchecked.length > 0 && (
          <div className="mb-4 pb-4 border-b border-dashed border-gray-200">
            {showCategoryTitles && (
              <h3 className="mb-2 text-xs font-normal uppercase tracking-wide text-gray-500">
                z.s.m.
              </h3>
            )}
            <div>
              {sortedZsmUnchecked.map((item) => (
                <div key={item.id} data-shopping-list-item>
                  <ShoppingListItem
                    item={item}
                    onCheck={onCheck}
                    onUncheck={onUncheck}
                    onDelete={onDelete}
                    onUpdateDescription={onUpdateDescription}
                    showEmoji={showEmojis}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
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
                        showEmoji={showEmojis}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        ) : null}
        {/* Later – onderaan de hoofdlijst */}
        {sortedLaterUnchecked.length > 0 && (
          <div className={`${sortedUncheckedCategories.length > 0 ? 'mt-4 pt-4 border-t border-dashed border-gray-200' : ''}`}>
            {showCategoryTitles && (
            <h3 className="mb-2 text-xs font-normal uppercase tracking-wide text-gray-500">
              Later
            </h3>
            )}
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
                    showEmoji={showEmojis}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {sortedZsmUnchecked.length === 0 && sortedUncheckedCategories.length === 0 && sortedLaterUnchecked.length === 0 && (
          <p className="text-gray-500">Je boodschappenlijst is leeg</p>
        )}
        </div>
      </div>

      {/* 3. Afgevinkt */}
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
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
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
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Wis alle afgevinkte items"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {checkedSectionOpen && (
            <div className="mt-2 border-t border-dashed border-gray-200 pt-4">
              {sortedCheckedItems.map((item) => (
                <div key={item.id}>
                  <ShoppingListItem
                    item={item}
                    onCheck={onCheck}
                    onUncheck={onUncheck}
                    onDelete={onDelete}
                    onUpdateDescription={onUpdateDescription}
                    showEmoji={showEmojis}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Verwacht (op basis van koopfrequentie) */}
      {expectedProducts.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-2 flex h-8 min-h-8 items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
            <Zap className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            Verwacht
          </h2>
          <div className="border-t border-dashed border-gray-200 pt-4">
            {expectedProducts.map((product) => {
              const isAdding = addingIds.has(product.id)
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 py-2 rounded-lg transition-colors duration-300 ${isAdding ? 'bg-green-50' : ''}`}
                >
                  {showEmojis && <span className="text-lg shrink-0">{product.emoji}</span>}
                  <span className="flex-1 min-w-0 text-[15px] font-medium text-gray-900">{product.name}</span>
                  <span className="text-sm text-gray-400 shrink-0">
                    {product.days_until_expected === 0 ? 'vandaag' : `over ~ ${product.days_until_expected}d`}
                  </span>
                  {onAddExpectedToMain && (
                    <button
                      type="button"
                      onClick={() => !isAdding && handleAddWithAnimation(product.id, () => onAddExpectedToMain(product))}
                      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 transition-colors duration-300 ${isAdding ? 'bg-white text-green-800' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'}`}
                      aria-label="Toevoegen aan hoofdlijst"
                      disabled={isAdding}
                    >
                      {isAdding ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Plus className="h-5 w-5" strokeWidth={2} />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Basics (ster-icoon) – altijd tonen */}
      <div className={cardClass}>
        <button
          type="button"
          onClick={() => setBasicsSectionOpen((open) => !open)}
          className="flex h-8 min-h-8 w-full items-center justify-between gap-2 text-left"
          aria-expanded={basicsSectionOpen}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-gray-500 tracking-wide">
            {basicsSectionOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
            )}
            <Star className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            Basics
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-green-600">
            <ShoppingCart className="h-4 w-4" />
            <span className="font-medium">
              {basicProducts.filter((p) => productIdsInList.has(p.id) || addingIds.has(p.id)).length}
            </span>
          </span>
        </button>
        {basicsSectionOpen && (
          <div className="mt-2 border-t border-dashed border-gray-200 pt-4">
            {basicsAll.length > 0 ? (
              <div className="-mx-4">
                {basicsAll.map((product) => {
                  const isOnList = productIdsInList.has(product.id)
                  const isAdding = addingIds.has(product.id)
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 py-2 px-4 transition-colors duration-300 ${isOnList || isAdding ? 'bg-green-50' : ''}`}
                    >
                      {showEmojis && <span className="text-lg shrink-0">{product.emoji}</span>}
                      <span className="flex-1 min-w-0 text-[15px] font-medium text-gray-900">{product.name}</span>
                      {isOnList && onRemoveBasicFromMain ? (
                        <button
                          type="button"
                          onClick={() => {
                            haptic('light')
                            onRemoveBasicFromMain(product)
                          }}
                          className="shrink-0 flex h-8 w-8 items-center justify-center text-green-600 hover:text-green-700"
                          aria-label="Verwijder van hoofdlijst"
                        >
                          <Check className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      ) : onAddBasicToMain ? (
                        <button
                          type="button"
                          onClick={() => !isAdding && handleAddWithAnimation(product.id, () => onAddBasicToMain!(product))}
                          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 transition-colors duration-300 ${isAdding ? 'bg-white text-green-800' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'}`}
                          aria-label="Toevoegen aan hoofdlijst"
                          disabled={isAdding}
                        >
                          {isAdding ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Plus className="h-5 w-5" strokeWidth={2} />}
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Ga naar{' '}
                <Link href="/producten" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                  <Package className="h-4 w-4 shrink-0" />
                  Producten
                </Link>
                {' '}en markeer producten als Basic{' '}
                <Star className="inline-block h-4 w-4 shrink-0 align-middle text-gray-500" />
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
