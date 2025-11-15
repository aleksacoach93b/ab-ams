'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import RPEAnalysis from '@/components/RPEAnalysis'

export default function RPEAnalysisPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { colorScheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'COACH'))) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading || !isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'COACH')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: colorScheme.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colorScheme.text }}>
            RPE Analysis
          </h1>
          <p className="text-sm sm:text-base" style={{ color: colorScheme.textSecondary }}>
            View session RPE (Rate of Perceived Exertion) data from players
          </p>
        </div>

        {/* RPE Analysis Component */}
        <RPEAnalysis />
      </div>
    </div>
  )
}

