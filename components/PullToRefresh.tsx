'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const threshold = 80 // Distance in pixels to trigger refresh

  useEffect(() => {
    if (disabled || !containerRef.current) return

    const container = containerRef.current
    let touchStartY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of scroll
      if (container.scrollTop !== 0) return
      
      touchStartY = e.touches[0].clientY
      startY.current = touchStartY
      currentY.current = touchStartY
      isDragging = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      currentY.current = e.touches[0].clientY
      const distance = currentY.current - touchStartY

      // Only allow pull down (positive distance)
      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault() // Prevent default scroll
        setIsPulling(true)
        setPullDistance(Math.min(distance, threshold * 1.5)) // Cap at 1.5x threshold
      }
    }

    const handleTouchEnd = async () => {
      if (!isDragging) return

      isDragging = false

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setIsPulling(false)
          setPullDistance(0)
        }
      } else {
        // Reset if not enough pull
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, onRefresh, pullDistance, isRefreshing])

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const shouldShowIndicator = isPulling || isRefreshing

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull to refresh indicator */}
      {shouldShowIndicator && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, threshold * 1.5)}px`,
            transform: `translateY(${Math.max(0, pullDistance - threshold * 1.5)}px)`,
            opacity: pullProgress,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          ) : (
            <div
              className="flex flex-col items-center gap-2"
              style={{ opacity: pullProgress }}
            >
              <div
                className="h-6 w-6 rounded-full border-2 border-blue-500"
                style={{
                  transform: `rotate(${pullProgress * 180}deg)`,
                  borderTopColor: 'transparent',
                }}
              />
              <span className="text-xs text-gray-600">
                {pullDistance >= threshold ? 'Los om te vernieuwen' : 'Trek om te vernieuwen'}
              </span>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
