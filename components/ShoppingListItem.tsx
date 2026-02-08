'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Trash2, CornerDownLeft } from 'lucide-react'
import Skeleton from './Skeleton'

const LONG_PRESS_MS = 600

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
  const checkboxRef = useRef<HTMLButtonElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressActive, setPressActive] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY = useRef<number>(0)
  const longPressJustTriggeredRef = useRef(false)

  const handleCheck = async () => {
    if (longPressJustTriggeredRef.current) {
      longPressJustTriggeredRef.current = false
      return
    }
    if (item.is_checked) {
      if (checkboxRef.current) {
        checkboxRef.current.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out'
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

  const handleDelete = async () => {
    setShowSubmenu(false)
    if (confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
      setIsDeleting(true)
      if (itemRef.current) {
        itemRef.current.style.transition = 'transform 0.2s ease-in, opacity 0.2s ease-in'
        itemRef.current.style.transform = 'translateX(-100px)'
        itemRef.current.style.opacity = '0'
        setTimeout(() => onDelete(item.id), 200)
        return
      }
      onDelete(item.id)
    }
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
      setPressActive(true)
      setTimeout(() => setPressActive(false), 120)
      setShowSubmenu(true)
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
      itemRef.current.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out'
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
    if (longPressJustTriggeredRef.current) {
      longPressJustTriggeredRef.current = false
      return
    }
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

  if (isDeleting) {
    return null
  }

  const showChecked = item.is_checked || isChecking

  return (
    <div className="relative rounded-2xl" data-shopping-list-item>
      {/* Row */}
      <div
        ref={itemRef}
        className={`relative flex select-none items-center gap-3 px-4 py-3 rounded-2xl transition-transform duration-150 ${
          showChecked ? 'bg-transparent opacity-90' : 'bg-white'
        } ${isChecking ? 'scale-[0.98]' : ''} ${
          isPressing ? 'scale-[0.99]' : pressActive ? 'scale-[0.97]' : ''
        }`}
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
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

        <span className="text-lg shrink-0">{item.emoji}</span>

        <div className={isEditingDescription ? 'shrink-0 min-w-0' : 'flex-1 min-w-0'}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {item.product_name != null ? (
              <span
                className={`font-medium shrink-0 ${
                  showChecked ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}
              >
                {item.product_name}
              </span>
            ) : (
              <Skeleton variant="text" className="h-5 w-24 shrink-0" animation="pulse" />
            )}
            {!isEditingDescription && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleEditClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsEditingDescription(true)
                    setEditValue(item.description || '')
                  }
                }}
                className={`text-sm cursor-pointer hover:text-gray-700 flex-1 min-w-0 min-h-[1.25rem] block ${item.description ? 'text-gray-500' : ''}`}
                aria-label="Toelichting bewerken"
              >
                {item.description ?? ''}
              </span>
            )}
          </div>
        </div>

        {isEditingDescription && (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="h-5 w-px shrink-0 bg-gray-200 self-center" aria-hidden />
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={handleKeyDown}
              placeholder="Toelichting"
              className="flex-1 min-w-0 rounded bg-transparent px-2 py-1 text-left text-gray-600 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px]"
              style={{ fontSize: '12px' }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveDescription}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Opslaan"
            >
              <CornerDownLeft className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Long-press submenu: klein, rechts uitgelijnd, iets over het item */}
      {showSubmenu && !item.is_checked && !isEditingDescription && (
        <div
          ref={submenuRef}
          className="absolute right-2 top-1/2 z-10 min-w-0 -translate-y-1/2 select-none overflow-hidden rounded-lg bg-white py-1.5 shadow-lg ring-1 ring-black/5 animate-slide-down"
          style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Verwijderen"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Verwijder
          </button>
        </div>
      )}
    </div>
  )
}
