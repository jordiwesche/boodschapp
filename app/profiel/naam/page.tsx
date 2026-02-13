'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function ProfielNaamPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    // Fetch current user name
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/current')
        if (response.ok) {
          const data = await response.json()
          setFirstName(data.first_name || '')
        }
      } catch (err) {
        console.error('Error fetching user:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/profiel')
        router.refresh()
      } else {
        setError(data.error || 'Kon naam niet updaten')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col pb-20">
      <div className="fixed inset-0 z-0 min-h-screen bg-[#2563eb]" aria-hidden />
      <div className="fixed inset-0 z-0 min-h-screen" style={{ background: 'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(249, 250, 251, 1) 28%)' }} aria-hidden />
      <header className="relative z-10 min-h-[240px] bg-gradient-to-b from-blue-600 via-blue-600 to-transparent pt-[env(safe-area-inset-top)]">
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-2 sm:px-6 sm:pt-8 sm:pb-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-white/90 hover:text-white"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-white">Naam wijzigen</h1>
          </div>
        </div>
      </header>

      <main className="-mt-[140px] sm:-mt-[124px] relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="rounded-[16px] bg-white p-8 shadow">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Voornaam
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Jan"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={loading || !firstName.trim()}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
