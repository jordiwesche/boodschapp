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

  useEffect(() => {
    // Only animate if pathname actually changed (not on initial mount)
    if (prevPathnameRef.current !== pathname && containerRef.current && prevPathnameRef.current !== '') {
      // Fade transition between routes using CSS transitions
      containerRef.current.style.transition = 'opacity 0.1s ease-in'
      containerRef.current.style.opacity = '0'
      
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'opacity 0.2s ease-out'
          containerRef.current.style.opacity = '1'
        }
      }, 100)
    }
    
    prevPathnameRef.current = pathname
  }, [pathname])

  return (
    <div ref={containerRef} style={{ opacity: 1 }}>
      {children}
    </div>
  )
}
