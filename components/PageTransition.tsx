'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to top when pathname changes (fixes mobile opening scrolled)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual'
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [pathname])

  useEffect(() => {
    // Only animate if pathname actually changed (not on initial mount)
    if (prevPathnameRef.current !== pathname && containerRef.current && prevPathnameRef.current !== '') {
      // Use a very subtle fade-in only (no fade-out to prevent flashing)
      // This creates a smooth transition without the black background flash
      containerRef.current.style.opacity = '0.7'
      containerRef.current.style.transition = 'opacity 0.2s ease-out'
      
      // Use requestAnimationFrame to ensure the new content is rendered before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.style.opacity = '1'
          }
        })
      })
    } else {
      // Ensure opacity is 1 on initial mount
      if (containerRef.current) {
        containerRef.current.style.opacity = '1'
      }
    }
    
    prevPathnameRef.current = pathname
  }, [pathname])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        opacity: 1,
        minHeight: '100vh',
        background: 'var(--background, #ffffff)',
      }}
    >
      {children}
    </div>
  )
}
