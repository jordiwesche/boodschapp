'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollContainerRef,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const threshold = 80 // Distance in pixels to trigger refresh

  // Helper to check if at top of scroll
  const isAtTop = (): boolean => {
    if (scrollContainerRef?.current) {
      return scrollContainerRef.current.scrollTop === 0
    }
    return window.scrollY === 0
  }

  useEffect(() => {
    if (disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if EXACTLY at top of scroll (no tolerance)
      if (!isAtTop()) {
        return
      }
      
      touchStartY.current = e.touches[0].clientY
      isDraggingRef.current = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return

      const currentY = e.touches[0].clientY
      const distance = currentY - touchStartY.current

      // Check if still at top - must be exactly 0
      if (!isAtTop()) {
        // Reset if scrolled away from top
        setIsPulling(false)
        setPullDistance(0)
        isDraggingRef.current = false
        return
      }

      // Only allow pull down (positive distance) when at top
      if (distance > 0) {
        // Only prevent default when pulling down significantly
        if (distance > 10) {
          e.preventDefault()
        }
        setIsPulling(true)
        setPullDistance(Math.min(distance, threshold * 1.5)) // Cap at 1.5x threshold
      } else if (distance <= 0) {
        // Reset if pulling up
        setIsPulling(false)
        setPullDistance(0)
        isDraggingRef.current = false
      }
    }

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current) return

      isDraggingRef.current = false

      // Double check we're still at top before refreshing
      if (!isAtTop()) {
        setIsPulling(false)
        setPullDistance(0)
        return
      }

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          // Keep refreshing state for a moment for visual feedback
          setTimeout(() => {
            setIsRefreshing(false)
            setIsPulling(false)
            setPullDistance(0)
          }, 200)
        }
      } else {
        // Reset if not enough pull
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    // Use capture phase to catch events early
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, onRefresh, pullDistance, isRefreshing, scrollContainerRef])

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const shouldShowIndicator = (isPulling && pullDistance > 20) || isRefreshing

  return (
    <>
      {/* Pull to refresh indicator */}
      {shouldShowIndicator && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white shadow-sm transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, threshold * 1.5)}px`,
            transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
            opacity: Math.min(pullProgress * 1.5, 1),
          }}
        >
          {isRefreshing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-xs font-medium text-gray-600">Vernieuwen...</span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-2"
              style={{ opacity: Math.min(pullProgress * 1.5, 1) }}
            >
              <div className="relative">
                <ArrowDown
                  className="h-6 w-6 text-blue-500 transition-transform duration-200"
                  style={{
                    transform: `rotate(${pullProgress >= 1 ? 180 : 0}deg) translateY(${pullProgress * 5}px)`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                {pullDistance >= threshold ? 'Los om te vernieuwen' : 'Trek om te vernieuwen'}
              </span>
            </div>
          )}
        </div>
      )}
      {children}
    </>
  )
}
