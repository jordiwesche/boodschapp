'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link as LinkIcon, X, ExternalLink, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/haptics'
import { formatWeekRange } from '@/lib/format-day-label'
import PageLayout from './PageLayout'

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const

/** Huidige dag (0=Ma, 6=Zo) */
function getTodayDayOfWeek(): number {
  return (new Date().getDay() + 6) % 7
}

/** Maandag van de huidige week (YYYY-MM-DD) */
function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff)
  return monday.toISOString().slice(0, 10)
}

/** week_start + N weken */
function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().slice(0, 10)
}

/** Is weekStart de huidige week? */
function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getCurrentWeekStart()
}

interface WeekmenuDayRow {
  day_of_week: number
  menu_text: string | null
  link_url: string | null
  link_title: string | null
}

/** Cache: laatste week + data voor direct tonen bij heropenen */
let weekmenuCache: { week_start: string; days: WeekmenuDayRow[] } | null = null

/** Prefetch weekmenu (bv. bij app-load) zodat de pagina direct data heeft. */
export async function prefetchWeekmenu(): Promise<void> {
  try {
    const res = await fetch('/api/weekmenu')
    if (!res.ok) return
    const data = await res.json()
    const list = (data.days ?? []) as WeekmenuDayRow[]
    const weekStart = data.week_start ?? getCurrentWeekStart()
    if (list.length) weekmenuCache = { week_start: weekStart, days: list }
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
  blurIgnoreRef,
  blurIgnoreTouchedRef,
  blurIgnoreClearTouchedRef,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  placeholder: string
  disabled: boolean
  autoFocus: boolean
  blurIgnoreRef?: React.RefObject<HTMLElement | null>
  /** Op mobile is relatedTarget vaak null; parent zet dit op pointerdown van URL-knop */
  blurIgnoreTouchedRef?: React.MutableRefObject<boolean>
  /** Op mobile: pointerdown op kruisje (veld wissen) */
  blurIgnoreClearTouchedRef?: React.MutableRefObject<boolean>
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const LINE_HEIGHT_PX = 20
  const MIN_HEIGHT_PX = 24
  // Iets meer padding onderaan voor optische centrering (font baseline)
  const PADDING_TOP_PX = 1
  const PADDING_BOTTOM_PX = 3

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const target = e.relatedTarget as Node | null
      if (blurIgnoreRef?.current && target && blurIgnoreRef.current.contains(target)) {
        return
      }
      // Mobile: relatedTarget is vaak null; fallback op flag van pointerdown
      if (blurIgnoreTouchedRef?.current) {
        blurIgnoreTouchedRef.current = false
        return
      }
      if (blurIgnoreClearTouchedRef?.current) {
        blurIgnoreClearTouchedRef.current = false
        return
      }
      onSubmit()
    },
    [onSubmit, blurIgnoreRef, blurIgnoreTouchedRef, blurIgnoreClearTouchedRef]
  )

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
      onBlur={handleBlur}
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
      className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent !text-[16px] font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none box-border"
      style={{
        lineHeight: `${LINE_HEIGHT_PX}px`,
        minHeight: MIN_HEIGHT_PX,
        paddingTop: PADDING_TOP_PX,
        paddingBottom: PADDING_BOTTOM_PX,
      }}
      onInput={resize}
    />
  )
}

