'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

type ProfileCache = {
  user: { first_name: string } | null
  householdName: string
}

let profileCache: ProfileCache | null = null

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
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Profiel</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Link
            href="/profiel/naam"
            className="block rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Naam</h2>
                <p className="mt-1 text-sm text-gray-600">{user?.first_name ?? '…'}</p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/profiel/huishouden"
            className="block rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Huishouden</h2>
                <p className="mt-1 text-sm text-gray-600">{householdName}</p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/profiel/producten"
            className="block rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Producten & Categorieën</h2>
                <p className="mt-1 text-sm text-gray-600">Beheer je producten en categorieën</p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  )
}
