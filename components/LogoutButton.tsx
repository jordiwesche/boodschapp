'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { clearSessionFromCache } from '@/lib/session-persistence'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await clearSessionFromCache()
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {loading ? 'Uitloggen...' : 'Uitloggen'}
    </button>
  )
}
