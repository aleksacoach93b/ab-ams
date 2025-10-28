'use client'

import { useEffect } from 'react'

export default function AnalyticsScheduler() {
  useEffect(() => {
    // Start the daily analytics scheduler when the app loads
    const startScheduler = async () => {
      try {
        // Import and start the scheduler
        const { dailyAnalyticsScheduler } = await import('@/lib/dailyAnalyticsScheduler')
        dailyAnalyticsScheduler.start()
        console.log('Daily analytics scheduler started')
      } catch (error) {
        console.error('Failed to start analytics scheduler:', error)
      }
    }

    startScheduler()

    // Cleanup function to stop scheduler when component unmounts
    return () => {
      const stopScheduler = async () => {
        try {
          const { dailyAnalyticsScheduler } = await import('@/lib/dailyAnalyticsScheduler')
          dailyAnalyticsScheduler.stop()
          console.log('Daily analytics scheduler stopped')
        } catch (error) {
          console.error('Failed to stop analytics scheduler:', error)
        }
      }
      stopScheduler()
    }
  }, [])

  return null // This component doesn't render anything
}
