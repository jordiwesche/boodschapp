'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if user exists
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const checkData = await checkResponse.json()

      if (!checkResponse.ok) {
        setError(checkData.error || 'Er is een fout opgetreden')
        setLoading(false)
        return
      }

      if (!checkData.exists) {
        // User doesn't exist, redirect to onboarding
        router.push(`/onboarding?email=${encodeURIComponent(email)}`)
        return
      }

      // User exists, redirect directly to PIN page
      router.push(`/login/pin?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Boodschapp
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Log in met je emailadres
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Emailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="jouw@email.nl"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Bezig...' : 'Doorgaan'}
          </button>
        </form>
      </div>
    </div>
  )
}
