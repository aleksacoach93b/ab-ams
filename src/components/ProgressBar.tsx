'use client'

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface ProgressBarProps {
  progress: number // 0-100
  label?: string
  showPercentage?: boolean
  className?: string
}

export default function ProgressBar({ 
  progress, 
  label, 
  showPercentage = true,
  className = '' 
}: ProgressBarProps) {
  const { colorScheme } = useTheme()

  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: colorScheme.text }}>
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{
          backgroundColor: `${colorScheme.border}40`
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: colorScheme.primary,
            boxShadow: `0 0 8px ${colorScheme.primary}60`
          }}
        />
      </div>
    </div>
  )
}

