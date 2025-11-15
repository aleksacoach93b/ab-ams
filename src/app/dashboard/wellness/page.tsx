'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { RefreshCw, Download, Calendar, Users, CheckCircle, XCircle, Settings, Save } from 'lucide-react'

interface WellnessData {
  syncedCount: number
  totalRows: number
  date: string
}

interface WellnessSettings {
  csvUrl: string
  surveyId: string
  baseUrl: string
}

export default function WellnessPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { colorScheme } = useTheme()
  const router = useRouter()
  const [wellnessData, setWellnessData] = useState<WellnessData | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [wellnessSettings, setWellnessSettings] = useState<WellnessSettings>({
    csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
    surveyId: 'cmg6klyig0004l704u1kd78zb',
    baseUrl: 'https://wellness-monitor-tan.vercel.app'
  })
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [tempSettings, setTempSettings] = useState<WellnessSettings>(wellnessSettings)

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'COACH'))) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'COACH') {
      fetchWellnessSettings()
    }
  }, [user])

  const fetchWellnessSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/wellness/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWellnessSettings(data.wellnessSettings)
        setTempSettings(data.wellnessSettings)
      }
    } catch (error) {
      console.error('Error fetching wellness settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No authentication token found')
        return
      }

      const response = await fetch('/api/wellness/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wellnessSettings: tempSettings })
      })

      if (response.ok) {
        const data = await response.json()
        setWellnessSettings(data.wellnessSettings)
        setIsEditingSettings(false)
        alert('Wellness settings saved successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to save settings: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving wellness settings:', error)
      alert('Error saving wellness settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleCancelEdit = () => {
    setTempSettings(wellnessSettings)
    setIsEditingSettings(false)
  }

  const syncWellnessData = async () => {
    setIsSyncing(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No authentication token found')
        return
      }

      const response = await fetch('/api/wellness/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWellnessData(data)
        setLastSyncTime(new Date().toLocaleString('en-US'))
        alert(`Wellness data synced successfully! ${data.syncedCount} players updated.`)
      } else {
        const error = await response.json()
        alert(`Failed to sync wellness data: ${error.message}`)
      }
    } catch (error) {
      console.error('Error syncing wellness data:', error)
      alert('Error syncing wellness data')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading || !isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'COACH')) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center" 
        style={{ 
          backgroundColor: colorScheme.background,
          background: colorScheme.background,
          minHeight: '100vh',
          width: '100%',
          margin: 0,
          padding: 0
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen p-8" 
      style={{ 
        backgroundColor: colorScheme.background,
        background: colorScheme.background,
        color: colorScheme.text,
        minHeight: '100vh',
        width: '100%',
        margin: 0
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colorScheme.text }}>
            Wellness Survey Management
          </h1>
          <p className="text-lg" style={{ color: colorScheme.textSecondary }}>
            Sync and manage daily wellness survey data from external CSV source
          </p>
        </div>

        {/* CSV Source Info */}
        <div 
          className="mb-8 p-6 rounded-2xl border"
          style={{ 
            backgroundColor: colorScheme.cardBackground, 
            borderColor: colorScheme.border 
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center" style={{ color: colorScheme.text }}>
              <Download className="h-6 w-6 mr-2" style={{ color: colorScheme.primary }} />
              CSV Data Source
            </h2>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  if (isEditingSettings) {
                    handleCancelEdit()
                  } else {
                    setIsEditingSettings(true)
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center space-x-2"
                style={{ 
                  backgroundColor: isEditingSettings ? colorScheme.border : colorScheme.primary,
                  color: 'white'
                }}
              >
                <Settings className="h-4 w-4" />
                <span>{isEditingSettings ? 'Cancel' : 'Edit Settings'}</span>
              </button>
            )}
          </div>

          {isEditingSettings && user?.role === 'ADMIN' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                  CSV Export URL
                </label>
                <input
                  type="text"
                  value={tempSettings.csvUrl}
                  onChange={(e) => setTempSettings({ ...tempSettings, csvUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                  placeholder="https://wellness-monitor-tan.vercel.app/api/surveys/[surveyId]/export/csv"
                />
                <p className="text-xs mt-1" style={{ color: colorScheme.textSecondary }}>
                  Full URL to the CSV export endpoint
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                  Survey ID
                </label>
                <input
                  type="text"
                  value={tempSettings.surveyId}
                  onChange={(e) => setTempSettings({ ...tempSettings, surveyId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                  placeholder="cmg6klyig0004l704u1kd78zb"
                />
                <p className="text-xs mt-1" style={{ color: colorScheme.textSecondary }}>
                  Survey ID used for kiosk links
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={tempSettings.baseUrl}
                  onChange={(e) => setTempSettings({ ...tempSettings, baseUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                  placeholder="https://wellness-monitor-tan.vercel.app"
                />
                <p className="text-xs mt-1" style={{ color: colorScheme.textSecondary }}>
                  Base URL of the wellness app (without trailing slash)
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                  style={{ 
                    backgroundColor: colorScheme.primary,
                    color: 'white'
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                <strong>Source URL:</strong> 
                <a 
                  href={wellnessSettings.csvUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 underline break-all"
                  style={{ 
                    color: colorScheme.primary,
                    backgroundColor: 'transparent'
                  }}
                >
                  {wellnessSettings.csvUrl}
                </a>
              </p>
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                <strong>Survey ID:</strong> {wellnessSettings.surveyId}
              </p>
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                <strong>Base URL:</strong> {wellnessSettings.baseUrl}
              </p>
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                <strong>Data Format:</strong> CSV with player names, submission dates, and survey responses
              </p>
            </div>
          )}
        </div>

        {/* Sync Controls */}
        <div 
          className="mb-8 p-6 rounded-2xl border"
          style={{ 
            backgroundColor: colorScheme.cardBackground, 
            borderColor: colorScheme.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: colorScheme.text }}>
            <RefreshCw className="h-6 w-6 mr-2" style={{ color: colorScheme.primary }} />
            Data Synchronization
          </h2>
          
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={syncWellnessData}
              disabled={isSyncing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Wellness Data'}</span>
            </button>
            
            {lastSyncTime && (
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                Last sync: {lastSyncTime}
              </p>
            )}
          </div>

          <div className="text-sm" style={{ color: colorScheme.textSecondary }}>
            <p className="mb-2">
              <strong>What this does:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Fetches latest wellness survey data from the CSV source</li>
              <li>Matches player names with database records</li>
              <li>Updates daily wellness completion status for each player</li>
              <li>Enables/disabled player dashboard access based on survey completion</li>
            </ul>
          </div>
        </div>

        {/* Sync Results */}
        {wellnessData && (
          <div 
            className="mb-8 p-6 rounded-2xl border"
            style={{ 
              backgroundColor: colorScheme.cardBackground, 
              borderColor: colorScheme.border 
            }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: colorScheme.text }}>
              <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
              Last Sync Results
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {wellnessData.syncedCount}
                </div>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Players Updated
                </p>
              </div>
              
              <div className="text-center">
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{ color: colorScheme.primary }}
                >
                  {wellnessData.totalRows}
                </div>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Total CSV Rows
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {wellnessData.date}
                </div>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Sync Date
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Player Access Status */}
        <div 
          className="p-6 rounded-2xl border"
          style={{ 
            backgroundColor: colorScheme.cardBackground, 
            borderColor: colorScheme.border 
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: colorScheme.text }}>
            <Users className="h-6 w-6 mr-2" style={{ color: colorScheme.primary }} />
            Player Access Control
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium" style={{ color: colorScheme.text }}>
                  Survey Completed
                </p>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Players can access full dashboard, media files, notes, and calendar
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium" style={{ color: colorScheme.text }}>
                  Survey Not Completed
                </p>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Players see wellness survey requirement and cannot access other features
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
