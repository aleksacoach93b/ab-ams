'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface ActivitySkeletonProps {
  count?: number
  compact?: boolean
}

export default function ActivitySkeleton({ count = 5, compact = false }: ActivitySkeletonProps) {
  const { colorScheme } = useTheme()

  return (
    <div className={compact ? "p-2" : "p-3 sm:p-4 rounded-lg border-2"} style={compact ? {} : { backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
      <div className="animate-pulse space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-start space-x-3">
            {/* Avatar skeleton */}
            <div
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: colorScheme.border + '40' }}
            />
            <div className="flex-1 space-y-2">
              {/* Activity text skeleton */}
              <div
                className="h-4 rounded w-full"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              <div
                className="h-3 rounded w-2/3"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              {/* Timestamp skeleton */}
              <div
                className="h-2 rounded w-1/4"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

