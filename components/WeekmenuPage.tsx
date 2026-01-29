'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link as LinkIcon, CornerDownLeft, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/haptics'

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const

interface WeekmenuDayRow {
  day_of_week: number
  menu_text: string | null
  link_url: string | null
}

export default function WeekmenuPage() {
  const [days, setDays] = useState<WeekmenuDayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [localText, setLocalText] = useState<Record<number, string>>({})
  const [urlDropdownDay, setUrlDropdownDay] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [patching, setPatching] = useState<number | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  const fetchDays = useCallback(async () => {
    const res = await fetch('/api/weekmenu')
    if (!res.ok) return
    const data = await res.json()
    const list = (data.days ?? []) as WeekmenuDayRow[]
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

  // Realtime: refetch when weekmenu changes for this household
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
    async (day_of_week: number, payload: { menu_text?: string | null; link_url?: string | null }) => {
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
    setTimeout(() => urlInputRef.current?.focus(), 50)
  }, [days])

  const saveUrl = useCallback(
    (day_of_week: number) => {
      const value = urlInput.trim() || null
      haptic('light')
      patchDay(day_of_week, { link_url: value }).then(() => {
        setUrlDropdownDay(null)
        setUrlInput('')
      })
    },
    [urlInput, patchDay]
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
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
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
        <div className="rounded-lg bg-white border border-gray-100 overflow-hidden">
          {orderedDays.map((day) => {
            const label = DAY_LABELS[day.day_of_week] ?? `Dag ${day.day_of_week}`
            const text = localText[day.day_of_week] ?? day.menu_text ?? ''
            const hasText = text.trim().length > 0
            const hasLink = Boolean(day.link_url?.trim())
            const isUrlOpen = urlDropdownDay === day.day_of_week
            const isPatching = patching === day.day_of_week

            return (
              <div
                key={day.day_of_week}
                className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <span className="w-8 shrink-0 text-sm font-medium text-gray-600">
                  {label}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) =>
                      setLocalText((prev) => ({ ...prev, [day.day_of_week]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit(day.day_of_week)
                      }
                    }}
                    placeholder="Menu of gerecht"
                    className="min-w-0 flex-1 border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    style={{ fontSize: 16 }}
                    disabled={isPatching}
                  />
                  {hasText && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSubmit(day.day_of_week)}
                        disabled={isPatching}
                        className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        aria-label="Opslaan"
                      >
                        <CornerDownLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClear(day.day_of_week)}
                        disabled={isPatching}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                        aria-label="Veld wissen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="relative shrink-0">
                  {hasLink ? (
                    <button
                      type="button"
                      onClick={() => goToLink(day.link_url!)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-blue-600 hover:bg-blue-50"
                      aria-label="Link openen"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openUrlDropdown(day.day_of_week)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      aria-label="URL toevoegen"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                  )}
                  {isUrlOpen && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
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
                        className="mb-2 w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {hasLink && (
                          <button
                            type="button"
                            onClick={() => {
                              patchDay(day.day_of_week, { link_url: null })
                              setUrlDropdownDay(null)
                              setUrlInput('')
                            }}
                            className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Link verwijderen
                          </button>
                        )}
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
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
    </main>
  )
}
