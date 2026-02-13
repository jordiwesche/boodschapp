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
  const [fadeOut, setFadeOut] = useState(false)
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
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
        try {
          await onRefresh()
        } finally {
          setFadeOut(true)
          setTimeout(() => {
            setIsRefreshing(false)
            setFadeOut(false)
          }, 200)
        }
      } else {
        setFadeOut(true)
        setPullDistance(0)
        pullDistanceRef.current = 0
        wasAtTopRef.current = false
        setTimeout(() => setFadeOut(false), 200)
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

  const showIndicator = pullDistance > 8 || isRefreshing || fadeOut
  const opacity = isRefreshing ? 1 : fadeOut ? 0 : Math.min(pullDistance / THRESHOLD, 1)

  return (
    <>
      {showIndicator && (
        <div
          className="flex h-12 flex-shrink-0 items-center justify-center text-sm text-white"
          style={{
            opacity,
            transition: 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isRefreshing ? 'Vernieuwen...' : pullDistance >= THRESHOLD ? 'Los om te vernieuwen' : 'Trek om te vernieuwen'}
        </div>
      )}
      {children}
    </>
  )
}
