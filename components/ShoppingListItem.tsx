'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Trash2, Plus, X, Tag, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import Skeleton from './Skeleton'
import LabelDropdown from './LabelDropdown'
import type { ItemLabel } from '@/lib/hooks/use-shopping-list'
import { useLabels, useSetItemLabels, type Label } from '@/lib/hooks/use-labels'

const LONG_PRESS_MS = 600

const CHECK_PATTERN = /(?:^|[\s(])(check)(?:$|[\s)])/i
const LATER_DAY_PATTERN = /(?:^|[\s(])(later|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)(?:$|[\s)])/i

type DescriptionLabel = { type: 'check' | 'later'; token: string }

function detectDescriptionLabel(description: string | null): DescriptionLabel | null {
  if (!description) return null
  const d = description.trim()
  const checkMatch = d.match(CHECK_PATTERN)
  if (checkMatch) return { type: 'check', token: checkMatch[1] }
  const laterMatch = d.match(LATER_DAY_PATTERN)
  if (laterMatch) return { type: 'later', token: laterMatch[1] }
  return null
}

function stripLabelToken(description: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return description
    .replace(new RegExp(`\\(\\s*${escaped}\\s*\\)`, 'i'), '')
    .replace(new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasLaterDayToken(description: string | null): boolean {
  const d = description?.trim()
  return !!d && LATER_DAY_PATTERN.test(d)
}

function stripLaterTokenFromDescription(description: string | null): string | null {
  const d = description?.trim()
  if (!d) return null
  const cleaned = d.replace(LATER_DAY_PATTERN, '').replace(/\s+/g, ' ').trim()
  return cleaned === '' ? null : cleaned
}

/** Words that match check/later patterns - exclude from exact-label matching to avoid duplicates */
function isDescriptionLabelToken(word: string): boolean {
  return CHECK_PATTERN.test(` ${word} `) || LATER_DAY_PATTERN.test(` ${word} `)
}

function getDescriptionMatchedLabels(
  description: string | null,
  labels: Label[]
): { matched: ItemLabel[]; strippedDescription: string } {
  const d = description?.trim() ?? ''
  if (!d || labels.length === 0) return { matched: [], strippedDescription: d }
  const words = d.split(/\s+/)
  const matched: ItemLabel[] = []
  const seenIds = new Set<string>()
  for (const word of words) {
    if (isDescriptionLabelToken(word)) continue
    const label = labels.find((l) => l.name.toLowerCase() === word.toLowerCase())
    if (label && !seenIds.has(label.id)) {
      seenIds.add(label.id)
      matched.push({ id: label.id, name: label.name, color: label.color, type: label.type, slug: label.slug })
    }
  }
  let stripped = d
  for (const m of matched) {
    const escaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    stripped = stripped.replace(new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'gi'), ' ').replace(/\s+/g, ' ').trim()
  }
  return { matched, strippedDescription: stripped }
}

const LABEL_COLOR_CLASSES: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-500',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
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

interface ShoppingListItemProps {
  item: ShoppingListItemData
  onCheck: (id: string) => void
  onUncheck?: (id: string) => void
  onDelete: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  /** Show "move to main list" up arrow (Binnenkort → Hoofdlijst) */
  showMoveToMain?: boolean
  onMoveToMain?: () => void
  /** Show emoji next to product name (default true) */
  showEmoji?: boolean
  /** When set, another item has label dropdown open; used for dimming */
  activeLabelItemId?: string | null
  /** Called when this item opens/closes its label dropdown */
  onLabelDropdownOpenChange?: (itemId: string | null) => void
}

export default function ShoppingListItem({
  item,
  onCheck,
  onUncheck,
  onDelete,
  onUpdateDescription,
  showMoveToMain = false,
  onMoveToMain,
  showEmoji = true,
  activeLabelItemId = null,
  onLabelDropdownOpenChange,
}: ShoppingListItemProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editValue, setEditValue] = useState(item.description || '')
  const checkboxRef = useRef<HTMLButtonElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressActive, setPressActive] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY = useRef<number>(0)
  const longPressJustTriggeredRef = useRef(false)
  const submenuOpenedAtRef = useRef<number>(0)
  const [showLabelDropdown, setShowLabelDropdown] = useState(false)
  const [labelDropdownClosing, setLabelDropdownClosing] = useState(false)
  const [pendingLabels, setPendingLabels] = useState<ItemLabel[] | null>(null)
  const labelButtonRef = useRef<HTMLButtonElement>(null)
  const labelDropdownRef = useRef<HTMLDivElement>(null)

  const displayLabels = showLabelDropdown && pendingLabels !== null ? pendingLabels : (item.labels ?? [])

  const handleCheck = async () => {
    if (longPressJustTriggeredRef.current) {
      longPressJustTriggeredRef.current = false
      return
    }
    if (item.is_checked) {
      if (checkboxRef.current) {
        checkboxRef.current.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
        checkboxRef.current.style.transform = 'scale(1.2)'
        checkboxRef.current.style.opacity = '0.8'
        setTimeout(() => {
          if (checkboxRef.current) {
            checkboxRef.current.style.transform = 'scale(1)'
            checkboxRef.current.style.opacity = '1'
          }
        }, 150)
      }
      onUncheck?.(item.id)
      return
    }

    setIsChecking(true)
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    checkTimeoutRef.current = setTimeout(() => {
      checkTimeoutRef.current = null
      onCheck(item.id)
      setIsChecking(false)
    }, 1000)
  }

  const handleDeleteClick = () => {
    haptic('light')
    setShowSubmenu(false)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false)
    setIsDeleting(true)
    if (itemRef.current) {
      itemRef.current.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
      itemRef.current.style.transform = 'translateX(-100px)'
      itemRef.current.style.opacity = '0'
      setTimeout(() => onDelete(item.id), 200)
      return
    }
    onDelete(item.id)
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsPressing(false)
  }

  const startLongPress = (clientY?: number) => {
    if (item.is_checked || isEditingDescription) return
    clearLongPress()
    if (clientY != null) touchStartY.current = clientY
    setIsPressing(true)
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      longPressJustTriggeredRef.current = true
      haptic('medium')
      setPressActive(true)
      setTimeout(() => setPressActive(false), 120)
      setShowSubmenu(true)
      submenuOpenedAtRef.current = Date.now()
      setIsPressing(false)
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dy > 10) clearLongPress()
  }

  useEffect(() => {
    const closeSubmenu = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (itemRef.current?.contains(target) || submenuRef.current?.contains(target)) return
      setShowSubmenu(false)
    }
    if (showSubmenu) {
      document.addEventListener('mousedown', closeSubmenu)
      document.addEventListener('touchstart', closeSubmenu, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', closeSubmenu)
      document.removeEventListener('touchstart', closeSubmenu)
    }
  }, [showSubmenu])

  // Fade in animation on mount
  useEffect(() => {
    if (itemRef.current) {
      itemRef.current.style.opacity = '0'
      itemRef.current.style.transform = 'translateY(10px)'
      itemRef.current.style.transition = 'opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
      requestAnimationFrame(() => {
        if (itemRef.current) {
          itemRef.current.style.opacity = '1'
          itemRef.current.style.transform = 'translateY(0)'
        }
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showSubmenu) {
      setShowSubmenu(false)
      return
    }
    if (longPressJustTriggeredRef.current) {
      longPressJustTriggeredRef.current = false
      return
    }
    setIsEditingDescription(true)
    setEditValue(item.description || '')
  }

  const editAreaRef = useRef<HTMLDivElement>(null)
  const descriptionInputRef = useRef<HTMLInputElement>(null)
  const clearButtonTouchedRef = useRef(false)
  const labelButtonTouchedRef = useRef(false)
  const { data: labels = [] } = useLabels()
  const setLabelsMutation = useSetItemLabels()

  const handleSaveDescription = () => {
    let descToSave = editValue.trim()
    const hasLater = hasLaterDayToken(descToSave)
    const hasLaterLabel = (item.labels ?? []).some((l) => l.slug === 'later')

    if (hasLater && !hasLaterLabel) {
      const laterLabel = labels.find((l) => l.slug === 'later')
      if (laterLabel) {
        const currentIds = (item.labels ?? []).map((l) => l.id)
        const nextIds = [...currentIds.filter((id) => {
          const lbl = labels.find((l) => l.id === id)
          return !lbl || lbl.type !== 'smart' || lbl.slug === 'later'
        }), laterLabel.id]
        setLabelsMutation.mutate({ itemId: item.id, labelIds: nextIds })
        const laterMatch = descToSave.match(LATER_DAY_PATTERN)
        if (laterMatch && laterMatch[1].toLowerCase() === 'later') {
          descToSave = stripLaterTokenFromDescription(descToSave) ?? ''
        }
      }
    } else if (!hasLater && hasLaterLabel) {
      const nextIds = (item.labels ?? [])
        .filter((l) => l.slug !== 'later')
        .map((l) => l.id)
      setLabelsMutation.mutate({ itemId: item.id, labelIds: nextIds })
    }
    onUpdateDescription(item.id, descToSave)
    setIsEditingDescription(false)
  }
  const handleEditAreaBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && (editAreaRef.current?.contains(next) || labelDropdownRef.current?.contains(next))) return
    // Mobile: relatedTarget is vaak null; fallback op flag van pointerdown op kruisje/labelknop
    if (clearButtonTouchedRef.current) {
      clearButtonTouchedRef.current = false
      return
    }
    if (labelButtonTouchedRef.current) {
      labelButtonTouchedRef.current = false
      return
    }
    handleSaveDescription()
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

  if (isDeleting) {
    return null
  }

  const showChecked = item.is_checked || isChecking

  const showLabelDropdownArea = showLabelDropdown || labelDropdownClosing
  const isLabelDropdownActive = activeLabelItemId === item.id

  const handleLabelDropdownClose = () => {
    setLabelDropdownClosing(true)
    setTimeout(() => {
      setShowLabelDropdown(false)
      setPendingLabels(null)
      setLabelDropdownClosing(false)
      onLabelDropdownOpenChange?.(null)
      if (isEditingDescription) handleSaveDescription()
    }, 150)
  }

  const getRowBgClass = () => {
    if (showChecked) return 'bg-transparent opacity-90'
    if (activeLabelItemId) {
      return isLabelDropdownActive ? 'bg-transparent' : 'bg-gray-100'
    }
    return 'bg-white'
  }

  const descriptionMatched = getDescriptionMatchedLabels(item.description, labels)
  const descLabel = detectDescriptionLabel(item.description)
  const labelsToShow = descLabel?.type === 'later'
    ? [...displayLabels, ...descriptionMatched.matched].filter((l) => l.slug !== 'later')
    : [...displayLabels, ...descriptionMatched.matched]

  return (
    <div className="relative" data-shopping-list-item>
      {/* White wrapper when this item has dropdown open; row + dropdown inside */}
      <div className={showLabelDropdownArea ? 'rounded-xl bg-white -mx-2 px-2 pt-2 pb-2' : ''}>
        {/* Row */}
        <div
          ref={itemRef}
          className={`relative flex select-none items-center gap-3 py-2 transition-colors duration-200 transition-transform duration-150 ${
            getRowBgClass()
          } ${isChecking ? 'scale-[0.98]' : ''} ${
            isPressing ? 'scale-[0.99]' : pressActive ? 'scale-[0.97]' : ''
          }`}
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (!showSubmenu) return
          if (Date.now() - submenuOpenedAtRef.current < 400) return
          const target = e.target as Node
          if (checkboxRef.current?.contains(target) || submenuRef.current?.contains(target)) return
          e.preventDefault()
          e.stopPropagation()
          setShowSubmenu(false)
        }}
        onTouchStart={(e) => startLongPress(e.touches[0].clientY)}
        onTouchMove={handleTouchMove}
        onTouchEnd={clearLongPress}
        onTouchCancel={clearLongPress}
        onMouseDown={() => startLongPress()}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
      >
        <button
          ref={checkboxRef}
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            showChecked
              ? 'border-green-600 bg-green-600 scale-110'
              : 'border-gray-300 hover:border-green-500'
          }`}
          aria-label={showChecked ? 'Afgevinkt' : 'Afvinken'}
        >
          {showChecked && <Check className="h-3 w-3 text-white" />}
        </button>

        {showEmoji && <span className="text-lg shrink-0">{item.emoji}</span>}

        <div className={isEditingDescription && !showLabelDropdownArea ? 'shrink-0 min-w-0' : 'flex-1 min-w-0'}>
          <div className="flex h-6 items-center gap-2 min-w-0 flex-1">
            {!isEditingDescription ? (
              <div
                role={showChecked ? undefined : 'button'}
                tabIndex={showChecked ? undefined : 0}
                onClick={showChecked ? undefined : handleEditClick}
                onKeyDown={showChecked ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsEditingDescription(true)
                    setEditValue(item.description || '')
                  }
                }}
                className={`flex h-6 min-w-0 flex-1 flex-nowrap items-center gap-2 ${showChecked ? '' : 'cursor-pointer'}`}
                aria-label={showChecked ? undefined : 'Toelichting bewerken'}
              >
                {item.product_name != null ? (
                  <span
                    className={`flex h-6 shrink-0 items-center text-[16px] font-medium ${
                      showChecked ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.product_name}
                  </span>
                ) : (
                  <Skeleton variant="text" className="h-6 w-24 shrink-0" animation="pulse" />
                )}
                <span
                  className={`text-sm flex h-6 min-w-0 flex-1 flex-nowrap items-center overflow-hidden truncate ${item.description ? 'text-gray-500' : ''}`}
                >
                  {!descLabel ? descriptionMatched.strippedDescription || '' : stripLabelToken(descriptionMatched.strippedDescription, descLabel.token) ?? ''}
                </span>
                <span className="ml-auto flex h-6 shrink-0 flex-nowrap items-center gap-1.5">
                  {labelsToShow
                    .sort((a, b) => (a.type === 'smart' ? 1 : 0) - (b.type === 'smart' ? 1 : 0))
                    .map((l) => {
                    const Icon = l.type === 'smart' ? (l.slug === 'zsm' ? Zap : Clock) : null
                    return (
                      <span
                        key={l.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium leading-none ${LABEL_COLOR_CLASSES[l.color] || LABEL_COLOR_CLASSES.gray}`}
                      >
                        {Icon && <Icon className="h-3 w-3 shrink-0 opacity-80" />}
                        {l.name}
                      </span>
                    )
                  })}
                  {descLabel && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium leading-none shrink-0 ${
                        descLabel.type === 'check'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {descLabel.type === 'later' && <Clock className="h-3 w-3 shrink-0 opacity-80" />}
                      {descLabel.token.toLowerCase()}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <>
                {item.product_name != null ? (
                  <span
                    className={`flex h-6 items-center text-[16px] font-medium shrink-0 ${
                      showChecked ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.product_name}
                  </span>
                ) : (
                  <Skeleton variant="text" className="h-6 w-24 shrink-0" animation="pulse" />
                )}
                {showLabelDropdownArea && (
                  <span className="ml-auto flex h-6 shrink-0 flex-nowrap items-center gap-1.5">
                    {[...displayLabels]
                      .sort((a, b) => (a.type === 'smart' ? 1 : 0) - (b.type === 'smart' ? 1 : 0))
                      .map((l) => {
                        const Icon = l.type === 'smart' ? (l.slug === 'zsm' ? Zap : Clock) : null
                        return (
                          <span
                            key={l.id}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium leading-none ${LABEL_COLOR_CLASSES[l.color] || LABEL_COLOR_CLASSES.gray}`}
                          >
                            {Icon && <Icon className="h-3 w-3 shrink-0 opacity-80" />}
                            {l.name}
                          </span>
                        )
                      })}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {isEditingDescription && !showChecked && (
          <div ref={editAreaRef} onBlur={handleEditAreaBlur} className={`flex h-6 items-center gap-2 min-w-0 ${showLabelDropdownArea ? 'shrink-0' : 'flex-1'}`}>
            {!showLabelDropdownArea && (
              <>
            <input
              ref={descriptionInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Toelichting"
              className="flex-1 min-w-0 rounded bg-transparent px-2 py-1 text-left text-gray-600 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px]"
              style={{ fontSize: '12px' }}
              autoFocus
            />
            <button
              type="button"
              onPointerDown={() => {
                clearButtonTouchedRef.current = true
              }}
              onClick={() => {
                haptic('light')
                setEditValue('')
                // Focus terug op input zodat toetsenbord open blijft op mobiel
                requestAnimationFrame(() => {
                  descriptionInputRef.current?.focus()
                })
              }}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toelichting wissen"
            >
              <X className="h-4 w-4" />
            </button>
            </>
            )}
            <button
              ref={labelButtonRef}
              type="button"
              onPointerDown={() => { labelButtonTouchedRef.current = true }}
              onTouchStart={() => { labelButtonTouchedRef.current = true }}
              onClick={(e) => {
                e.stopPropagation()
                haptic('light')
                const nextValue = !showLabelDropdown
                setShowLabelDropdown(nextValue)
                if (nextValue) {
                  setPendingLabels([...(item.labels ?? [])])
                  onLabelDropdownOpenChange?.(item.id)
                } else {
                  setPendingLabels(null)
                  onLabelDropdownOpenChange?.(null)
                }
              }}
              className="shrink-0 flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-full border border-gray-200 px-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              aria-label="Labels"
            >
              <Tag className="h-4 w-4" />
              {showLabelDropdown ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          </div>
        )}

        {showMoveToMain && onMoveToMain && !isEditingDescription && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onMoveToMain()
            }}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Verplaats naar hoofdlijst"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Long-press submenu: tekst link met icoon */}
      {showSubmenu && !item.is_checked && !isEditingDescription && (
        <div
          ref={submenuRef}
          className="absolute right-2 top-1/2 z-10 min-w-0 -translate-y-1/2 select-none animate-slide-down"
          style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex items-center gap-2 whitespace-nowrap text-left text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            aria-label="Verwijderen"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Verwijder
          </button>
        </div>
      )}

        {(showLabelDropdown || labelDropdownClosing) && (
          <LabelDropdown
            itemId={item.id}
            itemLabels={item.labels ?? []}
            isEditMode={isEditingDescription}
            anchorRef={labelButtonRef}
            dropdownRef={labelDropdownRef}
            isOpen={showLabelDropdown}
            isClosing={labelDropdownClosing}
            onClose={handleLabelDropdownClose}
            onPendingLabelsChange={setPendingLabels}
            hasLaterInDescription={hasLaterDayToken(item.description)}
            onMigrateLater={
              hasLaterDayToken(item.description)
                ? () => onUpdateDescription(item.id, stripLaterTokenFromDescription(item.description) ?? '')
                : undefined
            }
          />
        )}
      </div>

      {/* Modal: bevestiging item verwijderen */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => setShowDeleteModal(false)} />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">Weet je zeker dat je dit item wilt verwijderen?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
    </div>
  )
}
