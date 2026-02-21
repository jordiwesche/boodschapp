'use client'

import { useEffect, useState } from 'react'

interface SnackbarProps {
  message: string
  visible: boolean
  onHide: () => void
  durationMs?: number
}

export default function Snackbar({
  message,
  visible,
  onHide,
  durationMs = 3000,
}: SnackbarProps) {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden')

  useEffect(() => {
    if (!visible) {
      setPhase('hidden')
      return
    }
    setPhase('entering')
    const enterId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'))
    })
    let exitTimer: ReturnType<typeof setTimeout>
    const hideTimer = setTimeout(() => {
      setPhase('exiting')
      exitTimer = setTimeout(onHide, 300)
    }, 300 + durationMs)
    return () => {
      cancelAnimationFrame(enterId)
      clearTimeout(hideTimer)
      clearTimeout(exitTimer!)
    }
  }, [visible, durationMs, onHide])

  if (phase === 'hidden') return null

  const translateY = phase === 'entering' ? '100%' : phase === 'exiting' ? '100%' : '0'

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[60] flex justify-center pointer-events-none"
      aria-live="polite"
    >
      <div
        className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        style={{
          transform: `translateY(${translateY})`,
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {message}
      </div>
    </div>
  )
}
