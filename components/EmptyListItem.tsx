'use client'

import { useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

interface EmptyListItemProps {
  productName: string
  onProductNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  onAdd: (productName: string, description: string | null) => void
  onCancel: () => void
  autoFocus?: boolean
  onFocusComplete?: () => void
  /** When returns true, default key handling (Enter, Escape) is skipped */
  onProductKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => boolean | void
}

export default function EmptyListItem({
  productName,
  onProductNameChange,
  description,
  onDescriptionChange,
  onAdd,
  onCancel,
  autoFocus = true,
  onFocusComplete,
  onProductKeyDown,
}: EmptyListItemProps) {
  const productInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const inputCallbackRef = (node: HTMLInputElement | null) => {
    productInputRef.current = node
    if (node && autoFocus) {
      const focusAttempts = [
        () => {
          node.focus()
          if (window.innerWidth <= 768) {
            node.click()
          }
        },
        () => {
          requestAnimationFrame(() => {
            node.focus()
            if (window.innerWidth <= 768) {
              node.click()
            }
          })
        },
      ]
      focusAttempts[0]()
      focusAttempts[1]()
      if (onFocusComplete) {
        setTimeout(() => onFocusComplete(), 100)
      }
    }
  }

  useEffect(() => {
    if (autoFocus && productInputRef.current) {
      productInputRef.current.focus()
      if (window.innerWidth <= 768) {
        productInputRef.current.click()
      }
    }
  }, [autoFocus])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (productName.trim()) {
      onAdd(productName.trim(), description.trim() || null)
      onProductNameChange('')
      onDescriptionChange('')
    } else {
      onCancel()
    }
  }

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onProductKeyDown?.(e)) return
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleProductBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (productName.trim()) return
    const next = e.relatedTarget as Node | null
    if (formRef.current && next && formRef.current.contains(next)) return
    // Don’t close empty item when focus moved to a list item (e.g. delete button) – that click should delete the item
    if (next && (next as Element).closest?.('[data-shopping-list-item]')) return
    // When relatedTarget is null (e.g. some mobile browsers), defer and check activeElement so we don’t close on list-item click
    if (!next) {
      requestAnimationFrame(() => {
        const active = document.activeElement as Element | null
        if (active?.closest?.('[data-shopping-list-item]')) return
        onCancel()
      })
      return
    }
    onCancel()
  }

  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
        <Check className="h-3 w-3 text-transparent" />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 min-w-0">
        <input
          ref={inputCallbackRef}
          type="text"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          onKeyDown={handleProductKeyDown}
          onBlur={handleProductBlur}
          enterKeyHint="done"
          placeholder="Product / item"
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
          style={{ fontSize: '16px' }}
          autoFocus={autoFocus}
          inputMode="text"
        />
        <div className="h-5 w-px shrink-0 bg-gray-200 self-center" aria-hidden />
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder="Toelichting"
          className="w-28 shrink-0 rounded bg-transparent px-2 py-1 text-gray-600 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px]"
          style={{ fontSize: '12px' }}
        />
      </form>

      <button
        onClick={onCancel}
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Annuleren"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
