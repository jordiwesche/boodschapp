'use client'

import { useState, useEffect } from 'react'

const SHOW_MS = 2500
const FADE_MS = 300
const SESSION_KEY = 'boodschapp_splash_shown'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const alreadyShown = sessionStorage.getItem(SESSION_KEY)
    if (alreadyShown) return

    setVisible(true)
    sessionStorage.setItem(SESSION_KEY, '1')

    const t = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), FADE_MS)
    }, SHOW_MS)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300"
      style={{
        opacity: fadeOut ? 0 : 1,
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, #155DFC 0%, #1248D4 100%)',
      }}
      aria-hidden="true"
    >
      <span className="-translate-y-10 text-5xl font-bold text-white">
        <span className="animate-boodsch-fade">Boodsch</span>app
      </span>
    </div>
  )
}
