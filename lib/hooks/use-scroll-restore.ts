'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hook to save and restore scroll position when navigating between pages
 * Uses sessionStorage to persist scroll position per route
 */
export function useScrollRestore(containerRef: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname()
  const scrollKey = `scroll-${pathname}`

  // Save scroll position when user scrolls (for potential future use)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
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

  // Start at top on mount (prevents mobile opening scrolled)
  useEffect(() => {
    const scrollToTop = () => {
      const container = containerRef.current
      if (container) container.scrollTop = 0
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop)
    })
  }, [containerRef, pathname])

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
