'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Users, TrendingUp, Clock, User, Activity, AlertTriangle, FileText, FolderOpen, Percent, StickyNote, X, Eye, Download, ArrowLeft, ArrowRight, FolderPlus, Upload, Pencil, Trash2, File as FileIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import MobileCalendar from '@/components/MobileCalendar'
import EventAnalytics from '@/components/EventAnalytics'
import PlayerStatusNotesModal from '@/components/PlayerStatusNotesModal'
import SparklineChart from '@/components/SparklineChart'
import ActivityFeed from '@/components/ActivityFeed'
import DraggableStatsCards from '@/components/DraggableStatsCards'
import DraggableActionCardsWrapper from '@/components/DraggableActionCardsWrapper'
import DraggableSections from '@/components/DraggableSections'
import LiveEventFeed from '@/components/LiveEventFeed'
import RealTimeNotifications from '@/components/RealTimeNotifications'
import ThemeSelector from '@/components/ThemeSelector'
import { PlayerSkeleton, ReportsSkeleton } from '@/components/skeletons'

interface Player {
  id: string
  name: string
  email?: string
  position?: string
  status?: string
  availabilityStatus?: string
  matchDayTag?: string
  imageUrl?: string
  dateOfBirth?: string
  height?: number
  weight?: number
}

interface Event {
  id: string
  title: string
  description?: string
  type: string
  startTime: string
  endTime: string
  location?: string
  participants: Player[]
}

interface StaffNote {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface StaffReport {
  id: string
  name: string
  description?: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
  folder?: {
    id: string
    name: string
  }
}

function StaffNotesList() {
  const { colorScheme } = useTheme()
  const [notes, setNotes] = useState<StaffNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStaffNotes()
  }, [])

  const fetchStaffNotes = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach-notes/staff-notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error('Error fetching staff notes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <StickyNote 
          className="h-12 w-12 mx-auto mb-3"
          style={{ color: colorScheme.textSecondary }}
        />
        <p style={{ color: colorScheme.textSecondary }}>
          No notes assigned to you yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notes.slice(0, 3).map((note) => (
        <div
          key={note.id}
          className="rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl overflow-hidden"
          style={{ 
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.border
          }}
        >
          {/* Header with Author Info */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b" style={{ borderColor: colorScheme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-sm sm:text-base"
                  style={{ backgroundColor: colorScheme.primary }}
                >
                  {note.author.name?.charAt(0)?.toUpperCase() || note.author.email?.charAt(0)?.toUpperCase() || '?'}
                </div>
                {/* Author Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate" style={{ color: colorScheme.text }}>
                    {note.author.name || note.author.email || 'Unknown Author'}
                  </p>
                  <p className="text-xs sm:text-sm truncate" style={{ color: colorScheme.textSecondary }}>
                    {note.author.email || ''}
                  </p>
                </div>
              </div>
              {/* Date and Pinned Badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {note.isPinned && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    PINNED
                  </span>
                )}
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: colorScheme.textSecondary }}>
                    {new Date(note.createdAt).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          {note.title && (
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <h4 className="font-semibold text-base sm:text-lg" style={{ color: colorScheme.text }}>
                {note.title}
              </h4>
            </div>
          )}

          {/* Content */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div 
              className="text-xs sm:text-sm prose prose-sm max-w-none note-content line-clamp-2"
              style={{ color: colorScheme.textSecondary }}
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </div>
        </div>
      ))}
      {notes.length > 3 && (
        <div className="text-center">
          <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
            Showing 3 of {notes.length} notes
          </p>
        </div>
      )}
    </div>
  )
}

