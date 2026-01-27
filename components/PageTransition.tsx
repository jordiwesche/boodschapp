'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { animate } from 'motion'

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
      // Fade transition between routes
      animate(
        containerRef.current,
        { opacity: [1, 0] },
        { duration: 0.1, easing: 'ease-in' }
      ).then(() => {
        // Fade in
        animate(
          containerRef.current!,
          { opacity: [0, 1] },
          { duration: 0.2, easing: 'ease-out' }
        )
      })
    }
    
    prevPathnameRef.current = pathname
  }, [pathname])

  return (
    <div ref={containerRef} style={{ opacity: 1 }}>
      {children}
    </div>
  )
}
