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

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollContainerRef,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef<number>(0)
  const wasAtTopRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

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
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null
            setPullDistance(pullDistanceRef.current)
          })
        }
      } else {
        wasAtTopRef.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    }

    const handleTouchEnd = async () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

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
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
        try {
          await onRefresh()
        } finally {
          setTimeout(() => setIsRefreshing(false), 150)
        }
      } else {
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [disabled, onRefresh, scrollContainerRef])

  const showIndicator = (pullDistance > 12 || isRefreshing)

  return (
    <>
      {showIndicator && (
        <div
          className="flex h-12 flex-shrink-0 items-center justify-center text-sm text-white transition-all duration-150 ease-out"
          style={{ opacity: Math.min(pullDistance / THRESHOLD, 1) }}
        >
          {isRefreshing ? 'Vernieuwen...' : pullDistance >= THRESHOLD ? 'Los om te vernieuwen' : 'Trek om te vernieuwen'}
        </div>
      )}
      {children}
    </>
  )
}
