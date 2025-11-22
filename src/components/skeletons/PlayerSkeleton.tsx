'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface PlayerSkeletonProps {
  count?: number
}

export default function PlayerSkeleton({ count = 6 }: PlayerSkeletonProps) {
  const { colorScheme } = useTheme()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl overflow-hidden animate-pulse"
          style={{
            backgroundColor: colorScheme.surface,
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: `${colorScheme.border}FF`,
          }}
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-start justify-between mb-3">
              {/* Avatar skeleton */}
              <div
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              {/* Action buttons skeleton */}
              <div className="flex items-center space-x-2">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: colorScheme.border + '40' }}
                />
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: colorScheme.border + '40' }}
                />
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: colorScheme.border + '40' }}
                />
              </div>
            </div>
          </div>
          <div className="px-3 sm:px-4 pb-4">
            {/* Name skeleton */}
            <div
              className="h-5 rounded w-3/4 mb-2"
              style={{ backgroundColor: colorScheme.border + '40' }}
            />
            {/* Position skeleton */}
            <div
              className="h-4 rounded w-1/2 mb-3"
              style={{ backgroundColor: colorScheme.border + '40' }}
            />
            {/* Details skeleton */}
            <div className="space-y-2">
              <div
                className="h-3 rounded w-2/3"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              <div
                className="h-3 rounded w-3/4"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              <div
                className="h-3 rounded w-1/2"
                style={{ backgroundColor: colorScheme.border + '40' }}
              />
              {/* Status skeleton */}
              <div className="flex items-center mt-3">
                <div
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: colorScheme.border + '40' }}
                />
                <div
                  className="h-3 rounded w-24"
                  style={{ backgroundColor: colorScheme.border + '40' }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

