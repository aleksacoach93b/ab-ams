'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface ReportsSkeletonProps {
  showFolders?: boolean
  showReports?: boolean
}

export default function ReportsSkeleton({ showFolders = true, showReports = true }: ReportsSkeletonProps) {
  const { colorScheme } = useTheme()

  return (
    <div className="space-y-4 animate-pulse">
      {showFolders && (
        <div className="space-y-2">
          <div className="h-4 rounded w-20" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border-2 p-3"
              style={{ backgroundColor: colorScheme.background, borderColor: `${colorScheme.border}E6` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded w-32" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                    <div className="h-3 rounded w-24" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                </div>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showReports && (
        <div className="space-y-2">
          <div className="h-4 rounded w-20" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border-2 p-3"
              style={{ backgroundColor: colorScheme.background, borderColor: `${colorScheme.border}E6` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded w-40" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                    <div className="h-3 rounded w-32" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 rounded w-16" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                <div className="h-3 rounded w-20" style={{ backgroundColor: colorScheme.border + '40' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

