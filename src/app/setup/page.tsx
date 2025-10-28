'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function SetupPage() {
  const { colorScheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [credentials, setCredentials] = useState<any>(null)

  const handleSetup = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Authentication setup completed successfully!')
        setCredentials(data.credentials)
      } else {
        setMessage(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      setMessage('❌ An error occurred during setup')
      console.error('Setup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: colorScheme.background }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colorScheme.text }}>
            AB - Athlete Management System Setup
          </h1>
          <p className="text-lg" style={{ color: colorScheme.textSecondary }}>
            Initialize authentication system
          </p>
        </div>

        <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: colorScheme.surface }}>
          <button
            onClick={handleSetup}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: colorScheme.primary }}
          >
            {isLoading ? 'Setting up...' : 'Setup Authentication'}
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {credentials && (
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colorScheme.background }}>
              <h3 className="font-semibold mb-3" style={{ color: colorScheme.text }}>
                Test Credentials:
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>👑 Admin:</strong> {credentials.admin.email} / {credentials.admin.password}
                </div>
                <div>
                  <strong>🏃 Coach:</strong> {credentials.coach.email} / {credentials.coach.password}
                </div>
                <div>
                  <strong>⚽ Player:</strong> {credentials.player.email} / {credentials.player.password}
                </div>
                <div>
                  <strong>👨‍⚕️ Staff:</strong> {credentials.staff.email} / {credentials.staff.password}
                </div>
              </div>
              <div className="mt-4">
                <a 
                  href="/login"
                  className="inline-block px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colorScheme.primary }}
                >
                  Go to Login
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
