'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function CalendarSkeleton() {
  const { colorScheme } = useTheme()

  return (
    <div className="animate-pulse space-y-4">
      {/* Calendar header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="h-6 rounded w-32"
          style={{ backgroundColor: colorScheme.border + '40' }}
        />
        <div className="flex space-x-2">
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: colorScheme.border + '40' }}
          />
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: colorScheme.border + '40' }}
          />
        </div>
      </div>
      {/* Days of week skeleton */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-8 rounded"
            style={{ backgroundColor: colorScheme.border + '40' }}
          />
        ))}
      </div>
      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded"
            style={{ backgroundColor: colorScheme.border + '40' }}
          />
        ))}
      </div>
    </div>
  )
}

