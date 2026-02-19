'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag, Zap, Clock, Plus, Pencil } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdId } from '@/lib/hooks/use-household'
import { useLabels, useSetItemLabels, labelQueryKeys, type Label } from '@/lib/hooks/use-labels'
import type { ItemLabel } from '@/lib/hooks/use-shopping-list'

const CUSTOM_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'gray'] as const
const COLOR_CLASSES: Record<string, { light: string; filled: string }> = {
  purple: { light: 'bg-purple-100 text-purple-700', filled: 'bg-purple-600 text-white' },
  gray: { light: 'bg-gray-100 text-gray-500', filled: 'bg-gray-600 text-white' },
  blue: { light: 'bg-blue-100 text-blue-700', filled: 'bg-blue-600 text-white' },
  green: { light: 'bg-green-100 text-green-700', filled: 'bg-green-600 text-white' },
  amber: { light: 'bg-amber-100 text-amber-700', filled: 'bg-amber-600 text-white' },
  red: { light: 'bg-red-100 text-red-700', filled: 'bg-red-600 text-white' },
}

function getLabelClasses(label: Label | ItemLabel, isSelected: boolean) {
  const c = COLOR_CLASSES[label.color] || COLOR_CLASSES.gray
  if (isSelected) return c.filled
  return c.light
}

interface LabelDropdownProps {
  itemId: string
  itemLabels: ItemLabel[]
  isEditMode: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  dropdownRef?: React.RefObject<HTMLDivElement | null>
  isOpen: boolean
  onClose: () => void
  onPendingLabelsChange?: (labels: ItemLabel[]) => void
  onMigrateLater?: () => void
  hasLaterInDescription?: boolean
}

