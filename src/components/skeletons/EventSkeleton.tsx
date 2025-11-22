'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface EventSkeletonProps {
  count?: number
}

export default function EventSkeleton({ count = 3 }: EventSkeletonProps) {
  const { colorScheme } = useTheme()

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-3 rounded-lg"
          style={{ backgroundColor: colorScheme.surface }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg"
              style={{ backgroundColor: colorScheme.border + '40' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-3 rounded w-3/4"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              <div
                className="h-2 rounded w-1/2"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

