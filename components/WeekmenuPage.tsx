'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link as LinkIcon, CornerDownLeft, X, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/haptics'

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const

interface WeekmenuDayRow {
  day_of_week: number
  menu_text: string | null
  link_url: string | null
  link_title: string | null
}

/** Cache van het laatst geladen weekmenu: direct tonen bij opnieuw openen, geen skeleton. */
let weekmenuCache: WeekmenuDayRow[] | null = null

/** Prefetch weekmenu (bv. bij app-load) zodat de pagina direct data heeft. */
export async function prefetchWeekmenu(): Promise<void> {
  try {
    const res = await fetch('/api/weekmenu')
    if (!res.ok) return
    const data = await res.json()
    const list = (data.days ?? []) as WeekmenuDayRow[]
    if (list.length) weekmenuCache = list
  } catch {
    // ignore
  }
}

function linkDisplayText(day: WeekmenuDayRow): string {
  if (day.link_title?.trim()) return day.link_title.trim()
  try {
    return new URL(day.link_url!).hostname.replace(/^www\./, '')
  } catch {
    return day.link_url ?? ''
  }
}

function WeekmenuGerechtTextarea({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  disabled,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  placeholder: string
  disabled: boolean
  autoFocus: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const LINE_HEIGHT_PX = 20
  const MIN_HEIGHT_PX = 24
  const PADDING_TOP_PX = (MIN_HEIGHT_PX - LINE_HEIGHT_PX) / 2 // 2px: centreert één regel

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${Math.max(MIN_HEIGHT_PX, el.scrollHeight)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  // Cursor aan het einde bij openen
  const moveCursorToEnd = useCallback(() => {
    const el = ref.current
    if (!el) return
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [])

  useEffect(() => {
    if (!autoFocus) return
    moveCursorToEnd()
    const t = setTimeout(moveCursorToEnd, 0)
    return () => clearTimeout(t)
  }, [autoFocus, moveCursorToEnd])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      rows={1}
      className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-500 focus:outline-none box-border"
      style={{
        fontSize: 16,
        lineHeight: `${LINE_HEIGHT_PX}px`,
        minHeight: MIN_HEIGHT_PX,
        paddingTop: PADDING_TOP_PX,
        paddingBottom: PADDING_TOP_PX,
      }}
      onInput={resize}
    />
  )
}

export default function WeekmenuPage() {
  const [days, setDays] = useState<WeekmenuDayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [localText, setLocalText] = useState<Record<number, string>>({})
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [urlDropdownDay, setUrlDropdownDay] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [patching, setPatching] = useState<number | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const urlDropdownWrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (urlDropdownDay === null) return
    const handleMouseDown = (e: MouseEvent) => {
      if (urlDropdownWrapperRef.current?.contains(e.target as Node)) return
      setUrlDropdownDay(null)
      setUrlInput('')
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [urlDropdownDay])

  const fetchDays = useCallback(async () => {
    const res = await fetch('/api/weekmenu')
    if (!res.ok) return
    const data = await res.json()
    const list = (data.days ?? []) as WeekmenuDayRow[]
    weekmenuCache = list
    setDays(list)
    setLocalText((prev) => {
      const next = { ...prev }
      list.forEach((d) => {
        next[d.day_of_week] = d.menu_text ?? ''
      })
      return next
    })
  }, [])

  useEffect(() => {
    if (weekmenuCache?.length) {
      setDays(weekmenuCache)
      setLocalText((prev) => {
        const next = { ...prev }
        weekmenuCache!.forEach((d) => {
          next[d.day_of_week] = d.menu_text ?? ''
        })
        return next
      })
      setLoading(false)
    }
    let cancelled = false
    const run = async () => {
      await fetchDays()
      if (!cancelled) setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fetchDays])

  useEffect(() => {
    const setupRealtime = async () => {
      const userRes = await fetch('/api/user/current')
      if (!userRes.ok) return
      const userData = await userRes.json()
      if (!userData.household_id) return

      const supabase = createClient()
      const channel = supabase
        .channel('weekmenu_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'weekmenu',
            filter: `household_id=eq.${userData.household_id}`,
          },
          () => fetchDays()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'weekmenu',
            filter: `household_id=eq.${userData.household_id}`,
          },
          () => fetchDays()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    let cleanup: (() => void) | undefined
    setupRealtime().then((fn) => {
      cleanup = fn
    })
    return () => {
      cleanup?.()
    }
  }, [fetchDays])

  const patchDay = useCallback(
    async (
      day_of_week: number,
      payload: {
        menu_text?: string | null
        link_url?: string | null
        link_title?: string | null
      }
    ) => {
      setPatching(day_of_week)
      try {
        const res = await fetch('/api/weekmenu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_of_week, ...payload }),
        })
        if (res.ok) {
          const updated = await res.json()
          setDays((prev) =>
            prev.map((d) =>
              d.day_of_week === day_of_week
                ? {
                    ...d,
                    menu_text: updated.menu_text ?? d.menu_text,
                    link_url: updated.link_url ?? d.link_url,
                    link_title: updated.link_title ?? d.link_title,
                  }
                : d
            )
          )
          if (payload.menu_text !== undefined) {
            setLocalText((prev) => ({ ...prev, [day_of_week]: payload.menu_text ?? '' }))
          }
        }
      } finally {
        setPatching(null)
      }
    },
    []
  )

  const handleSubmit = useCallback(
    (day_of_week: number) => {
      const text = (localText[day_of_week] ?? '').trim()
      haptic('light')
      patchDay(day_of_week, { menu_text: text || null })
      setEditingDay(null)
    },
    [localText, patchDay]
  )

  const handleClear = useCallback(
    (day_of_week: number) => {
      haptic('light')
      setLocalText((prev) => ({ ...prev, [day_of_week]: '' }))
      patchDay(day_of_week, { menu_text: null })
    },
    [patchDay]
  )

  const openUrlDropdown = useCallback((day_of_week: number) => {
    const row = days.find((d) => d.day_of_week === day_of_week)
    setUrlInput(row?.link_url ?? '')
    setUrlDropdownDay(day_of_week)
    if (!row?.link_url) {
      setTimeout(() => urlInputRef.current?.focus(), 50)
    }
  }, [days])

  const saveUrl = useCallback(
    async (day_of_week: number) => {
      const value = urlInput.trim() || null
      haptic('light')
      let link_title: string | null = null
      if (value) {
        try {
          const titleRes = await fetch(
            `/api/weekmenu/fetch-title?url=${encodeURIComponent(value)}`
          )
          if (titleRes.ok) {
            const { title } = await titleRes.json()
            link_title = title || null
          }
        } catch {
          // keep link_title null
        }
      }
      await patchDay(day_of_week, { link_url: value, link_title })
      setUrlDropdownDay(null)
      setUrlInput('')
    },
    [urlInput, patchDay]
  )

  const removeUrl = useCallback(
    (day_of_week: number) => {
      haptic('light')
      patchDay(day_of_week, { link_url: null, link_title: null })
      setUrlInput('')
      // keep dropdown open; show empty URL input (hasLink becomes false)
    },
    [patchDay]
  )

  const goToLink = useCallback((url: string) => {
    haptic('light')
    try {
      new URL(url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // invalid url, ignore
    }
  }, [])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="border-b border-gray-200 px-4 py-3 last:border-b-0 flex items-center gap-2"
            >
              <span className="w-8 shrink-0 text-sm font-medium text-gray-400">{label}</span>
              <div className="h-6 flex-1 max-w-[200px] rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  const orderedDays = [...days].sort((a, b) => a.day_of_week - b.day_of_week)
  if (orderedDays.length === 0) {
    return (
      <main className="flex-1 px-4 py-8">
        <p className="text-gray-600">Geen weekmenu beschikbaar.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="rounded-lg border border-gray-200 bg-white overflow-visible">
        {orderedDays.map((day) => {
          const label = DAY_LABELS[day.day_of_week] ?? `Dag ${day.day_of_week}`
          const text = localText[day.day_of_week] ?? day.menu_text ?? ''
          const savedText = (day.menu_text ?? '').trim()
          const isEditing = editingDay === day.day_of_week
          const showViewMode = savedText.length > 0 && !isEditing
          const showEmptyViewMode = savedText.length === 0 && !isEditing
          const hasLink = Boolean(day.link_url?.trim())
          const isUrlOpen = urlDropdownDay === day.day_of_week
          const isPatching = patching === day.day_of_week

          return (
            <div
              key={day.day_of_week}
              className="border-b border-gray-200 px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span className="w-8 shrink-0 pt-[10px] text-sm font-medium text-gray-600">
                  {label}
                </span>
                {showViewMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light')
                      setEditingDay(day.day_of_week)
                      setLocalText((prev) => ({ ...prev, [day.day_of_week]: savedText }))
                    }}
                    className="flex min-h-[2.5rem] min-w-0 flex-1 items-center py-2 text-left font-semibold text-gray-900"
                  >
                    {savedText}
                  </button>
                ) : showEmptyViewMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light')
                      setEditingDay(day.day_of_week)
                      setLocalText((prev) => ({ ...prev, [day.day_of_week]: '' }))
                    }}
                    className="flex min-h-[2.5rem] min-w-0 flex-1 items-center py-2 text-left"
                    aria-label="Gerecht toevoegen"
                  />
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2">
                      <WeekmenuGerechtTextarea
                        value={text}
                        onChange={(v) =>
                          setLocalText((prev) => ({ ...prev, [day.day_of_week]: v }))
                        }
                        onSubmit={() => handleSubmit(day.day_of_week)}
                        onCancel={() => {
                          setEditingDay(null)
                          setLocalText((prev) => ({
                            ...prev,
                            [day.day_of_week]: day.menu_text ?? '',
                          }))
                        }}
                        placeholder="Gerecht"
                        disabled={isPatching}
                        autoFocus={isEditing}
                      />
                      {text.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClear(day.day_of_week)}
                          disabled={isPatching}
                          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                          aria-label="Veld wissen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSubmit(day.day_of_week)}
                        disabled={isPatching}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        aria-label="Opslaan"
                      >
                        <CornerDownLeft className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                    <div
                      ref={isUrlOpen ? urlDropdownWrapperRef : undefined}
                      className="relative shrink-0 self-center"
                    >
                      <button
                        type="button"
                        onClick={() => openUrlDropdown(day.day_of_week)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          hasLink
                            ? 'bg-gray-100 text-blue-600 hover:bg-blue-50'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                        aria-label={hasLink ? 'URL beheren' : 'URL toevoegen'}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                  {isUrlOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                      {hasLink ? (
                        <>
                          <div className="mb-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 break-all">
                            {day.link_url}
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeUrl(day.day_of_week)}
                              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                            >
                              URL wissen
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            ref={urlInputRef}
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveUrl(day.day_of_week)
                              }
                              if (e.key === 'Escape') {
                                setUrlDropdownDay(null)
                                setUrlInput('')
                              }
                            }}
                            placeholder="https://..."
                            className="mb-2 w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setUrlDropdownDay(null)
                                setUrlInput('')
                              }}
                              className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                            >
                              Annuleren
                            </button>
                            <button
                              type="button"
                              onClick={() => saveUrl(day.day_of_week)}
                              className="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
                            >
                              Opslaan
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                    </div>
                  </div>
                )}
              </div>
              {hasLink && (
                <div className="mt-1.5 pl-10">
                  <button
                    type="button"
                    onClick={() => goToLink(day.link_url!)}
                    className="flex w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-left hover:bg-blue-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                      {linkDisplayText(day)}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
