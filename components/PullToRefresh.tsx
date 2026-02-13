'use client'

import { useEffect, useRef, useState } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

const THRESHOLD = 56
const MAX_PULL = 80
const INDICATOR_HEIGHT = 48

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollContainerRef,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)
  const touchStartY = useRef<number>(0)
  const wasAtTopRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const isAtTop = (): boolean => {
    if ((window.scrollY || window.pageYOffset) > 0) return false
    if (scrollContainerRef?.current && scrollContainerRef.current.scrollTop > 0) return false
    return true
  }

  useEffect(() => {
    if (disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      const atTop = isAtTop()
      wasAtTopRef.current = atTop
      if (!atTop) return
      touchStartY.current = e.touches[0].clientY
      setIsReleasing(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!wasAtTopRef.current) return
      if (!isAtTop()) {
        wasAtTopRef.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      const distance = Math.min(Math.max(0, e.touches[0].clientY - touchStartY.current), MAX_PULL)

      if (distance > 10) e.preventDefault()

      if (distance > 0) {
        pullDistanceRef.current = distance
        setPullDistance(distance)
      } else {
        wasAtTopRef.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    }

    const handleTouchEnd = async () => {
      if (!wasAtTopRef.current) return
      if (!isAtTop()) {
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
        return
      }

      const dist = pullDistanceRef.current

      if (dist >= THRESHOLD && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(INDICATOR_HEIGHT)
        pullDistanceRef.current = INDICATOR_HEIGHT
        wasAtTopRef.current = false
        setIsReleasing(true)
        try {
          await onRefresh()
        } finally {
          setTimeout(() => {
            setIsReleasing(true)
            setPullDistance(0)
            pullDistanceRef.current = 0
            setIsRefreshing(false)
            setTimeout(() => setIsReleasing(false), 250)
          }, 150)
        }
      } else {
        setIsReleasing(true)
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
        setTimeout(() => setIsReleasing(false), 250)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, onRefresh, scrollContainerRef])

  const showIndicator = pullDistance > 4 || isRefreshing || isReleasing
  const opacity = isRefreshing ? 1 : Math.min(pullDistance / THRESHOLD, 1)
  const indicatorHeight = isReleasing
    ? (isRefreshing ? INDICATOR_HEIGHT : 0)
    : showIndicator
      ? Math.min(pullDistance, INDICATOR_HEIGHT)
      : 0

  return (
    <div className="flex flex-col overflow-hidden">
      <div
        className="flex flex-shrink-0 items-center justify-center text-sm text-white"
        style={{
          height: indicatorHeight,
          minHeight: indicatorHeight,
          opacity: showIndicator ? opacity : 0,
          transition: isReleasing
            ? 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none',
        }}
      >
        {showIndicator && (
          <>
            {isRefreshing ? 'Vernieuwen...' : pullDistance >= THRESHOLD ? 'Los om te vernieuwen' : 'Trek om te vernieuwen'}
          </>
        )}
      </div>
      {children}
    </div>
  )
}
