'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Users, TrendingUp, Clock, User, Activity, AlertTriangle, FileText, FolderOpen, Percent, StickyNote, X, Eye, Download, ArrowLeft, ArrowRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import MobileCalendar from '@/components/MobileCalendar'
import EventAnalytics from '@/components/EventAnalytics'

interface Player {
  id: string
  name: string
  email?: string
  position?: string
  status?: string
  availabilityStatus?: string
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
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [staffPermissions, setStaffPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showStaffNotesModal, setShowStaffNotesModal] = useState(false)
  const [showStaffReportsModal, setShowStaffReportsModal] = useState(false)


  useEffect(() => {
    fetchPlayers()
    fetchEvents()
    fetchStaffPermissions()
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

      </div>

      {/* Players Section */}
      <div className="px-0 sm:px-6">
        <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
              Players Overview
            </h2>
            <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
              {totalPlayers} players
            </span>
          </div>
          
          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
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
              
              return (
                <div 
                  key={player.id} 
                  className="rounded-xl border p-4 transition-all duration-300 hover:scale-105 hover:-translate-y-2 min-w-0 flex flex-col items-center cursor-pointer relative overflow-hidden"
                  style={{ 
                    backgroundColor: colorScheme.background, 
                    borderColor: colorScheme.border,
                    boxShadow: `0 8px 25px ${colorScheme.border}25, 0 4px 8px ${colorScheme.border}15, 0 2px 4px ${colorScheme.border}10`,
                    minHeight: '140px',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 12px 35px ${colorScheme.border}35, 0 6px 12px ${colorScheme.border}20, 0 3px 6px ${colorScheme.border}15`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 8px 25px ${colorScheme.border}25, 0 4px 8px ${colorScheme.border}15, 0 2px 4px ${colorScheme.border}10`
                  }}
                >
                  {/* Subtle gradient overlay */}
                  <div 
                    className="absolute inset-0 opacity-5 transition-opacity duration-300 hover:opacity-10"
                    style={{
                      background: `linear-gradient(135deg, ${colorScheme.primary}20, transparent 50%)`
                    }}
                  />
                  {/* Avatar */}
                  <div className="flex justify-center mb-3 relative z-10">
                    {player.imageUrl ? (
                      <div className="relative">
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-16 h-16 rounded-full object-cover border-2 transition-all duration-300 hover:scale-110 hover:shadow-lg"
                          style={{ 
                            borderColor: colorScheme.border,
                            boxShadow: `0 4px 8px ${colorScheme.border}20, 0 0 0 3px ${colorScheme.primary}20`
                          }}
                        />
                        <div 
                          className="absolute inset-0 rounded-full transition-all duration-300 hover:shadow-lg"
                          style={{
                            boxShadow: `0 0 20px ${currentStatusOption.color}30`,
                            opacity: '0.6'
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-white border-2 text-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        style={{ 
                          backgroundColor: colorScheme.primary,
                          borderColor: colorScheme.border,
                          boxShadow: `0 4px 8px ${colorScheme.border}20, 0 0 0 3px ${colorScheme.primary}20`
                        }}
                      >
                        {player.name ? player.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
                      </div>
                    )}
                  </div>
                  
                  {/* Player Name */}
                  <h3 className="text-center font-semibold mb-3 text-sm truncate px-1 w-full transition-all duration-300 hover:text-opacity-80 relative z-10" 
                      style={{ 
                        color: colorScheme.text,
                        textShadow: `0 1px 2px ${colorScheme.border}20`
                      }}>
                    {player.name}
                  </h3>
                  
                  {/* Status Dropdown */}
                  <div className="relative z-10">
                    <select
                      value={player.availabilityStatus || player.status || 'ACTIVE'}
                      onChange={async (e) => {
                        const newStatus = e.target.value
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
                      className="w-full px-2 py-1.5 text-xs font-medium rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none cursor-pointer text-center hover:scale-105 hover:shadow-md"
                      style={{ 
                        backgroundColor: currentStatusOption.color + '20',
                        color: currentStatusOption.color,
                        borderColor: currentStatusOption.color + '40',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: `0 2px 4px ${currentStatusOption.color}20, inset 0 1px 0 ${currentStatusOption.color}30`,
                        textShadow: `0 1px 1px ${currentStatusOption.color}40`
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
                  </div>
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

    </div>
  )
}