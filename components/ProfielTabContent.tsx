'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import LogoutButton from './LogoutButton'

type ProfileCache = {
  user: { first_name: string } | null
  householdName: string
}

let profileCache: ProfileCache | null = null

function formatBuildTime(iso: string | undefined): string {
  if (!iso || iso === 'dev') return 'dev'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'dev'
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const buildDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })

    if (buildDate.getTime() === today.getTime()) return `vandaag ${time}`
    if (buildDate.getTime() === yesterday.getTime()) return `gisteren ${time}`

    const dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
    const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}, ${time}`
  } catch {
    return 'dev'
  }
}

export async function prefetchProfile(): Promise<void> {
  try {
    const [userRes, householdRes] = await Promise.all([
      fetch('/api/user/current'),
      fetch('/api/household/current'),
    ])
    const user = userRes.ok ? await userRes.json() : null
    const householdName = householdRes.ok
      ? (await householdRes.json()).name || 'Geen huishouden'
      : 'Geen huishouden'
    profileCache = { user, householdName }
  } catch {
    // ignore
  }
}

export default function ProfielTabContent() {
  const [user, setUser] = useState<{ first_name: string } | null>(() => profileCache?.user ?? null)
  const [householdName, setHouseholdName] = useState<string>(
    () => profileCache?.householdName ?? 'Laden...'
  )

  useEffect(() => {
    if (profileCache) {
      setUser(profileCache.user)
      setHouseholdName(profileCache.householdName)
    }

    let cancelled = false
    async function load() {
      try {
        const [userRes, householdRes] = await Promise.all([
          fetch('/api/user/current'),
          fetch('/api/household/current'),
        ])
        if (cancelled) return
        let userData: { first_name: string } | null = null
        let name = 'Geen huishouden'
        if (userRes.ok) {
          userData = await userRes.json()
          setUser(userData)
        }
        if (householdRes.ok) {
          const data = await householdRes.json()
          name = data.name || 'Geen huishouden'
        }
        setHouseholdName(name)
        profileCache = { user: userData ?? profileCache?.user ?? null, householdName: name }
      } catch {
        if (!cancelled) setHouseholdName('Geen huishouden')
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col pb-20">
      <div className="fixed inset-0 z-0 min-h-screen bg-[#2563eb]" aria-hidden />
      <div className="fixed inset-0 z-0 min-h-screen" style={{ background: 'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(249, 250, 251, 1) 28%)' }} aria-hidden />
      <header className="relative z-10 min-h-[240px] bg-gradient-to-b from-blue-600 via-blue-600 to-transparent pt-[env(safe-area-inset-top)]">
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-2 sm:px-6 sm:pt-8 sm:pb-4 lg:px-8">
          <h1 className="text-3xl font-bold text-white">Profiel</h1>
        </div>
      </header>

      <main data-pwa-main="default" className="-mt-[172px] sm:-mt-[156px] relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="space-y-4">
          <Link
            href="/profiel/naam"
            className="block rounded-[16px] border border-gray-200 bg-white p-6 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 shrink-0">Naam</h2>
              <div className="flex items-center gap-6 min-w-0 justify-end">
                <span className="text-sm text-gray-600 truncate text-right">{user?.first_name ?? '…'}</span>
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/profiel/huishouden"
            className="block rounded-[16px] border border-gray-200 bg-white p-6 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 shrink-0">Huishouden</h2>
              <div className="flex items-center gap-6 min-w-0 justify-end">
                <span className="text-sm text-gray-600 truncate text-right">{householdName}</span>
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <div className="pt-4 flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((reg) => reg.update())
                  }
                  window.location.reload()
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                App vernieuwen
              </button>
              <span className="text-xs text-gray-400" title={process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev'}>
                Laatste build: {formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME)}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  )
}
