'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function PinVerification() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
      setCheckingAuth(false)
    } else {
      // No email parameter, redirect to login
      router.push('/login')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!checkingAuth && pinInputRef.current) {
      // Multiple focus attempts with increasing delays for mobile compatibility
      const attemptFocus = (delay: number) => {
        setTimeout(() => {
          if (pinInputRef.current) {
            pinInputRef.current.focus()
            // Also try click() which sometimes works better on mobile
            pinInputRef.current.click()
          }
        }, delay)
      }

      // Immediate attempt
      requestAnimationFrame(() => {
        attemptFocus(0)
      })
      
      // Additional attempts for mobile browsers
      attemptFocus(100)
      attemptFocus(300)
      attemptFocus(600)
      attemptFocus(1000)
    }
  }, [checkingAuth])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || 'Ongeldige PIN')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificeren...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-[16px] bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Boodschapp
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Voer je 6-cijferige PIN in
          </p>
          {email && (
            <p className="mt-1 text-center text-xs text-gray-500">
              {email}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
              6-cijferige PIN
            </label>
            <input
              ref={pinInputRef}
              id="pin"
              name="pin"
              type="tel"
              inputMode="numeric"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onFocus={(e) => e.target.select()}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl tracking-widest text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="000000"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PinPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <PinVerification />
    </Suspense>
  )
}
