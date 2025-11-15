'use client'

import { useEffect } from 'react'

export default function AnalyticsScheduler() {
  useEffect(() => {
    // Start the daily analytics scheduler when the app loads
    const startScheduler = async () => {
      try {
        // Call API endpoint to start scheduler on server
        const response = await fetch('/api/analytics/scheduler', {
          method: 'POST',
          headers: {
          'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'start' })
        })
        
        if (response.ok) {
          console.log('Daily analytics scheduler started')
        } else {
          console.error('Failed to start analytics scheduler:', response.statusText)
        }
      } catch (error) {
        console.error('Failed to start analytics scheduler:', error)
      }
    }

    startScheduler()

    // Cleanup function to stop scheduler when component unmounts
    return () => {
      const stopScheduler = async () => {
        try {
          const response = await fetch('/api/analytics/scheduler', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'stop' })
          })
          
          if (response.ok) {
            console.log('Daily analytics scheduler stopped')
          } else {
            console.error('Failed to stop analytics scheduler:', response.statusText)
          }
        } catch (error) {
          console.error('Failed to stop analytics scheduler:', error)
        }
      }
      stopScheduler()
    }
  }, [])

  return null // This component doesn't render anything
}
