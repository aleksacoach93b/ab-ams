'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
  threshold?: number
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  threshold = 80 
}: PullToRefreshProps) {
  const { colorScheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return
      
      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current
      
      // Only prevent default if we're actually pulling down (not scrolling up)
      // And only if we're at the top of the container
      if (distance > 0 && container.scrollTop === 0 && distance < threshold * 2) {
        e.preventDefault()
        setPullDistance(Math.min(distance, threshold * 1.5))
      } else if (container.scrollTop > 0) {
        // If user is scrolling down, cancel pull-to-refresh
        setIsPulling(false)
        setPullDistance(0)
      } else {
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
          setIsPulling(false)
        }
      } else {
        setPullDistance(0)
        setIsPulling(false)
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
  }, [isPulling, pullDistance, threshold, onRefresh, isRefreshing, disabled])

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 0 || isRefreshing

  return (
    <div 
      ref={containerRef}
      className="pull-to-refresh-container relative w-full h-full"
      style={{
        transform: showIndicator ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'translateY(0)',
        transition: isRefreshing ? 'transform 0.3s ease' : 'none',
        overflowX: 'hidden',
        overscrollBehaviorX: 'none',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {showIndicator && (
        <div 
          className="pull-to-refresh-indicator active flex items-center justify-center"
          style={{
            top: '10px',
            color: colorScheme.primary
          }}
        >
          <div 
            className="pull-to-refresh-spinner"
            style={{
              transform: `rotate(${pullProgress * 360}deg)`,
              opacity: isRefreshing ? 1 : pullProgress
            }}
          />
        </div>
      )}
      {children}
    </div>
  )
}

