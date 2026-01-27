'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hook to save and restore scroll position when navigating between pages
 * Uses sessionStorage to persist scroll position per route
 */
export function useScrollRestore(containerRef: React.RefObject<HTMLElement>) {
  const pathname = usePathname()
  const scrollKey = `scroll-${pathname}`
  const isRestoringRef = useRef(false)

  // Save scroll position before navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      // Don't save while restoring
      if (isRestoringRef.current) return
      
      try {
        sessionStorage.setItem(scrollKey, container.scrollTop.toString())
      } catch (error) {
        // Ignore storage errors (private browsing, etc.)
        console.warn('Failed to save scroll position:', error)
      }
    }

    // Throttle scroll events
    let timeoutId: NodeJS.Timeout
    container.addEventListener('scroll', () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 100)
    }, { passive: true })

    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, scrollKey])

  // Restore scroll position on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      const savedScroll = sessionStorage.getItem(scrollKey)
      if (savedScroll) {
        isRestoringRef.current = true
        const scrollTop = parseInt(savedScroll, 10)
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTo({
              top: scrollTop,
              behavior: 'auto', // Instant scroll, not smooth
            })
            
            // Reset flag after a short delay
            setTimeout(() => {
              isRestoringRef.current = false
            }, 100)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to restore scroll position:', error)
    }
  }, [containerRef, scrollKey, pathname])

  // Clear scroll position (call this when data is refreshed)
  const clearScroll = () => {
    try {
      sessionStorage.removeItem(scrollKey)
    } catch (error) {
      console.warn('Failed to clear scroll position:', error)
    }
  }

  return { clearScroll }
}
