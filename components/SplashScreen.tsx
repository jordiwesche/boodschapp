'use client'

import { useState, useEffect } from 'react'

const SHOW_MS = 2500
const FADE_MS = 300

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), FADE_MS)
    }, SHOW_MS)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-300"
      style={{ opacity: fadeOut ? 0 : 1 }}
      aria-hidden="true"
    >
      <span className="text-2xl font-bold text-gray-900">Boodschapp</span>
    </div>
  )
}
