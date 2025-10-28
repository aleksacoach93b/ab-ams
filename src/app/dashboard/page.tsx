'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Users, TrendingUp, Clock, User, Activity, AlertTriangle, FileText, FolderOpen, Percent, StickyNote, X, Eye, Download, ArrowLeft, ArrowRight, FolderPlus, Upload, Pencil, Trash2, File as FileIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import MobileCalendar from '@/components/MobileCalendar'
import EventAnalytics from '@/components/EventAnalytics'
import PlayerStatusNotesModal from '@/components/PlayerStatusNotesModal'

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
    <div className="space-y-3">
      {notes.slice(0, 3).map((note) => (
        <div
          key={note.id}
          className="rounded-lg border p-3"
          style={{ 
            backgroundColor: colorScheme.background,
            borderColor: colorScheme.border
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 
              className="font-medium text-sm"
              style={{ color: colorScheme.text }}
            >
              {note.title}
            </h4>
            {note.isPinned && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                PINNED
              </span>
            )}
          </div>
          <div 
            className="text-xs mb-2 line-clamp-2"
            style={{ color: colorScheme.textSecondary }}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
          <div className="flex items-center justify-between">
            <span 
              className="text-xs"
              style={{ color: colorScheme.textSecondary }}
            >
              by {note.author.name || note.author.email}
            </span>
            <span 
              className="text-xs"
              style={{ color: colorScheme.textSecondary }}
            >
              {new Date(note.createdAt).toLocaleDateString()}
            </span>
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

  useEffect(() => {
    fetchStaffReports()
  }, [])

  const fetchStaffReports = async (folderId: string | null = null) => {
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
      }
    } catch (error) {
      console.error('Error fetching staff reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateToFolder = (folder: any) => {
    const newPath = [...currentPath, folder]
    setCurrentPath(newPath)
    setSelectedFolder(folder)
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
      {folders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
            Folders
          </h3>
          {folders.slice(0, 3).map((folder) => (
            <div 
              key={folder.id}
              className="rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
              style={{ 
                backgroundColor: colorScheme.background,
                borderColor: colorScheme.border
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
      {reports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
            Reports
          </h3>
          {reports.slice(0, 3).map((report) => (
            <div
              key={report.id}
              className="rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
              style={{ 
                backgroundColor: colorScheme.background,
                borderColor: colorScheme.border
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
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [staffPermissions, setStaffPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showStaffNotesModal, setShowStaffNotesModal] = useState(false)
  const [showStaffReportsModal, setShowStaffReportsModal] = useState(false)
  const [showPlayerNotesModal, setShowPlayerNotesModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  // Match Day Tag bulk operations state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isUpdatingTags, setIsUpdatingTags] = useState(false)
  const [lastClickTime, setLastClickTime] = useState<{ [key: string]: number }>({})


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

  const handleSavePlayerNotes = async (data: { reason: string; notes: string }) => {
    if (!selectedPlayer || !user) return

    setIsSavingNotes(true)
    try {
      // First update player status in database
      const statusResponse = await fetch(`/api/players/${selectedPlayer.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedPlayer.availabilityStatus })
      })

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json()
        console.error('Failed to update player status:', errorData)
        alert(`Failed to update player status: ${errorData.message}`)
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
        
        setShowPlayerNotesModal(false)
        setSelectedPlayer(null)
      } else {
        const errorData = await notesResponse.json()
        console.error('Failed to save player notes:', errorData)
        alert(`Failed to save notes: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error saving player notes:', error)
      alert('An error occurred while saving notes.')
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
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
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
        alert(`Failed to update tags: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('An error occurred while updating tags.')
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
        alert(`Failed to update tag: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      alert('An error occurred while updating tag.')
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: colorScheme.primary }} />
          <p style={{ color: colorScheme.text }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-0 sm:p-4 space-y-2 sm:space-y-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="text-center px-0 sm:px-6">
        <div className="relative inline-block group">
          {/* Animated background particles */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-2 h-2 rounded-full animate-ping opacity-60" 
              style={{ backgroundColor: colorScheme.primary, animationDelay: '0s' }}
            ></div>
            <div 
              className="absolute top-2 right-4 w-1 h-1 rounded-full animate-ping opacity-40" 
              style={{ backgroundColor: colorScheme.primary, animationDelay: '1s' }}
            ></div>
            <div 
              className="absolute bottom-2 left-4 w-1.5 h-1.5 rounded-full animate-ping opacity-50" 
              style={{ backgroundColor: colorScheme.primary, animationDelay: '2s' }}
            ></div>
            <div 
              className="absolute bottom-0 right-2 w-1 h-1 rounded-full animate-ping opacity-30" 
              style={{ backgroundColor: colorScheme.primary, animationDelay: '0.5s' }}
            ></div>
          </div>
          
          <div 
            className="relative px-6 py-4 rounded-2xl shadow-lg border backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
            style={{ 
              backgroundColor: `${colorScheme.primary}15`,
              borderColor: `${colorScheme.primary}30`,
              boxShadow: `0 8px 32px ${colorScheme.primary}20`
            }}
          >
            <h1 
              className="text-2xl font-bold mb-1 transition-all duration-300"
              style={{ 
                color: colorScheme.text,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                textShadow: `0 0 20px ${colorScheme.primary}40`
              }}
            >
              <span 
                className="inline-block hover:scale-110 transition-transform duration-300"
                style={{ color: colorScheme.primary }}
              >
                AB
              </span> Athlete Management System
            </h1>
            <p 
              className="text-sm opacity-80 transition-all duration-300 group-hover:opacity-100"
              style={{ 
                color: colorScheme.textSecondary, 
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Dashboard Overview
            </p>
            
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-10 group-hover:animate-pulse"
              style={{ color: colorScheme.primary }}
            ></div>
          </div>
          
          {/* Enhanced glow effect */}
          <div 
            className="absolute inset-0 rounded-2xl blur-xl opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:blur-2xl"
            style={{ backgroundColor: colorScheme.primary }}
          ></div>
          
          {/* Outer ring effect */}
          <div 
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-30 transition-all duration-500"
            style={{ 
              backgroundImage: `linear-gradient(45deg, ${colorScheme.primary}, ${colorScheme.primary}80, ${colorScheme.primary}60, ${colorScheme.primary})`,
              backgroundSize: '400% 400%',
              animation: 'gradient 3s ease infinite'
            }}
          ></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 px-0 sm:px-6">
        <div className="p-6 rounded-lg border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="flex items-center">
            <Users className="h-8 w-8 mr-3" style={{ color: colorScheme.primary }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Players</p>
              <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{totalPlayers}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 mr-3" style={{ color: '#10B981' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Active Players</p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{activePlayers}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 mr-3" style={{ color: '#EF4444' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Unavailable Players</p>
              <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{notAvailablePlayers}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="flex items-center">
            <Percent className="h-8 w-8 mr-3" style={{ color: getAvailabilityColor(availabilityPercentage) }} />
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Daily Availability</p>
              <p className="text-2xl font-bold" style={{ color: getAvailabilityColor(availabilityPercentage) }}>{availabilityPercentage}%</p>
              <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                {activePlayers} of {totalPlayers} players fully available
              </p>
            </div>
          </div>
        </div>

        {/* Reports Card - Only visible to Coaches, Admins, and Staff with permission (NEVER to players) */}
        {user?.role !== 'PLAYER' && ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) && (
          <div 
            className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
            onClick={() => {
              if (user?.role === 'STAFF') {
                // For staff, show a modal with their assigned reports
                setShowStaffReportsModal(true)
              } else {
                // For coaches/admins, go to the full reports page
                window.location.href = '/dashboard/reports'
              }
            }}
          >
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 mr-3" style={{ color: '#7C3AED' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Reports</p>
                <p className="text-2xl font-bold" style={{ color: '#7C3AED' }}>&nbsp;</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes Card - Only visible to Coaches, Admins, and Staff with permission (NEVER to players) */}
        {user?.role !== 'PLAYER' && ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) && (
          <div 
            className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
            onClick={() => {
              if (user?.role === 'STAFF') {
                // For staff, show a modal with their assigned notes
                setShowStaffNotesModal(true)
              } else {
                // For coaches/admins, go to the full notes page
                window.location.href = '/dashboard/notes'
              }
            }}
          >
            <div className="flex items-center">
              <StickyNote className="h-8 w-8 mr-3" style={{ color: '#F59E0B' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Notes</p>
                <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>&nbsp;</p>
              </div>
            </div>
          </div>
        )}

        {/* Player Reports Card - Only visible to Coaches and Admins */}
        {(user?.role === 'COACH' || user?.role === 'ADMIN') && (
          <div 
            className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
            onClick={() => {
              window.location.href = '/dashboard/player-reports'
            }}
          >
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 mr-3" style={{ color: '#10B981' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Player Reports</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>&nbsp;</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Players Section */}
      <div className="px-0 sm:px-6">
        <div className="rounded-lg border p-6" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
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
                  className={`player-card group relative rounded-lg border-2 p-4 sm:p-4 transition-all duration-300 hover:scale-105 cursor-pointer ${
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
                      : currentStatusOption.color,  // Always use availability status color
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
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className={`w-12 h-12 sm:w-12 sm:h-12 rounded-full object-cover mr-3 ring-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg ${
                            selectedPlayers.includes(player.id) ? 'ring-opacity-50' : 'ring-opacity-15 group-hover:ring-opacity-30'
                          }`}
                          style={{ ringColor: colorScheme.primary }}
                        />
                    ) : (
                      <div 
                          className={`w-12 h-12 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-white text-base sm:text-base mr-3 ring-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg ${
                            selectedPlayers.includes(player.id) ? 'ring-opacity-50' : 'ring-opacity-15 group-hover:ring-opacity-30'
                          }`}
                        style={{ 
                            background: `linear-gradient(135deg, ${colorScheme.primary}, ${colorScheme.primary}CC)`,
                            ringColor: colorScheme.primary
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
                      <h3 className={`text-sm sm:text-sm mb-1 transition-all duration-200 group-hover:scale-105 ${
                        selectedPlayers.includes(player.id) ? 'text-opacity-100 scale-105' : 'group-hover:text-opacity-90'
                      }`} style={{ color: colorScheme.text }}>
                    {player.name}
                  </h3>
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
                              // Update local state
                              setPlayers(prev => prev.map(p => 
                                p.id === player.id ? { ...p, availabilityStatus: newStatus } : p
                              ))
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

      {/* Event Analytics - Only for Admin and Staff */}
      {user && ['ADMIN', 'COACH', 'STAFF'].includes(user.role) && (
        <div className="px-0 sm:px-6">
          <EventAnalytics userId={user.id} userRole={user.role} />
        </div>
      )}

      {/* Calendar - Read Only */}
      <div className="px-0 sm:px-6">
        <div className="w-full rounded-3xl shadow-xl p-4 border-2 transition-all duration-300 hover:shadow-2xl" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: colorScheme.text }}>
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

      {/* Staff Notes Modal */}
      {showStaffNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
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
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <StaffNotesList />
            </div>
          </div>
        </div>
      )}

      {/* Staff Reports Modal */}
      {showStaffReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
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
            <div className="p-6 overflow-y-auto max-h-[60vh]">
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

    </div>
  )
}