export default function WeekmenuPage({ isActive = true }: { isActive?: boolean }) {
  const [weekStart, setWeekStart] = useState<string>(() => getCurrentWeekStart())

  // Reset naar huidige week wanneer tab actief wordt
  useEffect(() => {
    if (isActive) {
      setWeekStart(getCurrentWeekStart())
    }
  }, [isActive])
  const [days, setDays] = useState<WeekmenuDayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [localText, setLocalText] = useState<Record<number, string>>({})
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [urlDropdownDay, setUrlDropdownDay] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [patching, setPatching] = useState<number | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const urlDropdownWrapperRef = useRef<HTMLDivElement | null>(null)
  const urlButtonTouchedRef = useRef(false)
  const clearButtonTouchedRef = useRef(false)
  const gerechtRowRef = useRef<HTMLDivElement | null>(null)
  const weekStartRef = useRef(weekStart)
  weekStartRef.current = weekStart

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

  const fetchDays = useCallback(async (ws: string) => {
    const res = await fetch(`/api/weekmenu?week_start=${encodeURIComponent(ws)}`)
    if (!res.ok) return
    const data = await res.json()
    const list = (data.days ?? []) as WeekmenuDayRow[]
    const resolvedWeek = data.week_start ?? ws
    weekmenuCache = { week_start: resolvedWeek, days: list }
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
    const cached = weekmenuCache
    if (cached && cached.week_start === weekStart && cached.days.length) {
      setDays(cached.days)
      setLocalText((prev) => {
        const next = { ...prev }
        cached.days.forEach((d) => {
          next[d.day_of_week] = d.menu_text ?? ''
        })
        return next
      })
      setLoading(false)
    }
    let cancelled = false
    const run = async () => {
      await fetchDays(weekStart)
      if (!cancelled) setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [weekStart, fetchDays])

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
          () => fetchDays(weekStartRef.current)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'weekmenu',
            filter: `household_id=eq.${userData.household_id}`,
          },
          () => fetchDays(weekStartRef.current)
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
          body: JSON.stringify({ week_start: weekStart, day_of_week, ...payload }),
        })
        if (res.ok) {
          const updated = await res.json()
          setDays((prev) =>
            prev.map((d) =>
              d.day_of_week === day_of_week
                ? {
                    ...d,
                    menu_text: updated.menu_text !== undefined ? updated.menu_text : d.menu_text,
                    link_url: updated.link_url !== undefined ? updated.link_url : d.link_url,
                    link_title: updated.link_title !== undefined ? updated.link_title : d.link_title,
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
    [weekStart]
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

  const openUrlDropdown = useCallback((day_of_week: number) => {
    const row = days.find((d) => d.day_of_week === day_of_week)
    setUrlInput(row?.link_url ?? '')
    setUrlDropdownDay(day_of_week)
  }, [days])

  // Focus URL-invoerveld zodra dropdown met input zichtbaar is (belangrijk voor mobile: toetsenbord + cursor)
  // autoFocus op input + fallback voor browsers waar autoFocus niet werkt (bijv. iOS)
  useEffect(() => {
    if (urlDropdownDay === null) return
    const row = days.find((d) => d.day_of_week === urlDropdownDay)
    if (row?.link_url) return // heeft al link, geen input om te focussen
    const t = setTimeout(() => urlInputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [urlDropdownDay, days])

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

  const goPrevWeek = useCallback(() => {
    haptic('light')
    setWeekStart((ws) => addWeeks(ws, -1))
  }, [])

  const goNextWeek = useCallback(() => {
    haptic('light')
    setWeekStart((ws) => addWeeks(ws, 1))
  }, [])

  const goToCurrentWeek = useCallback(() => {
    haptic('light')
    setWeekStart(getCurrentWeekStart())
  }, [])

  const weekNavSubtitle = (
    <span className="text-sm text-white/80 pb-0">
      {formatWeekRange(weekStart)}
    </span>
  )

  const isOnCurrentWeek = isCurrentWeek(weekStart)
  const weekNavButtons = (
    <div className="flex items-center justify-center gap-4 mt-6">
      <button
        type="button"
        onClick={goPrevWeek}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Vorige week"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={goToCurrentWeek}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          isOnCurrentWeek
            ? 'bg-white text-gray-300'
            : 'bg-white text-blue-600 hover:bg-gray-100'
        }`}
        aria-label="Ga naar huidige week"
      >
        <CalendarDays className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={goNextWeek}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Volgende week"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )

  const todayDayOfWeek = getTodayDayOfWeek()
  const showTodayHighlight = isCurrentWeek(weekStart)

  if (loading) {
    return (
      <PageLayout title="Weekmenu" headerSubtitle={weekNavSubtitle} dataPwaMain="default">
        <div>
        <div className="rounded-[16px] border border-gray-200 bg-white overflow-hidden">
          {DAY_LABELS.map((label, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="mx-4 border-t border-gray-200" />}
              <div className="px-4 py-3 flex items-center gap-4">
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm ${
                  showTodayHighlight && i === todayDayOfWeek ? 'bg-blue-600 font-bold text-white' : 'bg-gray-100 font-medium text-gray-400'
                }`}
              >
                {label}
              </span>
              <div className="h-6 flex-1 max-w-[200px] rounded bg-gray-200/50 animate-pulse" />
              </div>
            </React.Fragment>
          ))}
        </div>
        {weekNavButtons}
        </div>
      </PageLayout>
    )
  }

  const orderedDays = [...days].sort((a, b) => a.day_of_week - b.day_of_week)
  if (orderedDays.length === 0) {
    return (
      <PageLayout title="Weekmenu" headerSubtitle={weekNavSubtitle} dataPwaMain="default">
        <div>
          <p className="text-gray-600">Geen weekmenu beschikbaar.</p>
          {weekNavButtons}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Weekmenu" headerSubtitle={weekNavSubtitle} dataPwaMain="default">
      <div>
      <div className="rounded-[16px] border border-gray-200 bg-white overflow-visible">
        {orderedDays.map((day, index) => {
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
            <React.Fragment key={day.day_of_week}>
              {index > 0 && (
                <div className="mx-4 border-t border-gray-200" />
              )}
              <div className="py-4 px-4">
              <div className="flex flex-wrap items-center gap-4">
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm leading-none ${
                  showTodayHighlight && day.day_of_week === todayDayOfWeek
                    ? 'bg-blue-600 font-bold text-white'
                    : 'bg-gray-100 font-medium text-gray-600'
                }`}
              >
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
                    className="flex min-h-8 min-w-0 flex-1 items-center text-left text-[16px] font-semibold text-gray-900 leading-none"
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
                    className="flex h-8 min-w-0 flex-1 items-center justify-start text-left"
                    aria-label="Gerecht toevoegen"
                  />
                ) : (
                  <div
                    ref={(el) => {
                      if (editingDay === day.day_of_week) gerechtRowRef.current = el
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <div className="flex min-h-8 min-w-0 flex-1 items-center gap-3 rounded-lg border border-gray-300 bg-white pl-3 pr-1 py-1">
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
                        blurIgnoreRef={editingDay === day.day_of_week ? gerechtRowRef : undefined}
                        blurIgnoreTouchedRef={editingDay === day.day_of_week ? urlButtonTouchedRef : undefined}
                        blurIgnoreClearTouchedRef={editingDay === day.day_of_week ? clearButtonTouchedRef : undefined}
                      />
                      {text.trim().length > 0 && (
                        <button
                          type="button"
                          onPointerDown={() => {
                            clearButtonTouchedRef.current = true
                          }}
                          onClick={() => {
                            haptic('light')
                            setLocalText((prev) => ({ ...prev, [day.day_of_week]: '' }))
                          }}
                          disabled={isPatching}
                          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                          aria-label="Veld wissen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div
                      ref={(el) => {
                        if (isUrlOpen) urlDropdownWrapperRef.current = el
                      }}
                      className="relative shrink-0 self-center"
                    >
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          urlButtonTouchedRef.current = true
                          e.preventDefault() // voorkom dat knop focus krijgt; input krijgt focus via autoFocus
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          openUrlDropdown(day.day_of_week)
                        }}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white transition-colors ${
                          hasLink
                            ? 'text-blue-600 hover:bg-gray-50 hover:border-gray-300'
                            : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600'
                        }`}
                        aria-label={hasLink ? 'URL beheren' : 'URL toevoegen'}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                  {isUrlOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-[16px] border border-gray-200 bg-white p-2 shadow-lg">
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
                            inputMode="url"
                            autoComplete="url"
                            autoFocus
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
                    className="flex w-full items-center gap-2 rounded-[16px] bg-blue-50 px-3 py-2 text-left hover:bg-blue-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-gray-900">
                      {linkDisplayText(day)}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  </button>
                </div>
              )}
              </div>
            </React.Fragment>
          )
        })}
      </div>
      {weekNavButtons}
      </div>
    </PageLayout>
  )
}