export default function LabelDropdown({
  itemId,
  itemLabels,
  isEditMode,
  anchorRef,
  dropdownRef: dropdownRefProp,
  isOpen,
  onClose,
  onPendingLabelsChange,
  onMigrateLater,
  hasLaterInDescription = false,
}: LabelDropdownProps) {
  const queryClient = useQueryClient()
  const { householdId } = useHouseholdId()
  const { data: labels = [], isLoading } = useLabels()
  const setLabelsMutation = useSetItemLabels()
  const dropdownRefInternal = useRef<HTMLDivElement>(null)
  const dropdownRef = dropdownRefProp ?? dropdownRefInternal
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState<string>('blue')
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editLabelName, setEditLabelName] = useState('')
  const [editLabelColor, setEditLabelColor] = useState<string>('blue')

  // Pending selection (optimistic) - sync from itemLabels when dropdown opens
  const [pendingLabelIds, setPendingLabelIds] = useState<string[]>(() => itemLabels.map((l) => l.id))

  // Mijn labels: default = view only (no edit icons), edit = full edit mode
  const [isEditingMijnLabels, setIsEditingMijnLabels] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPendingLabelIds(itemLabels.map((l) => l.id))
    }
  }, [isOpen, itemLabels])

  useEffect(() => {
    if (!isOpen) setIsEditingMijnLabels(false)
  }, [isOpen])

  const selectedIds = new Set(pendingLabelIds)

  // Migrate "later" from description to label on first edit (when dropdown opens)
  const hasMigratedRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      hasMigratedRef.current = false
      return
    }
    if (hasMigratedRef.current) return
    if (!hasLaterInDescription || itemLabels.length > 0 || !onMigrateLater) return
    const laterLabel = labels.find((l) => l.slug === 'later')
    if (!laterLabel) return
    hasMigratedRef.current = true
    setLabelsMutation.mutate(
      { itemId, labelIds: [laterLabel.id] },
      {
        onSuccess: () => {
          setPendingLabelIds([laterLabel.id])
          onPendingLabelsChange?.([{ id: laterLabel.id, name: laterLabel.name, color: laterLabel.color, type: laterLabel.type, slug: laterLabel.slug }])
          onMigrateLater()
        },
      }
    )
  }, [isOpen, hasLaterInDescription, itemLabels.length, onMigrateLater, labels, itemId])

  const smartLabels = labels.filter((l) => l.type === 'smart')
  const customLabels = labels
    .filter((l) => l.type === 'custom')
    .sort((a, b) => {
      if (a.usage_count !== b.usage_count) return b.usage_count - a.usage_count
      return a.name.localeCompare(b.name, 'nl')
    })

  const handleToggleLabel = (label: Label) => {
    haptic('light')
    let nextIds: string[]

    if (label.type === 'smart') {
      const otherSmart = smartLabels.find((s) => s.id !== label.id)
      const isAdding = !selectedIds.has(label.id)
      if (isAdding) {
        nextIds = [...selectedIds]
        if (otherSmart && selectedIds.has(otherSmart.id)) {
          nextIds = nextIds.filter((id) => id !== otherSmart.id)
        }
        nextIds.push(label.id)
      } else {
        nextIds = [...selectedIds].filter((id) => id !== label.id)
      }
    } else {
      const isAdding = !selectedIds.has(label.id)
      nextIds = isAdding ? [...selectedIds, label.id] : [...selectedIds].filter((id) => id !== label.id)
    }

    setPendingLabelIds(nextIds)
    const nextLabels = nextIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as ItemLabel[]
    onPendingLabelsChange?.(nextLabels.map((l) => ({ id: l.id, name: l.name, color: l.color, type: l.type, slug: l.slug })))
  }

  const handleSubmit = useCallback(() => {
    haptic('light')
    onClose()
    setLabelsMutation.mutate({ itemId, labelIds: pendingLabelIds })
  }, [itemId, pendingLabelIds, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (dropdownRef?.current?.contains(target)) return
      handleSubmit()
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, anchorRef, handleSubmit])

  const handleAddLabel = async () => {
    if (!newLabelName.trim() || !householdId) return
    haptic('light')
    try {
      const supabase = createClient()
      const { data: label, error } = await supabase
        .from('labels')
        .insert({
          household_id: householdId,
          name: newLabelName.trim(),
          color: newLabelColor,
          type: 'custom',
          display_order: 999,
        })
        .select('id, name, color, type, slug, display_order, usage_count')
        .single()

      if (error || !label) throw new Error('Failed to add label')

      setNewLabelName('')
      setIsAddingLabel(false)
      queryClient.invalidateQueries({ queryKey: labelQueryKeys.labels })
      const newIds = [...selectedIds, label.id]
      setPendingLabelIds(newIds)
      const newLabels = newIds.map((id) => {
        if (id === label.id) return { id: label.id, name: label.name, color: label.color, type: 'custom' as const, slug: null as string | null }
        return labels.find((l) => l.id === id)
      }).filter(Boolean) as ItemLabel[]
      onPendingLabelsChange?.(newLabels)
    } catch {
      // TODO: show error
    }
  }

  const handleSaveEdit = async (labelId: string) => {
    if (!editLabelName.trim()) return
    haptic('light')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('labels')
        .update({ name: editLabelName.trim(), color: editLabelColor })
        .eq('id', labelId)

      if (error) throw new Error('Failed to update label')

      setEditingLabelId(null)
      setEditLabelName('')
      queryClient.invalidateQueries({ queryKey: labelQueryKeys.labels })
    } catch {
      // TODO: show error
    }
  }

  if (!isOpen) return null

  const setRef = (el: HTMLDivElement | null) => {
    dropdownRefInternal.current = el
    if (dropdownRefProp) (dropdownRefProp as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  return (
    <div
      ref={setRef}
      className="mt-2 w-full max-w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col"
      style={{ maxHeight: 'min(400px, 70vh)' }}
    >
      <div className="overflow-y-auto flex-1 p-4">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-500">Laden...</div>
        ) : (
          <>
            {/* Prioriteit */}
            {smartLabels.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Prioriteit
                </h4>
                <div className="flex flex-row flex-wrap gap-2">
                  {smartLabels.map((label) => {
                    const isSelected = selectedIds.has(label.id)
                    const Icon = label.slug === 'zsm' ? Zap : Clock
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleToggleLabel(label)}
                        className={`inline-flex h-10 w-fit items-center gap-2 rounded-[80px] py-[8px] transition-colors ${getLabelClasses(label, isSelected)}`}
                        style={{ paddingLeft: 16, paddingRight: 16 }}
                      >
                        <Icon className="h-5 w-5 shrink-0 opacity-80" />
                        <span className="font-medium">{label.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mijn labels */}
            <div>
              <h4 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Mijn labels
              </h4>
              {isAddingLabel ? (
                <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Labelnaam"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLabel()
                      if (e.key === 'Escape') setIsAddingLabel(false)
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {CUSTOM_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={`h-8 w-8 rounded-full border-2 transition-colors ${
                          newLabelColor === color
                            ? 'border-gray-900 ' + COLOR_CLASSES[color].filled
                            : 'border-transparent ' + COLOR_CLASSES[color].light
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingLabel(false)}
                      className="rounded-[16px] px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      disabled={!newLabelName.trim()}
                      className="rounded-[16px] bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Toevoegen
                    </button>
                  </div>
                </div>
              ) : isEditingMijnLabels ? (
                <div className="flex flex-wrap gap-2">
                  {customLabels.map((label) => {
                    const isSelected = selectedIds.has(label.id)
                    const isEditing = editingLabelId === label.id
                    return isEditing ? (
                      <div key={label.id} className="w-full space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <input
                          type="text"
                          value={editLabelName}
                          onChange={(e) => setEditLabelName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(label.id)
                            if (e.key === 'Escape') setEditingLabelId(null)
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-2">
                          {CUSTOM_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditLabelColor(color)}
                              className={`h-7 w-7 rounded-full border-2 transition-colors ${
                                editLabelColor === color
                                  ? 'border-gray-900 ' + COLOR_CLASSES[color].filled
                                  : 'border-transparent ' + COLOR_CLASSES[color].light
                              }`}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingLabelId(null)}
                            className="rounded-[16px] px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                          >
                            Annuleren
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(label.id)}
                            className="rounded-[16px] bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Opslaan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleToggleLabel(label)}
                        className={`inline-flex h-10 w-fit min-w-0 items-center gap-3 rounded-[80px] transition-colors ${getLabelClasses(label, isSelected)}`}
                        style={{ paddingLeft: 16, paddingTop: 2, paddingBottom: 2, paddingRight: 4 }}
                      >
                        <span className="font-medium truncate">{label.name}</span>
                        {label.type === 'custom' && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              haptic('light')
                              setEditingLabelId(label.id)
                              setEditLabelName(label.name)
                              setEditLabelColor(CUSTOM_COLORS.includes(label.color as (typeof CUSTOM_COLORS)[number]) ? label.color : 'blue')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingLabelId(label.id)
                                setEditLabelName(label.name)
                                setEditLabelColor(CUSTOM_COLORS.includes(label.color as (typeof CUSTOM_COLORS)[number]) ? label.color : 'blue')
                              }
                            }}
                            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAddingLabel(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customLabels.map((label) => {
                    const isSelected = selectedIds.has(label.id)
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleToggleLabel(label)}
                        className={`inline-flex h-10 w-fit min-w-0 items-center gap-3 rounded-[80px] py-[8px] transition-colors ${getLabelClasses(label, isSelected)}`}
                        style={{ paddingLeft: 16, paddingRight: 16 }}
                      >
                        <span className="font-medium truncate">{label.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            haptic('light')
            setIsEditingMijnLabels((v) => !v)
            if (isEditingMijnLabels) {
              setIsAddingLabel(false)
              setEditingLabelId(null)
            }
          }}
          className="inline-flex items-center gap-1.5 font-medium text-gray-500 hover:text-gray-700 hover:underline"
          style={{ fontSize: 14 }}
        >
          <Pencil className="h-4 w-4 shrink-0" />
          Bewerken
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          style={{ fontSize: 14 }}
        >
          Klaar
        </button>
      </div>
    </div>
  )
}
