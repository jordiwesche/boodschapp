'use client'

import { useRef, useEffect } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

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
  /** Show spinner while searching */
  isSearching?: boolean
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
  isSearching = false,
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
    <div className="mb-2 flex items-center gap-3 rounded-[16px] border border-gray-200 bg-white px-4 py-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
        <Check className="h-3 w-3 text-transparent" />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 min-w-0 items-center gap-0.5">
        <input
          ref={inputCallbackRef}
          type="text"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          onKeyDown={handleProductKeyDown}
          onBlur={handleProductBlur}
          enterKeyHint="done"
          placeholder="Product / item"
          className={`border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none ${
            isSearching && productName.trim().length >= 2 ? 'flex-none' : 'min-w-0 flex-1'
          }`}
          style={{
            fontSize: '16px',
            ...(isSearching && productName.trim().length >= 2
              ? { width: `${Math.max(2, productName.length) + 0.3}ch` }
              : {}),
          }}
          autoFocus={autoFocus}
          inputMode="text"
        />
        {isSearching && productName.trim().length >= 2 && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" aria-hidden />
        )}
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
