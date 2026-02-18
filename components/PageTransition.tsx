'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

function PageTransitionEffects() {
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    containerRef.current = document.getElementById('page-transition-container') as HTMLDivElement | null
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual'
      window.scrollTo(0, 0)
    }
  }, [pathname])

  useEffect(() => {
    const el = containerRef.current
    if (prevPathnameRef.current !== pathname && el && prevPathnameRef.current !== '') {
      el.style.opacity = '0.7'
      el.style.transition = 'opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1)'

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) el.style.opacity = '1'
        })
      })
    } else if (el) {
      el.style.opacity = '1'
    }

    prevPathnameRef.current = pathname
  }, [pathname])

  return null
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="page-transition-container"
      style={{
        opacity: 1,
        minHeight: '100vh',
        background: 'transparent',
      }}
    >
      <PageTransitionEffects />
      {children}
    </div>
  )
}
