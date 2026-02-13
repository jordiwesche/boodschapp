'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import {
  calculatePurchaseFrequency,
  calculatePurchaseFrequencyStats,
  getLastPurchaseDate,
} from '@/lib/prediction'
import { PurchaseHistory } from '@/types/database'

interface Product {
  id: string
  emoji: string
  name: string
  description?: string | null
  category?: {
    id: string
    name: string
  } | null
}

interface ProductDetailPageProps {
  productId: string
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submenuRecordId, setSubmenuRecordId] = useState<string | null>(null)
  const [deleteModalRecordId, setDeleteModalRecordId] = useState<string | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY = useRef(0)

  const LONG_PRESS_MS = 600

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const startLongPress = (recordId: string, clientY?: number) => {
    clearLongPress()
    if (clientY != null) touchStartY.current = clientY
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      haptic('medium')
      setSubmenuRecordId(recordId)
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dy > 10) clearLongPress()
  }

  const handleDeleteRecordClick = (recordId: string) => {
    haptic('light')
    setSubmenuRecordId(null)
    setDeleteModalRecordId(recordId)
  }

  const handleDeleteRecordConfirm = async () => {
    const recordId = deleteModalRecordId
    if (!recordId) return
    setDeleteModalRecordId(null)
    setDeletingRecordId(recordId)
    try {
      const response = await fetch(`/api/purchase-history/${recordId}`, { method: 'DELETE' })
      if (response.ok) {
        setPurchaseHistory((prev) => prev.filter((p) => p.id !== recordId))
      } else {
        const err = await response.json().catch(() => ({}))
        setResetMessage({ type: 'error', text: err.error || 'Kon record niet verwijderen' })
        setTimeout(() => setResetMessage(null), 5000)
      }
    } catch (err) {
      console.error('Delete purchase record error:', err)
      setResetMessage({ type: 'error', text: 'Er is een fout opgetreden' })
      setTimeout(() => setResetMessage(null), 5000)
    } finally {
      setDeletingRecordId(null)
    }
  }

  useEffect(() => {
    const closeSubmenu = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      const rows = document.querySelectorAll('[data-purchase-history-row]')
      const submenus = document.querySelectorAll('[data-purchase-submenu]')
      const isInside = [...rows, ...submenus].some((el) => el.contains(target))
      if (isInside) return
      setSubmenuRecordId(null)
    }
    if (submenuRecordId) {
      document.addEventListener('mousedown', closeSubmenu)
      document.addEventListener('touchstart', closeSubmenu, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', closeSubmenu)
      document.removeEventListener('touchstart', closeSubmenu)
    }
  }, [submenuRecordId])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  useEffect(() => {
    fetchProductData()
  }, [productId])

  const fetchProductData = async () => {
    setLoading(true)
    setError('')
    try {
      const [productResponse, historyResponse] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/products/${productId}/purchase-history`),
      ])

      if (!productResponse.ok) {
        setError('Product niet gevonden')
        setLoading(false)
        return
      }

      const productData = await productResponse.json()
      setProduct(productData.product)

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setPurchaseHistory(historyData.history || [])
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
      console.error('Error fetching product data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const response = await fetch(`/api/products/${productId}/purchase-history`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPurchaseHistory([])
        setShowResetConfirmModal(false)
        setResetMessage({ type: 'success', text: 'Koophistorie is gereset. De frequentie wordt vanaf nu opnieuw berekend.' })
        setTimeout(() => setResetMessage(null), 5000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error resetting purchase history:', errorData)
        setShowResetConfirmModal(false)
        setResetMessage({ type: 'error', text: 'Er is een fout opgetreden bij het resetten van de koophistorie.' })
        setTimeout(() => setResetMessage(null), 5000)
      }
    } catch (err) {
      console.error('Error resetting purchase history:', err)
      setShowResetConfirmModal(false)
      setResetMessage({ type: 'error', text: 'Er is een fout opgetreden bij het resetten van de koophistorie.' })
      setTimeout(() => setResetMessage(null), 5000)
    } finally {
      setResetting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
    const months = [
      'jan',
      'feb',
      'mrt',
      'apr',
      'mei',
      'jun',
      'jul',
      'aug',
      'sep',
      'okt',
      'nov',
      'dec',
    ]

    const day = days[date.getDay()]
    const dayNum = date.getDate()
    const month = months[date.getMonth()]
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${day} ${dayNum} ${month} ${hours}:${minutes}`
  }

  const formatFrequency = (frequencyDays: number): string => {
    const totalHours = frequencyDays * 24
    const totalMinutes = totalHours * 60

    // Less than 1 hour: show in minutes
    if (totalHours < 1) {
      const minutes = Math.round(totalMinutes)
      return `Elke ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`
    }
    // Less than 24 hours: show in hours
    else if (frequencyDays < 1) {
      const hours = Math.round(totalHours)
      return `Elke ${hours} ${hours === 1 ? 'uur' : 'uur'}`
    }
    // 1-6 days: show in days
    else if (frequencyDays < 7) {
      const days = Math.round(frequencyDays)
      return `Elke ${days} ${days === 1 ? 'dag' : 'dagen'}`
    }
    // 1-4 weeks: show in weeks
    else if (frequencyDays < 30) {
      const weeks = Math.round(frequencyDays / 7)
      return `Elke ${weeks} ${weeks === 1 ? 'week' : 'weken'}`
    }
    // 1-11 months: show in months
    else if (frequencyDays < 365) {
      const months = Math.round(frequencyDays / 30)
      return `Elke ${months} ${months === 1 ? 'maand' : 'maanden'}`
    }
    // 1+ years: show in years
    else {
      const years = Math.round(frequencyDays / 365)
      return `Elke ${years} ${years === 1 ? 'jaar' : 'jaren'}`
    }
  }

  const frequency = calculatePurchaseFrequency(purchaseHistory)
  const frequencyStats = calculatePurchaseFrequencyStats(purchaseHistory)
  const totalPurchases = purchaseHistory.length

  const formatDaysLabel = (days: number) => {
    const rounded = Math.round(days * 10) / 10
    return `Elke ${rounded} ${rounded === 1 ? 'dag' : 'dagen'}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 pb-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 pb-20">
        <div className="text-center">
          <p className="text-gray-500">{error || 'Product niet gevonden'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Terug
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="relative min-h-[264px] bg-gradient-to-b from-blue-600 via-blue-600 to-transparent">
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-6 sm:px-6 sm:pt-12 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-white/90 hover:text-white"
              aria-label="Terug"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{product.emoji}</span>
              <div>
                <h1 className="text-3xl font-bold text-white">{product.name}</h1>
                {product.category && (
                  <p className="mt-1 text-sm text-white/90">{product.category.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="-mt-40 relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        {/* Statistics */}
        <div className="mb-6 rounded-[16px] bg-white p-6 shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Gekocht</p>
              <p className="text-2xl font-bold text-gray-900">{totalPurchases}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gem. frequentie</p>
              <p className="text-2xl font-bold text-gray-900">
                {frequency ? formatFrequency(frequency) : 'Nog niet berekend'}
              </p>
              {frequencyStats.average !== null && frequencyStats.median !== null && (
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>{formatDaysLabel(frequencyStats.average)} (Gem)</p>
                  <p>{formatDaysLabel(frequencyStats.median)} (Med)</p>
                  <p>
                    {frequencyStats.mode !== null
                      ? `${formatDaysLabel(frequencyStats.mode)} (Mod)`
                      : '— (Mod)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Purchase History List */}
        <div className="rounded-[16px] bg-white shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Koophistorie</h2>
          </div>
          {purchaseHistory.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Nog geen koophistorie beschikbaar</p>
              <p className="text-sm text-gray-400 mt-2">
                Vink dit product af in de boodschappenlijst om de historie te starten
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {purchaseHistory
                .sort(
                  (a, b) =>
                    new Date(b.purchased_at).getTime() -
                    new Date(a.purchased_at).getTime()
                )
                .map((purchase) => (
                  <div
                    key={purchase.id}
                    data-purchase-history-row
                    className="relative px-6 py-4 select-none"
                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={() => startLongPress(purchase.id)}
                    onMouseUp={clearLongPress}
                    onMouseLeave={clearLongPress}
                    onTouchStart={(e) => startLongPress(purchase.id, e.touches[0].clientY)}
                    onTouchEnd={clearLongPress}
                    onTouchMove={handleTouchMove}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(purchase.purchased_at)}
                    </p>
                    {submenuRecordId === purchase.id && (
                      <div
                        data-purchase-submenu
                        className="absolute right-6 top-1/2 z-10 min-w-0 -translate-y-1/2 select-none animate-slide-down"
                        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteRecordClick(purchase.id)}
                          className="flex items-center gap-2 whitespace-nowrap text-left text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                          aria-label="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          Verwijder
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {resetMessage && (
          <div
            className={`mt-4 rounded-[16px] px-4 py-3 text-sm ${
              resetMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {resetMessage.text}
          </div>
        )}

        {/* Reset koophistorie – midden onderaan */}
        {totalPurchases > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowResetConfirmModal(true)}
              disabled={resetting}
              className="flex items-center gap-2 rounded-[16px] bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{resetting ? 'Resetten...' : 'Reset koophistorie'}</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal: bevestiging reset koophistorie */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => setShowResetConfirmModal(false)} />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">
              Weet je zeker dat je de koophistorie wilt resetten? De frequentie wordt vanaf nu opnieuw berekend.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => handleReset()}
                disabled={resetting}
                className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {resetting ? 'Resetten...' : 'Resetten'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: bevestiging record verwijderen */}
      {deleteModalRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setDeleteModalRecordId(null)}
          />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">Weet je zeker dat je dit record wilt verwijderen?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalRecordId(null)}
                className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleDeleteRecordConfirm}
                disabled={!!deletingRecordId}
                className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {deletingRecordId ? 'Verwijderen...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