function StaffReportsList() {
  const { colorScheme } = useTheme()
  const [folders, setFolders] = useState<any[]>([])
  const [reports, setReports] = useState<StaffReport[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<any>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Cache key based on current folder
  const getCacheKey = (folderId: string | null) => {
    return `staff-reports-cache-${folderId || 'root'}`
  }

  // Load from cache if available
  const loadFromCache = (folderId: string | null) => {
    try {
      const cacheKey = getCacheKey(folderId)
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        const cacheTime = data.timestamp || 0
        const now = Date.now()
        // Cache valid for 30 seconds
        if (now - cacheTime < 30000) {
          return data
        }
      }
    } catch (error) {
      // Ignore cache errors
    }
    return null
  }

  // Save to cache
  const saveToCache = (folderId: string | null, data: any) => {
    try {
      const cacheKey = getCacheKey(folderId)
      sessionStorage.setItem(cacheKey, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }))
    } catch (error) {
      // Ignore cache errors
    }
  }

  useEffect(() => {
    fetchStaffReports()
  }, [])

  const fetchStaffReports = async (folderId: string | null = null) => {
    // Try to load from cache first for instant display
    const cached = loadFromCache(folderId)
    if (cached) {
      setFolders(cached.folders || [])
      setReports(cached.reports || [])
      setLoading(false)
    } else {
      // Show loading state
      setLoading(true)
    }

    try {
      const token = localStorage.getItem('token')
      const url = folderId 
        ? `/api/reports/staff-reports?folderId=${folderId}`
        : '/api/reports/staff-reports'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
        setReports(data.reports || [])
        // Save to cache
        saveToCache(folderId, data)
      }
    } catch (error) {
      console.error('Error fetching staff reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateToFolder = (folder: any) => {
    // Optimistic update - show folder structure immediately
    const newPath = [...currentPath, folder]
    setCurrentPath(newPath)
    setSelectedFolder(folder)
    // Fetch data (will use cache if available)
    fetchStaffReports(folder.id)
  }

  const navigateUp = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1)
      setCurrentPath(newPath)
      const parentFolder = newPath[newPath.length - 1] || null
      setSelectedFolder(parentFolder)
      fetchStaffReports(parentFolder?.id)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    )
  }

  if (folders.length === 0 && reports.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen 
          className="h-12 w-12 mx-auto mb-3"
          style={{ color: colorScheme.textSecondary }}
        />
        <p style={{ color: colorScheme.textSecondary }}>
          No reports assigned to you yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      {currentPath.length > 0 && (
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => {
              setCurrentPath([])
              setSelectedFolder(null)
              fetchStaffReports()
            }}
            className="hover:underline"
            style={{ color: colorScheme.text }}
          >
            Reports
          </button>
          {currentPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center space-x-2">
              <span style={{ color: colorScheme.textSecondary }}>/</span>
              {index === currentPath.length - 1 ? (
                <span style={{ color: colorScheme.text }}>{folder.name}</span>
              ) : (
                <button
                  onClick={() => {
                    const newPath = currentPath.slice(0, index + 1)
                    setCurrentPath(newPath)
                    setSelectedFolder(folder)
                    fetchStaffReports(folder.id)
                  }}
                  className="hover:underline"
                  style={{ color: colorScheme.text }}
                >
                  {folder.name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      {currentPath.length > 0 && (
        <button
          onClick={navigateUp}
          className="flex items-center space-x-2 text-sm hover:underline"
          style={{ color: colorScheme.text }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      )}

      {/* Folders */}
      {loading && folders.length === 0 ? (
        <ReportsSkeleton showFolders={true} showReports={false} />
      ) : folders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
            Folders
          </h3>
          {folders.slice(0, 3).map((folder) => (
            <div 
              key={folder.id}
              className="rounded-lg border-2 p-3 cursor-pointer hover:shadow-md transition-shadow"
              style={{ 
                backgroundColor: colorScheme.background,
                borderColor: `${colorScheme.border}E6`
              }}
              onClick={() => navigateToFolder(folder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 
                      className="font-medium text-sm"
                      style={{ color: colorScheme.text }}
                    >
                      {folder.name}
                    </h4>
                    <p 
                      className="text-xs"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {folder._count?.reports || 0} reports • {folder._count?.children || 0} subfolders
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
              </div>
            </div>
          ))}
          {folders.length > 3 && (
            <div className="text-center">
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                Showing 3 of {folders.length} folders
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reports */}
      {loading && reports.length === 0 ? (
        <ReportsSkeleton showFolders={false} showReports={true} />
      ) : reports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
            Reports
          </h3>
          {reports.slice(0, 3).map((report) => (
            <div
              key={report.id}
              className="rounded-lg border-2 p-3 cursor-pointer hover:shadow-md transition-shadow"
              style={{ 
                backgroundColor: colorScheme.background,
                borderColor: `${colorScheme.border}E6`
              }}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(report.fileUrl, '_blank')
                    }
                  }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 font-bold text-xs">PDF</span>
                  </div>
                  <div>
                    <h4 
                      className="font-medium text-sm"
                      style={{ color: colorScheme.text }}
                    >
                      {report.name}
                    </h4>
                    <p 
                      className="text-xs"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {report.fileName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (typeof window !== 'undefined') {
                            window.open(report.fileUrl, '_blank')
                          }
                        }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    style={{ color: colorScheme.textSecondary }}
                    title="View PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (typeof document !== 'undefined') {
                            const link = document.createElement('a')
                            link.href = report.fileUrl
                            link.download = report.fileName
                            link.click()
                          }
                        }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    style={{ color: colorScheme.textSecondary }}
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {report.description && report.description !== 'undefined' && report.description.trim() !== '' && (
                <div 
                  className="text-xs mb-2 line-clamp-2"
                  style={{ color: colorScheme.textSecondary }}
                >
                  {report.description}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span 
                  className="text-xs"
                  style={{ color: colorScheme.textSecondary }}
                >
                  {formatFileSize(report.fileSize)}
                </span>
                <span 
                  className="text-xs"
                  style={{ color: colorScheme.textSecondary }}
                >
                  {new Date(report.createdAt).toLocaleDateString('en-US')}
                </span>
              </div>
            </div>
          ))}
          {reports.length > 3 && (
            <div className="text-center">
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                Showing 3 of {reports.length} reports
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { colorScheme, theme } = useTheme()
  const { showSuccess, showError, showWarning } = useToast()
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [staffPermissions, setStaffPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showStaffNotesModal, setShowStaffNotesModal] = useState(false)
  const [showStaffReportsModal, setShowStaffReportsModal] = useState(false)
  const [showPlayerNotesModal, setShowPlayerNotesModal] = useState(false)
  const [showActivityFeedModal, setShowActivityFeedModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  // Match Day Tag bulk operations state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isUpdatingTags, setIsUpdatingTags] = useState(false)
  const [lastClickTime, setLastClickTime] = useState<{ [key: string]: number }>({})
  
  // Historical data for sparkline charts
  const [availabilityHistory, setAvailabilityHistory] = useState<number[]>([])
  const [totalPlayersHistory, setTotalPlayersHistory] = useState<number[]>([])
  const [unavailableHistory, setUnavailableHistory] = useState<number[]>([])
  const [availabilityPercentageHistory, setAvailabilityPercentageHistory] = useState<number[]>([])
  
  // Player availability percentages (calculated from all historical data)
  const [playerAvailabilityPercentages, setPlayerAvailabilityPercentages] = useState<{ [playerId: string]: number }>({})


  useEffect(() => {
    fetchPlayers()
    fetchEvents()
    fetchStaffPermissions()
    
    // Real-time updates for player status changes - poll every 10 seconds
    const interval = setInterval(() => {
      fetchPlayers()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [user])

  // Fetch availability history after players are loaded (only once, not on every players change)
  useEffect(() => {
    if (players.length > 0 && availabilityHistory.length === 0) {
      fetchAvailabilityHistory()
      fetchPlayerAvailabilityPercentages()
    }
  }, [players.length]) // Only depend on players.length, not the whole array

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffPermissions = async () => {
    try {
      if (user?.role === 'STAFF' && user?.staff) {
        setStaffPermissions(user.staff)
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error)
    }
  }

  const fetchAvailabilityHistory = async () => {
    try {
      // Get last 5 days dates
      const dates: string[] = []
      for (let i = 4; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        dates.push(date.toISOString().split('T')[0])
      }

      // Fetch daily notes for last 5 days (API uses 'days' parameter)
      const response = await fetch('/api/analytics/players-csv?days=5')
      
      if (response.ok) {
        const csvText = await response.text()
        const lines = csvText.split('\n').slice(1) // Skip header
        
        // Count players per day (available, unavailable, total)
        const dailyAvailable: { [date: string]: Set<string> } = {}
        const dailyUnavailable: { [date: string]: Set<string> } = {}
        const dailyTotal: { [date: string]: Set<string> } = {}
        
        dates.forEach(date => {
          dailyAvailable[date] = new Set()
          dailyUnavailable[date] = new Set()
          dailyTotal[date] = new Set()
        })

        lines.forEach(line => {
          if (!line.trim()) return
          const [dateStr, playerName, availabilityStatus] = line.split(',')
          if (dateStr && playerName && availabilityStatus) {
            const cleanDate = dateStr.replace(/"/g, '')
            const cleanStatus = availabilityStatus.replace(/"/g, '').trim()
            const cleanPlayerName = playerName.replace(/"/g, '')
            
            if (dailyTotal[cleanDate]) {
              dailyTotal[cleanDate].add(cleanPlayerName)
              
              if (cleanStatus === 'FULLY_AVAILABLE' || cleanStatus === 'Fully Available') {
                dailyAvailable[cleanDate].add(cleanPlayerName)
              } else {
                dailyUnavailable[cleanDate].add(cleanPlayerName)
              }
            }
          }
        })

        // Convert to arrays for last 5 days
        const availableHistory = dates.map(date => dailyAvailable[date]?.size || 0)
        const unavailableHistory = dates.map(date => dailyUnavailable[date]?.size || 0)
        const totalHistory = dates.map(date => dailyTotal[date]?.size || 0)
        
        // Calculate availability percentage history
        const percentageHistory = dates.map((date, index) => {
          const total = totalHistory[index] || 0
          const available = availableHistory[index] || 0
          return total > 0 ? Math.round((available / total) * 100) : 0
        })
        
        // If we have no data, use current players data as fallback
        const hasData = totalHistory.some(count => count > 0)
        if (!hasData && players.length > 0) {
          const currentActive = players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE' || p.availabilityStatus === 'Fully Available').length
          const currentUnavailable = players.filter(p => 
            p.availabilityStatus !== 'FULLY_AVAILABLE' && 
            p.availabilityStatus !== 'Fully Available' &&
            p.availabilityStatus !== 'ACTIVE'
          ).length
          const currentTotal = players.length
          const currentPercentage = currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0
          
          setAvailabilityHistory([currentActive, currentActive, currentActive, currentActive, currentActive])
          setUnavailableHistory([currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable])
          setTotalPlayersHistory([currentTotal, currentTotal, currentTotal, currentTotal, currentTotal])
          setAvailabilityPercentageHistory([currentPercentage, currentPercentage, currentPercentage, currentPercentage, currentPercentage])
        } else {
          setAvailabilityHistory(availableHistory)
          setUnavailableHistory(unavailableHistory)
          setTotalPlayersHistory(totalHistory)
          setAvailabilityPercentageHistory(percentageHistory)
        }
      } else {
        // Fallback: use current players data if available
        if (players.length > 0) {
          const currentActive = players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE' || p.availabilityStatus === 'Fully Available').length
          const currentUnavailable = players.filter(p => 
            p.availabilityStatus !== 'FULLY_AVAILABLE' && 
            p.availabilityStatus !== 'Fully Available' &&
            p.availabilityStatus !== 'ACTIVE'
          ).length
          const currentTotal = players.length
          const currentPercentage = currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0
          
          setAvailabilityHistory([currentActive, currentActive, currentActive, currentActive, currentActive])
          setUnavailableHistory([currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable])
          setTotalPlayersHistory([currentTotal, currentTotal, currentTotal, currentTotal, currentTotal])
          setAvailabilityPercentageHistory([currentPercentage, currentPercentage, currentPercentage, currentPercentage, currentPercentage])
        } else {
          setAvailabilityHistory([])
          setUnavailableHistory([])
          setTotalPlayersHistory([])
          setAvailabilityPercentageHistory([])
        }
      }
    } catch (error) {
      console.error('Error fetching availability history:', error)
      // Fallback: use current players data if available
      if (players.length > 0) {
        const currentActive = players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE' || p.availabilityStatus === 'Fully Available').length
        const currentUnavailable = players.filter(p => 
          p.availabilityStatus !== 'FULLY_AVAILABLE' && 
          p.availabilityStatus !== 'Fully Available' &&
          p.availabilityStatus !== 'ACTIVE'
        ).length
        const currentTotal = players.length
        const currentPercentage = currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0
        
        setAvailabilityHistory([currentActive, currentActive, currentActive, currentActive, currentActive])
        setUnavailableHistory([currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable, currentUnavailable])
        setTotalPlayersHistory([currentTotal, currentTotal, currentTotal, currentTotal, currentTotal])
        setAvailabilityPercentageHistory([currentPercentage, currentPercentage, currentPercentage, currentPercentage, currentPercentage])
      } else {
        setAvailabilityHistory([])
        setUnavailableHistory([])
        setTotalPlayersHistory([])
        setAvailabilityPercentageHistory([])
      }
    }
  }

  // Helper function to parse CSV line properly (handles quoted strings)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Add last field
    result.push(current.trim())
    return result
  }

  const fetchPlayerAvailabilityPercentages = async () => {
    if (players.length === 0) return // Wait for players to load
    
    try {
      // Fetch all historical data (no limit - get all days)
      const response = await fetch('/api/analytics/players-csv')

      if (response.ok) {
        const csvText = await response.text()
        const lines = csvText.split('\n').filter(line => line.trim()) // Remove empty lines
        if (lines.length <= 1) {
          // Only header or no data
          const percentages: { [playerId: string]: number } = {}
          players.forEach(player => {
            const isAvailable = player.availabilityStatus === 'FULLY_AVAILABLE' || player.availabilityStatus === 'Fully Available'
            percentages[player.id] = isAvailable ? 100 : 0
          })
          setPlayerAvailabilityPercentages(percentages)
          return
        }

        // Skip header
        const dataLines = lines.slice(1)

        // Count availability per player
        const playerStats: { [playerName: string]: { total: number; available: number } } = {}

        dataLines.forEach(line => {
          if (!line.trim()) return
          
          try {
            const fields = parseCSVLine(line)
            if (fields.length >= 3) {
              const dateStr = fields[0]?.replace(/"/g, '').trim()
              const playerName = fields[1]?.replace(/"/g, '').trim()
              const availabilityStatus = fields[2]?.replace(/"/g, '').trim()
              
              if (dateStr && playerName && availabilityStatus) {
                if (!playerStats[playerName]) {
                  playerStats[playerName] = { total: 0, available: 0 }
                }

                playerStats[playerName].total++

                if (availabilityStatus === 'FULLY_AVAILABLE' || availabilityStatus === 'Fully Available') {
                  playerStats[playerName].available++
                }
              }
            }
          } catch (parseError) {
            console.warn('Error parsing CSV line:', line, parseError)
            // Skip this line
          }
        })

        // Calculate percentages and map to player IDs
        const percentages: { [playerId: string]: number } = {}
        
        players.forEach(player => {
          const stats = playerStats[player.name]
          if (stats && stats.total > 0) {
            percentages[player.id] = Math.round((stats.available / stats.total) * 100)
          } else {
            // If no historical data, use current status
            const isAvailable = player.availabilityStatus === 'FULLY_AVAILABLE' || player.availabilityStatus === 'Fully Available'
            percentages[player.id] = isAvailable ? 100 : 0
          }
        })

        console.log('📊 Player availability percentages calculated:', percentages)
        setPlayerAvailabilityPercentages(percentages)
      } else {
        console.warn('⚠️ Failed to fetch CSV, using current status')
        // Fallback: use current status
        const percentages: { [playerId: string]: number } = {}
        players.forEach(player => {
          const isAvailable = player.availabilityStatus === 'FULLY_AVAILABLE' || player.availabilityStatus === 'Fully Available'
          percentages[player.id] = isAvailable ? 100 : 0
        })
        setPlayerAvailabilityPercentages(percentages)
      }
    } catch (error) {
      console.error('❌ Error fetching player availability percentages:', error)
      // Fallback: use current status
      const percentages: { [playerId: string]: number } = {}
      players.forEach(player => {
        const isAvailable = player.availabilityStatus === 'FULLY_AVAILABLE' || player.availabilityStatus === 'Fully Available'
        percentages[player.id] = isAvailable ? 100 : 0
      })
      setPlayerAvailabilityPercentages(percentages)
    }
  }

  const handleSavePlayerNotes = async (data: { reason: string; notes: string }) => {
    if (!selectedPlayer || !user) return

    setIsSavingNotes(true)
    try {
      // First update player status in database
      const statusResponse = await fetch(`/api/players/${selectedPlayer.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedPlayer.availabilityStatus || selectedPlayer.status })
      })

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json()
        console.error('Failed to update player status:', errorData)
        showError(`Failed to update player status: ${errorData.message}`)
        return
      }

      // Then save the notes
      const notesResponse = await fetch('/api/player-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          status: selectedPlayer.availabilityStatus,
          reason: data.reason,
          notes: data.notes,
          createdBy: user.id
        })
      })

      if (notesResponse.ok) {
        console.log('✅ Player status and notes saved successfully')
        
        // Update local state
        setPlayers(prev => prev.map(p => 
          p.id === selectedPlayer.id ? { ...p, availabilityStatus: selectedPlayer.availabilityStatus } : p
        ))
        
        // Refresh availability percentages after saving notes
        setTimeout(() => {
          fetchPlayerAvailabilityPercentages()
        }, 500) // Small delay to ensure data is saved
        
        setShowPlayerNotesModal(false)
        setSelectedPlayer(null)
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await notesResponse.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error('❌ Failed to save player notes:', errorData)
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
          errorMessage = notesResponse.statusText || 'Internal server error'
        }
        showError(`Failed to save notes: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Error saving player notes:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving notes.'
      showError(`Error: ${errorMessage}`)
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Bulk operations for Match Day Tags
  const handleSelectAllPlayers = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([])
    } else {
      setSelectedPlayers(players.map(p => p.id))
    }
  }

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.includes(playerId)
      const newSelection = isSelected
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
      return newSelection
    })
  }

  const handleBulkUpdateTags = async (tag: string) => {
    if (selectedPlayers.length === 0) return

    setIsUpdatingTags(true)
    try {
      const response = await fetch('/api/players/match-day-tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerIds: selectedPlayers, 
          matchDayTag: tag 
        })
      })

      if (response.ok) {
        // Update local state
        setPlayers(prev => prev.map(p => 
          selectedPlayers.includes(p.id) 
            ? { ...p, matchDayTag: tag || null }
            : p
        ))
        setSelectedPlayers([])
        console.log(`✅ Updated ${selectedPlayers.length} players with tag: ${tag}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to update tags:', errorData)
        showError(`Failed to update tags: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      showError('An error occurred while updating tags.')
    } finally {
      setIsUpdatingTags(false)
    }
  }

  const handleSinglePlayerTagUpdate = async (playerId: string, tag: string) => {
    try {
      const response = await fetch('/api/players/match-day-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId, 
          matchDayTag: tag 
        })
      })

      if (response.ok) {
        // Update local state
        setPlayers(prev => prev.map(p => 
          p.id === playerId 
            ? { ...p, matchDayTag: tag || null }
            : p
        ))
        console.log(`✅ Updated player ${playerId} with tag: ${tag}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to update tag:', errorData)
        showError(`Failed to update tag: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      showError('An error occurred while updating tag.')
    }
  }

  // Calculate stats
  const totalPlayers = players.length
  const activePlayers = players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE' || p.availabilityStatus === 'Fully Available').length
  const notAvailablePlayers = players.filter(p => 
    p.availabilityStatus !== 'FULLY_AVAILABLE' && 
    p.availabilityStatus !== 'Fully Available' &&
    p.availabilityStatus !== 'ACTIVE'
  ).length
  
  // Calculate availability percentage
  const availabilityPercentage = totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0
  
  // Get color based on percentage
  const getAvailabilityColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981' // Green for high availability
    if (percentage >= 60) return '#F59E0B' // Yellow for medium availability
    return '#EF4444' // Red for low availability
  }
  

  // Get next 7 days events
  const nextWeekEvents = events
    .filter(e => {
      const eventDate = new Date(e.startTime)
      const today = new Date()
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      // Reset time to start of day for comparison
      today.setHours(0, 0, 0, 0)
      nextWeek.setHours(23, 59, 59, 999)
      eventDate.setHours(0, 0, 0, 0)
      
      return eventDate >= today && eventDate <= nextWeek
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (dateTimeString: string) => {
    if (!dateTimeString) return ''
    const date = new Date(dateTimeString)
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getEventColor = (type: string) => {
    const colors = {
      TRAINING: '#3B82F6',
      MATCH: '#EF4444',
      MEETING: '#10B981',
      MEDICAL: '#F59E0B',
      RECOVERY: '#8B5CF6',
      MEAL: '#F97316',
      REST: '#6366F1',
      OTHER: '#6B7280'
    }
    return colors[type as keyof typeof colors] || colors.OTHER
  }

  if (loading) {
    return (
      <div className="min-h-screen p-0 sm:p-4 space-y-2 sm:space-y-6" style={{ backgroundColor: colorScheme.background }}>
        <div className="px-0 sm:px-6 mb-3 sm:mb-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 rounded w-64" style={{ backgroundColor: colorScheme.border + '40' }}></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg" style={{ backgroundColor: colorScheme.border + '40' }}></div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-0 sm:px-6">
          <div className="rounded-lg border-2 p-6" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
            <div className="h-6 rounded w-48 mb-6" style={{ backgroundColor: colorScheme.border + '40' }}></div>
            <PlayerSkeleton count={6} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen p-0 sm:p-4 space-y-2 sm:space-y-6" 
      style={{ 
        backgroundColor: colorScheme.background,
        background: colorScheme.background,
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overscrollBehaviorX: 'none',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Header - Compact Design with Notifications and Theme */}
      <div className="px-0 sm:px-6 mb-2 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start flex-1">
            <div 
              className="relative inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border transition-all duration-300 hover:shadow-md"
              style={{ 
                backgroundColor: `${colorScheme.primary}08`,
                borderColor: `${colorScheme.primary}25`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <div 
                className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold text-sm sm:text-base shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.primary}, ${colorScheme.primary}DD)`,
                  color: '#FFFFFF',
                  boxShadow: `0 4px 12px ${colorScheme.primary}40, 0 2px 4px ${colorScheme.primary}20, inset 0 1px 0 rgba(255,255,255,0.2)`
                }}
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                <span className="relative z-10 drop-shadow-sm">AB</span>
              </div>
              <div className="flex flex-col">
                <h1 
                  className="text-base sm:text-lg font-semibold leading-tight"
                  style={{ 
                    color: colorScheme.text,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  Athlete Management System
                </h1>
              </div>
            </div>
          </div>
          
          {/* Notifications and Theme Icons - Always visible at top */}
          <div className="flex items-center space-x-2">
            <RealTimeNotifications userId={user?.id || user?.userId} userRole={user?.role} />
            <ThemeSelector />
          </div>
        </div>
      </div>

      {/* All Sections with Drag & Drop */}
      <DraggableSections
        storageKey="dashboard-sections-order"
        sections={[
          {
            id: 'stats-cards',
            shouldShow: true,
            element: (
              <div className="px-0 sm:px-6 mb-3 sm:mb-4">
        <DraggableStatsCards storageKey="dashboard-stats-cards-order">
          <div className="card-fade-in hover-scale-subtle p-3 sm:p-4 rounded-lg border-2 h-full flex flex-col" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center min-w-0 flex-1">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0" style={{ color: colorScheme.primary }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: colorScheme.textSecondary }}>Total Players</p>
                  <p className="text-lg sm:text-xl font-bold" style={{ color: colorScheme.text }}>{totalPlayers}</p>
                </div>
              </div>
              {/* Mini Sparkline Chart - Real data for last 5 days trend */}
              <div className="ml-2 flex-shrink-0">
                {totalPlayersHistory.length > 0 ? (
                  <SparklineChart 
                    data={totalPlayersHistory}
                    color={colorScheme.primary}
                    width={60}
                    height={24}
                  />
                ) : (
                  <div className="w-[60px] h-[24px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-gray-200 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                )}
              </div>
            </div>
            {/* Spacer to match Availability card height */}
            <div className="mt-auto pt-1">
              <p className="text-[10px] sm:text-xs opacity-0">placeholder</p>
            </div>
          </div>

          <div className="card-fade-in hover-scale-subtle p-3 sm:p-4 rounded-lg border-2 h-full flex flex-col" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center min-w-0 flex-1">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0" style={{ color: '#10B981' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: colorScheme.textSecondary }}>Available</p>
                  <p className="text-lg sm:text-xl font-bold" style={{ color: '#10B981' }}>{activePlayers}</p>
                </div>
              </div>
              {/* Mini Sparkline Chart - Real data for last 5 days trend */}
              <div className="ml-2 flex-shrink-0">
                {availabilityHistory.length > 0 ? (
                  <SparklineChart 
                    data={availabilityHistory}
                    color="#10B981"
                    width={60}
                    height={24}
                  />
                ) : (
                  <div className="w-[60px] h-[24px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-gray-200 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                )}
              </div>
            </div>
            {/* Spacer to match Availability card height */}
            <div className="mt-auto pt-1">
              <p className="text-[10px] sm:text-xs opacity-0">placeholder</p>
            </div>
          </div>

          <div className="card-fade-in hover-scale-subtle p-3 sm:p-4 rounded-lg border-2 h-full flex flex-col" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center min-w-0 flex-1">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0" style={{ color: '#EF4444' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: colorScheme.textSecondary }}>Unavailable</p>
                  <p className="text-lg sm:text-xl font-bold" style={{ color: '#EF4444' }}>{notAvailablePlayers}</p>
                </div>
              </div>
              {/* Mini Sparkline Chart - Real data for last 5 days trend */}
              <div className="ml-2 flex-shrink-0">
                {unavailableHistory.length > 0 ? (
                  <SparklineChart 
                    data={unavailableHistory}
                    color="#EF4444"
                    width={60}
                    height={24}
                  />
                ) : (
                  <div className="w-[60px] h-[24px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-gray-200 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                )}
              </div>
            </div>
            {/* Spacer to match Availability card height */}
            <div className="mt-auto pt-1">
              <p className="text-[10px] sm:text-xs opacity-0">placeholder</p>
            </div>
          </div>

          <div className="card-fade-in hover-scale-subtle p-3 sm:p-4 rounded-lg border-2 h-full flex flex-col" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center min-w-0 flex-1">
                <Percent className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0" style={{ color: getAvailabilityColor(availabilityPercentage) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: colorScheme.textSecondary }}>Availability</p>
                  <p className="text-lg sm:text-xl font-bold" style={{ color: getAvailabilityColor(availabilityPercentage) }}>{availabilityPercentage}%</p>
                </div>
              </div>
              {/* Mini Sparkline Chart - Real data for last 5 days trend */}
              <div className="ml-2 flex-shrink-0">
                {availabilityPercentageHistory.length > 0 ? (
                  <SparklineChart 
                    data={availabilityPercentageHistory}
                    color={getAvailabilityColor(availabilityPercentage)}
                    width={60}
                    height={24}
                  />
                ) : (
                  <div className="w-[60px] h-[24px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-gray-200 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
                  </div>
                )}
              </div>
            </div>
            {/* Additional info - always at bottom, same height for all cards */}
            <div className="mt-auto pt-1">
              <p className="text-[10px] sm:text-xs" style={{ color: colorScheme.textSecondary }}>
                {activePlayers}/{totalPlayers} available
              </p>
            </div>
          </div>
        </DraggableStatsCards>
              </div>
            )
          },
          {
            id: 'action-cards',
            shouldShow: true,
            element: (
              <div className="px-0 sm:px-6 mb-3 sm:mb-4">
        <DraggableActionCardsWrapper
          storageKey="dashboard-action-cards-order"
          cards={[
            {
              id: 'reports',
              shouldShow: ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) || false,
              element: (
                <div 
                  className="card-fade-in hover-scale p-3 sm:p-4 md:p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow w-full h-full" 
                  style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}
                  onClick={() => {
                    if (user?.role === 'STAFF') {
                      setShowStaffReportsModal(true)
                    } else {
                      window.location.href = '/dashboard/reports'
                    }
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-10 md:w-10 mb-2" style={{ color: '#7C3AED' }} />
                    <p className="text-xs sm:text-sm md:text-base font-medium" style={{ color: colorScheme.textSecondary }}>Reports</p>
                  </div>
                </div>
              )
            },
            {
              id: 'notes',
              shouldShow: ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) || false,
              element: (
                <div 
                  className="card-fade-in hover-scale p-3 sm:p-4 md:p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow w-full h-full" 
                  style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}
                  onClick={() => {
                    if (user?.role === 'STAFF') {
                      setShowStaffNotesModal(true)
                    } else {
                      window.location.href = '/dashboard/notes'
                    }
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <StickyNote className="h-6 w-6 sm:h-7 sm:w-7 md:h-10 md:w-10 mb-2" style={{ color: '#F59E0B' }} />
                    <p className="text-xs sm:text-sm md:text-base font-medium" style={{ color: colorScheme.textSecondary }}>Notes</p>
                  </div>
                </div>
              )
            },
            {
              id: 'player-reports',
              shouldShow: (user?.role === 'COACH' || user?.role === 'ADMIN') || false,
              element: (
                <div 
                  className="card-fade-in hover-scale p-3 sm:p-4 md:p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow w-full h-full" 
                  style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}
                  onClick={() => {
                    window.location.href = '/dashboard/player-reports'
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-10 md:w-10 mb-2" style={{ color: '#10B981' }} />
                    <p className="text-xs sm:text-sm md:text-base font-medium" style={{ color: colorScheme.textSecondary }}>Player Reports</p>
                  </div>
                </div>
              )
            },
            {
              id: 'activity',
              shouldShow: true,
              element: (
                <div 
                  className="card-fade-in hover-scale p-3 sm:p-4 md:p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow w-full h-full" 
                  style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}
                  onClick={() => {
                    setShowActivityFeedModal(true)
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <Activity className="h-6 w-6 sm:h-7 sm:w-7 md:h-10 md:w-10 mb-2" style={{ color: colorScheme.primary }} />
                    <p className="text-xs sm:text-sm md:text-base font-medium" style={{ color: colorScheme.textSecondary }}>Activity</p>
                  </div>
                </div>
              )
            }
          ]}
        />
              </div>
            )
          },
          {
            id: 'today-events',
            shouldShow: true,
            element: (
              <div className="px-0 sm:px-6 mb-3 sm:mb-4">
                <LiveEventFeed userId={user?.userId || user?.id} userRole={user?.role} />
              </div>
            )
          },
          {
            id: 'players-section',
            shouldShow: true,
            element: (
              <div className="px-0 sm:px-6">
        <div className="card-fade-in rounded-lg border-2 p-6" style={{ backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
              Players Overview
            </h2>
            <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
              {totalPlayers} players
            </span>
          </div>
          
          {/* Bulk Operations - Only for Admin */}
          {user && user.role === 'ADMIN' && (
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <input
                  type="checkbox"
                  checked={selectedPlayers.length === players.length && players.length > 0}
                  onChange={handleSelectAllPlayers}
                  className="form-checkbox h-4 w-4 text-red-600 rounded"
                  style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}
                />
                <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  {selectedPlayers.length} selected
                </span>
              </div>

              <div className="w-full sm:w-auto">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkUpdateTags(e.target.value);
                      e.target.value = ''; // Reset dropdown
                    }
                  }}
                  disabled={selectedPlayers.length === 0 || isUpdatingTags}
                  className="w-full px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 sm:px-3 sm:py-2 sm:text-xs appearance-none"
                  style={{
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    borderColor: colorScheme.border
                  }}
                >
                  <option value="">Select Tag</option>
                  <option value="Match Day">Match Day</option>
                  <option value="Match Day +1">MD +1</option>
                  <option value="Match Day +2">MD +2</option>
                  <option value="Match Day +3">MD +3</option>
                  <option value="Match Day +4">MD +4</option>
                  <option value="Match Day +5">MD +5</option>
                  <option value="Match Day -1">MD -1</option>
                  <option value="Match Day -2">MD -2</option>
                  <option value="Match Day -3">MD -3</option>
                  <option value="Match Day -4">MD -4</option>
                  <option value="Match Day -5">MD -5</option>
                  <option value="Match Day +1-1">MD +1-1</option>
                  <option value="Match Day +2-1">MD +2-1</option>
                  <option value="Match Day +3-1">MD +3-1</option>
                  <option value="Individual Training">Individual</option>
                  <option value="Match Day Compensation">MD Compensation</option>
                  <option value="Match Day +1 Compensation">MD +1 Comp</option>
                  <option value="Match Day +2 Compensation">MD +2 Comp</option>
                  <option value="Rehab">Rehab</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Day Off">Day Off</option>
                  <option value="">Clear</option>
                </select>
              </div>
            </div>
          )}

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            <style jsx>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-2px); }
              }
              @keyframes glow {
                0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
                50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
              }
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              .player-card {
                animation: float 6s ease-in-out infinite;
              }
              .player-card:hover {
                animation: none;
              }
              .shimmer-effect {
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                background-size: 200% 100%;
                animation: shimmer 2s infinite;
              }
              .player-card select,
              select {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                background-image: none;
              }
              .player-card select::-ms-expand,
              select::-ms-expand {
                display: none;
              }
            `}</style>
            {players.map((player) => {
              // Status options
              const statusOptions = [
                { value: 'FULLY_AVAILABLE', label: 'Fully Available', color: '#10B981' },
                { value: 'PARTIAL_TRAINING', label: 'Partially Available - Training', color: '#F59E0B' },
                { value: 'PARTIAL_TEAM_INDIVIDUAL', label: 'Partially Available - Team + Individual', color: '#F97316' },
                { value: 'REHAB_INDIVIDUAL', label: 'Rehabilitation - Individual', color: '#EF4444' },
                { value: 'NOT_AVAILABLE_INJURY', label: 'Unavailable - Injury', color: '#92400E' },
                { value: 'PARTIAL_ILLNESS', label: 'Partially Available - Illness', color: '#F59E0B' },
                { value: 'NOT_AVAILABLE_ILLNESS', label: 'Unavailable - Illness', color: '#DC2626' },
                { value: 'INDIVIDUAL_WORK', label: 'Individual Work', color: '#2563EB' },
                { value: 'RECOVERY', label: 'Recovery', color: '#2563EB' },
                { value: 'NOT_AVAILABLE_OTHER', label: 'Unavailable - Other', color: '#6B7280' },
                { value: 'DAY_OFF', label: 'Day Off', color: '#059669' },
                { value: 'NATIONAL_TEAM', label: 'National Team', color: '#7C3AED' },
                { value: 'PHYSIO_THERAPY', label: 'Physio Therapy', color: '#92400E' },
                { value: 'ACTIVE', label: 'Active', color: '#10B981' },
                { value: 'INJURED', label: 'Injured', color: '#92400E' },
                { value: 'SUSPENDED', label: 'Suspended', color: '#6B7280' },
                { value: 'INACTIVE', label: 'Inactive', color: '#6B7280' },
                { value: 'RETIRED', label: 'Retired', color: '#6B7280' }
              ]
              
              const currentStatusOption = statusOptions.find(opt => opt.value === player.availabilityStatus || opt.value === player.status) || statusOptions[0]
                  
              // Match Day Tag options
              const matchDayTagOptions = [
                'Match Day', 'Match Day +1', 'Match Day +2', 'Match Day +3', 'Match Day +4', 'Match Day +5',
                'Match Day -5', 'Match Day -4', 'Match Day -3', 'Match Day -2', 'Match Day -1',
                'Match Day +1-1', 'Match Day +2-1', 'Match Day +3-1',
                'Individual Training', 'Match Day Compensation', 'Match Day +1 Compensation', 'Match Day +2 Compensation',
                'Rehab', 'Recovery', 'Day Off'
              ]
              
              return (
                <div 
                  key={player.id} 
                  className={`player-card card-fade-in hover-scale group relative rounded-lg border-2 p-4 sm:p-4 transition-all duration-300 hover:scale-105 cursor-pointer ${
                    selectedPlayers.includes(player.id) ? 'ring-2 ring-opacity-40 scale-105 animate-pulse' : 'hover:border-opacity-80'
                  }`}
                  style={{ 
                    background: selectedPlayers.includes(player.id) 
                      ? `linear-gradient(135deg, ${colorScheme.primary}20, ${colorScheme.primary}15, ${colorScheme.primary}10, ${colorScheme.primary}08, ${colorScheme.primary}05, ${colorScheme.surface})`
                      : theme === 'dark' 
                        ? `linear-gradient(135deg, #0EA5E915, #0284C710, #0369A108, #0F172A05)`
                        : theme === 'green'
                          ? `linear-gradient(135deg, #DCFCE715, #BBF7D010, #86EFAC08, #F0FDF405)`
                          : theme === 'blue'
                            ? `linear-gradient(135deg, #DBEAFE15, #BFDBFE10, #93C5FD08, #EFF6FF05)`
                            : theme === 'purple'
                              ? `linear-gradient(135deg, #F3E8FF15, #E9D5FF10, #C4B5FD08, #FAF5FF05)`
                              : theme === 'red'
                                ? `linear-gradient(135deg, #FEE2E215, #FECACA10, #FCA5A508, #FEF2F205)`
                                : `linear-gradient(135deg, #F8FAFC, #F1F5F9, #E2E8F0)`,
                    borderColor: selectedPlayers.includes(player.id) 
                      ? `${colorScheme.primary}80` 
                      : `${colorScheme.border}E6`,  // Use same border color as other cards
                    ringColor: `${colorScheme.primary}60`,
                    boxShadow: selectedPlayers.includes(player.id) 
                      ? `0 8px 20px -4px ${colorScheme.primary}30, 0 0 0 1px ${colorScheme.primary}20, 0 0 15px ${colorScheme.primary}25, 0 0 25px ${colorScheme.primary}15`
                      : theme === 'dark'
                        ? `0 0 0 0.1px ${currentStatusOption.color}, 0 0 8px ${currentStatusOption.color}30, 0 0 15px ${currentStatusOption.color}20`
                        : `0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px #E2E8F0`
                  }}
                >
                  {/* Animated Background Gradient */}
                  <div 
                    className={`absolute inset-0 rounded-lg transition-opacity duration-500 shimmer-effect ${
                      selectedPlayers.includes(player.id) ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
                    }`}
                    style={{
                      background: selectedPlayers.includes(player.id)
                        ? `linear-gradient(135deg, ${colorScheme.primary}15, ${colorScheme.primary}12, ${colorScheme.primary}08, ${colorScheme.primary}05, transparent)`
                        : theme === 'dark'
                          ? `linear-gradient(135deg, #0EA5E908, #0284C705, #0369A103, #0F172A02, transparent)`
                          : theme === 'green'
                            ? `linear-gradient(135deg, #DCFCE708, #BBF7D005, #86EFAC03, #F0FDF402, transparent)`
                            : theme === 'blue'
                              ? `linear-gradient(135deg, #DBEAFE08, #BFDBFE05, #93C5FD03, #EFF6FF02, transparent)`
                              : theme === 'purple'
                                ? `linear-gradient(135deg, #F3E8FF08, #E9D5FF05, #C4B5FD03, #FAF5FF02, transparent)`
                                : theme === 'red'
                                  ? `linear-gradient(135deg, #FEE2E208, #FECACA05, #FCA5A503, #FEF2F202, transparent)`
                                  : `linear-gradient(135deg, #E0F2FE08, #F0F9FF05, #F8FAFC03, #FFFFFF02, transparent)`
                    }}
                  ></div>

                  {/* Glow Effect */}
                  <div 
                    className={`absolute -inset-0.5 rounded-lg transition-opacity duration-500 blur-sm group-hover:blur-md ${
                      selectedPlayers.includes(player.id) ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${currentStatusOption.color}20, ${currentStatusOption.color}15, transparent)`,
                      boxShadow: selectedPlayers.includes(player.id) 
                        ? `0 0 12px ${currentStatusOption.color}30, 0 0 20px ${currentStatusOption.color}20`
                        : `0 0 8px ${currentStatusOption.color}20`
                    }}
                  ></div>


                  {/* Subtle Texture Pattern for Non-Selected Cards */}
                  {!selectedPlayers.includes(player.id) && (
                    <div 
                      className="absolute inset-0 rounded-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"
                      style={{
                        backgroundImage: theme === 'dark'
                          ? `radial-gradient(circle at 20% 20%, #0EA5E910 1px, transparent 1px),
                            radial-gradient(circle at 80% 80%, #0284C708 1px, transparent 1px),
                            radial-gradient(circle at 40% 60%, #0369A106 1px, transparent 1px)`
                          : theme === 'green'
                            ? `radial-gradient(circle at 20% 20%, #22C55E10 1px, transparent 1px),
                              radial-gradient(circle at 80% 80%, #16A34A08 1px, transparent 1px),
                              radial-gradient(circle at 40% 60%, #15803D06 1px, transparent 1px)`
                            : theme === 'blue'
                              ? `radial-gradient(circle at 20% 20%, #3B82F610 1px, transparent 1px),
                                radial-gradient(circle at 80% 80%, #2563EB08 1px, transparent 1px),
                                radial-gradient(circle at 40% 60%, #1D4ED806 1px, transparent 1px)`
                              : theme === 'purple'
                                ? `radial-gradient(circle at 20% 20%, #8B5CF610 1px, transparent 1px),
                                  radial-gradient(circle at 80% 80%, #7C3AED08 1px, transparent 1px),
                                  radial-gradient(circle at 40% 60%, #6D28D906 1px, transparent 1px)`
                                : theme === 'red'
                                  ? `radial-gradient(circle at 20% 20%, #EF444410 1px, transparent 1px),
                                    radial-gradient(circle at 80% 80%, #DC262608 1px, transparent 1px),
                                    radial-gradient(circle at 40% 60%, #B91C1C06 1px, transparent 1px)`
                                  : `radial-gradient(circle at 20% 20%, #3B82F610 1px, transparent 1px),
                                    radial-gradient(circle at 80% 80%, #3B82F608 1px, transparent 1px),
                                    radial-gradient(circle at 40% 60%, #3B82F606 1px, transparent 1px)`,
                        backgroundSize: '20px 20px, 30px 30px, 25px 25px',
                        backgroundPosition: '0 0, 10px 10px, 5px 15px'
                      }}
                    ></div>
                  )}

                  {/* Selection Checkbox - Only for Admin */}
                  {user && user.role === 'ADMIN' && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="relative">
                        <div
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card click
                            const now = Date.now()
                            const lastClick = lastClickTime[player.id] || 0
                            
                            if (now - lastClick < 300) { // Double click within 300ms
                              // Deselect player
                              setSelectedPlayers(prev => prev.filter(id => id !== player.id))
                            } else {
                              // Single click - toggle selection
                              setSelectedPlayers(prev => 
                                prev.includes(player.id) 
                                  ? prev.filter(id => id !== player.id)
                                  : [...prev, player.id]
                              )
                            }
                            
                            setLastClickTime(prev => ({ ...prev, [player.id]: now }))
                          }}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                            selectedPlayers.includes(player.id) ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-400'
                          }`}
                          style={{ 
                            borderColor: selectedPlayers.includes(player.id) 
                              ? '#10B981' 
                              : theme === 'dark' 
                                ? '#FFFFFF'  // Pure white
                                : theme === 'green'
                                  ? '#22C55E60'
                                  : theme === 'blue'
                                    ? '#3B82F660'
                                    : theme === 'purple'
                                      ? '#8B5CF660'
                                      : theme === 'red'
                                        ? '#EF444460'
                                        : colorScheme.border,
                            backgroundColor: selectedPlayers.includes(player.id) ? '#10B981' : 'transparent'
                          }}
                        >
                          {selectedPlayers.includes(player.id) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {selectedPlayers.includes(player.id) && (
                          <div 
                            className="absolute -inset-1 rounded-full animate-pulse"
                          style={{
                              backgroundColor: '#10B98115',
                              boxShadow: theme === 'dark'
                                ? `none`
                                : `0 0 10px #10B98125`
                            }}
                          ></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Player Avatar and Name */}
                  <div className="flex items-center mb-3 relative z-10">
                    <div className="relative">
                      {player.imageUrl ? (
                        <>
                          <img
                            src={player.imageUrl}
                            alt={player.name}
                            className={`w-12 h-12 sm:w-12 sm:h-12 rounded-full object-cover mr-3 border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}
                            style={{ borderColor: `${colorScheme.border}E6` }}
                            onError={(e) => {
                              console.error('❌ Player image failed to load:', player.imageUrl, 'for player:', player.name)
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div 
                            className={`w-12 h-12 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-white text-base sm:text-base mr-3 border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg hidden`}
                            style={{ 
                              background: `linear-gradient(135deg, ${colorScheme.primary}, ${colorScheme.primary}CC)`,
                              borderColor: `${colorScheme.border}E6`
                            }}
                          >
                            {player.name ? player.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
                          </div>
                        </>
                      ) : (
                        <div 
                            className={`w-12 h-12 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-white text-base sm:text-base mr-3 border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}
                          style={{ 
                              background: `linear-gradient(135deg, ${colorScheme.primary}, ${colorScheme.primary}CC)`,
                              borderColor: `${colorScheme.border}E6`
                          }}
                        >
                          {player.name ? player.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
                        </div>
                      )}
                      {/* Avatar Glow */}
                      <div 
                        className={`absolute inset-0 rounded-full transition-opacity duration-300 blur-md ${
                          selectedPlayers.includes(player.id) ? 'opacity-40' : 'opacity-0 group-hover:opacity-20'
                        }`}
                        style={{ backgroundColor: colorScheme.primary }}
                      ></div>
                  </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm sm:text-sm transition-all duration-200 group-hover:scale-105 ${
                          selectedPlayers.includes(player.id) ? 'text-opacity-100 scale-105' : 'group-hover:text-opacity-90'
                        }`} style={{ color: colorScheme.text }}>
                          {player.name}
                        </h3>
                        {playerAvailabilityPercentages[player.id] !== undefined && (
                          <span 
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{ 
                              color: getAvailabilityColor(playerAvailabilityPercentages[player.id]),
                              backgroundColor: `${getAvailabilityColor(playerAvailabilityPercentages[player.id])}15`
                            }}
                          >
                            {playerAvailabilityPercentages[player.id]}%
                          </span>
                        )}
                      </div>
                      {player.position && (
                        <p className={`text-xs sm:text-xs transition-all duration-200 group-hover:scale-105 ${
                          selectedPlayers.includes(player.id) ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100'
                        }`} style={{ color: colorScheme.textSecondary }}>
                          {player.position}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Availability Status - Only Admin can edit */}
                  <div className="mb-3 relative z-10">
                    <div className="relative">
                    {user && user.role === 'ADMIN' ? (
                      <select
                        value={player.availabilityStatus || player.status || 'ACTIVE'}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                                
                            // Check if status is not "Fully Available" and user is admin
                            if (newStatus !== 'FULLY_AVAILABLE' && newStatus !== 'Fully Available' && 
                                user && user.role === 'ADMIN') {
                              // Set selected player and show notes modal
                              setSelectedPlayer({ ...player, availabilityStatus: newStatus })
                              setShowPlayerNotesModal(true)
                              return
                            }
                            
                          try {
                            const response = await fetch(`/api/players/${player.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus })
                            })
                            
                            if (response.ok) {
                              const responseData = await response.json()
                              // Update local state with both status and availabilityStatus
                              setPlayers(prev => prev.map(p => 
                                p.id === player.id ? { 
                                  ...p, 
                                  status: newStatus,
                                  availabilityStatus: newStatus 
                                } : p
                              ))
                              console.log('✅ Status updated successfully:', responseData)
                              
                              // Dispatch custom event to refresh player lists in other components
                              window.dispatchEvent(new CustomEvent('playerStatusUpdated', { 
                                detail: { playerId: player.id, status: newStatus } 
                              }))
                            } else {
                              const errorData = await response.json()
                              console.error('Failed to update player status:', errorData)
                            }
                          } catch (error) {
                            console.error('Error updating player status:', error)
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs sm:text-xs rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 hover:scale-105 cursor-pointer appearance-none ${
                          selectedPlayers.includes(player.id) ? 'scale-105' : ''
                        }`}
                      style={{ 
                          backgroundColor: `${currentStatusOption.color}15`,
                        color: currentStatusOption.color,
                          borderColor: `${currentStatusOption.color}40`,
                          boxShadow: selectedPlayers.includes(player.id) 
                            ? `0 1px 4px ${currentStatusOption.color}25, 0 0 8px ${currentStatusOption.color}15`
                            : `0 1px 2px ${currentStatusOption.color}15`
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option 
                          key={option.value} 
                          value={option.value}
                          style={{ 
                            backgroundColor: colorScheme.surface,
                              color: colorScheme.text
                          }}
                        >
                          {option.label}
                        </option>
                      ))}
                        </select>
                      ) : (
                        // Read-only display for non-admin users
                        <div 
                          className={`w-full px-3 py-2 text-xs sm:text-xs rounded-lg border-2 transition-all duration-200 ${
                            selectedPlayers.includes(player.id) ? 'scale-105' : ''
                          }`}
                          style={{ 
                            backgroundColor: `${currentStatusOption.color}15`,
                            color: currentStatusOption.color,
                            borderColor: `${currentStatusOption.color}40`,
                            boxShadow: selectedPlayers.includes(player.id) 
                              ? `0 0 6px ${currentStatusOption.color}60, 0 0 10px ${currentStatusOption.color}30`
                              : `0 0 4px ${currentStatusOption.color}40`
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{currentStatusOption.label}</span>
                            <div 
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                selectedPlayers.includes(player.id) ? 'scale-110' : ''
                              }`}
                              style={{ 
                                backgroundColor: currentStatusOption.color,
                                boxShadow: selectedPlayers.includes(player.id) 
                                  ? `0 0 6px ${currentStatusOption.color}60, 0 0 10px ${currentStatusOption.color}30`
                                  : `0 0 4px ${currentStatusOption.color}40`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Match Day Tag - Only Admin can edit */}
                  <div className="relative z-10">
                    {user && user.role === 'ADMIN' ? (
                      <div className="relative">
                        <select
                          value={player.matchDayTag ?? ''}
                          onChange={(e) => handleSinglePlayerTagUpdate(player.id, e.target.value)}
                          className={`w-full px-3 py-2 text-xs sm:text-xs rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 hover:scale-105 cursor-pointer appearance-none ${
                            selectedPlayers.includes(player.id) ? 'scale-105' : ''
                          }`}
                          style={{ 
                            backgroundColor: colorScheme.surface,
                            color: colorScheme.text,
                            borderColor: colorScheme.border,
                            boxShadow: selectedPlayers.includes(player.id) 
                              ? `0 1px 4px ${colorScheme.border}25, 0 0 8px ${colorScheme.border}15`
                              : `0 1px 2px ${colorScheme.border}15`
                          }}
                        >
                          <option value="">No Tag</option>
                          {matchDayTagOptions.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                        {/* Tag Icon */}
                        <div 
                          className={`absolute right-1.5 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-200 group-hover:scale-110 ${
                            selectedPlayers.includes(player.id) ? 'scale-110 opacity-100' : 'opacity-50 group-hover:opacity-80'
                          }`}
                          style={{ 
                            backgroundColor: player.matchDayTag ? '#7C3AED' : colorScheme.textSecondary,
                            boxShadow: player.matchDayTag 
                              ? selectedPlayers.includes(player.id) 
                                ? `0 0 6px #7C3AED60, 0 0 10px #7C3AED30`
                                : `0 0 4px #7C3AED40`
                              : 'none'
                          }}
                        ></div>
                      </div>
                    ) : (
                      <div 
                        className={`px-3 py-2 text-xs sm:text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          selectedPlayers.includes(player.id) ? 'scale-105' : ''
                        }`} 
                        style={{ 
                          backgroundColor: `${colorScheme.background}50`,
                          color: colorScheme.textSecondary,
                          borderColor: colorScheme.border,
                          boxShadow: selectedPlayers.includes(player.id) 
                            ? `0 1px 4px ${colorScheme.border}25, 0 0 8px ${colorScheme.border}15`
                            : `0 1px 2px ${colorScheme.border}15`
                        }}
                      >
                        {player.matchDayTag ?? 'No Tag'}
                      </div>
                    )}
                  </div>

                  {/* Bottom Accent Line */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 ${
                      selectedPlayers.includes(player.id) ? 'opacity-100 h-1' : 'opacity-0 group-hover:opacity-60 h-0.5 group-hover:h-0.5'
                    }`}
                    style={{
                      background: `linear-gradient(90deg, ${colorScheme.primary}, ${colorScheme.primary}80, ${colorScheme.primary})`,
                      boxShadow: selectedPlayers.includes(player.id) 
                        ? `0 0 6px ${colorScheme.primary}40, 0 0 12px ${colorScheme.primary}25`
                        : `0 0 4px ${colorScheme.primary}25`
                    }}
                  ></div>
                </div>
              )
            })}
          </div>
        </div>
              </div>
            )
          },
          {
            id: 'event-analytics',
            shouldShow: user && ['ADMIN', 'COACH', 'STAFF'].includes(user.role) || false,
            element: (
              <div className="px-0 sm:px-6">
                <EventAnalytics userId={user?.id || ''} userRole={user?.role || 'PLAYER'} />
              </div>
            )
          },
          {
            id: 'calendar',
            shouldShow: true,
            element: (
              <div className="px-0 sm:px-6">
        <div className="card-fade-in w-full rounded-3xl shadow-xl p-0 sm:p-4 border-2 transition-all duration-300 overflow-hidden" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <h2 className="text-xl font-semibold mb-4 px-4 sm:px-0" style={{ color: colorScheme.text }}>
            Calendar
          </h2>
          <div className="w-full">
            <MobileCalendar 
              user={user} 
              staffPermissions={staffPermissions}
              showAddButtons={false}
            />
          </div>
        </div>
              </div>
            )
          }
        ]}
      />

      {/* Staff Notes Modal */}
      {showStaffNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
                 className="bg-white rounded-lg modal-depth max-w-2xl w-full max-h-[80vh] overflow-hidden"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Coach Notes
              </h2>
              <button
                onClick={() => setShowStaffNotesModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="smooth-scroll p-6 overflow-y-auto max-h-[60vh]">
              <StaffNotesList />
            </div>
          </div>
        </div>
      )}

      {/* Staff Reports Modal */}
      {showStaffReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
                 className="bg-white rounded-lg modal-depth max-w-2xl w-full max-h-[80vh] overflow-hidden"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Reports
              </h2>
              <button
                onClick={() => setShowStaffReportsModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="smooth-scroll p-6 overflow-y-auto max-h-[60vh]">
              <StaffReportsList />
            </div>
          </div>
        </div>
      )}

      {/* Player Status Notes Modal */}
      {showPlayerNotesModal && selectedPlayer && (
        <PlayerStatusNotesModal
          isOpen={showPlayerNotesModal}
          onClose={() => {
            setShowPlayerNotesModal(false)
            setSelectedPlayer(null)
          }}
          player={selectedPlayer}
          onSave={handleSavePlayerNotes}
          isLoading={isSavingNotes}
        />
      )}

      {/* Activity Feed Modal */}
      {showActivityFeedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
                 className="bg-white rounded-lg modal-depth max-w-4xl w-full max-h-[80vh] overflow-hidden"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Activity Feed
              </h2>
              <button
                onClick={() => setShowActivityFeedModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="smooth-scroll p-6 overflow-y-auto max-h-[60vh]">
              <ActivityFeed limit={50} showHeader={false} showViewAll={false} compact={false} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}