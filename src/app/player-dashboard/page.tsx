'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, User, LogOut, Clock, MapPin, ArrowLeft, Folder, FileText, Image, File, Eye, Palette, Heart, ExternalLink, Activity, MessageCircle, Bell, Check } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import ReadOnlyCalendar from '@/components/ReadOnlyCalendar'
import TeamChat from '@/components/TeamChat'
import RealTimeNotifications from '@/components/RealTimeNotifications'
import ChatNotifications from '@/components/ChatNotifications'
import PDFThumbnail from '@/components/PDFThumbnail'

interface Event {
  id: string
  title: string
  description?: string
  type: string
  startTime: string
  endTime: string
  color: string
  icon?: string
}

interface MediaFile {
  id: string
  name: string // Database field name
  fileName?: string // For compatibility
  type: string // Database field name
  fileType?: string // For compatibility
  mimeType?: string
  size?: number
  fileSize?: number // For compatibility
  uploadedAt: string
  description?: string
  url: string
  thumbnailUrl?: string
}

interface PlayerNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  author: {
  name: string
  }
}

export default function PlayerDashboard() {
  const router = useRouter()
  const { colorScheme, theme, setTheme } = useTheme()
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [playerNotes, setPlayerNotes] = useState<PlayerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'dashboard' | 'media' | 'notes'>('dashboard')
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [wellnessCompletedToday, setWellnessCompletedToday] = useState<boolean | null>(null)
  const [isCheckingWellness, setIsCheckingWellness] = useState(false)
  const [showTeamChat, setShowTeamChat] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [wellnessSettings, setWellnessSettings] = useState<{
    csvUrl: string
    surveyId: string
    baseUrl: string
  } | null>(null)

  const themes = [
    { name: 'Light', value: 'light', color: '#F8FAFC' },
    { name: 'Dark', value: 'dark', color: '#0F172A' },
    { name: 'Blue', value: 'blue', color: '#05E6E2' },
    { name: 'Green', value: 'green', color: '#26E624' },
    { name: 'Purple', value: 'purple', color: '#6B21A8' },
    { name: 'Red', value: 'red', color: '#DC2626' },
  ]

  // Redirect if not authenticated or not a player
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    } else if (!isLoading && user && user.role !== 'PLAYER') {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (user?.role === 'PLAYER') {
      fetchPlayerData()
      fetchWellnessSettings()
    }
  }, [user])

  // Check wellness survey completion
  useEffect(() => {
    if (currentPlayer) {
      checkWellnessSurveyCompletion()
    }
  }, [currentPlayer])

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
        console.log('✅ Wellness settings loaded:', data.wellnessSettings)
        setWellnessSettings(data.wellnessSettings)
      } else {
        console.error('❌ Failed to fetch wellness settings:', response.status, response.statusText)
        // Set default settings if fetch fails
        setWellnessSettings({
          csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
          surveyId: 'cmg6klyig0004l704u1kd78zb',
          baseUrl: 'https://wellness-monitor-tan.vercel.app'
        })
      }
    } catch (error) {
      console.error('❌ Error fetching wellness settings:', error)
      // Set default settings if fetch fails
      setWellnessSettings({
        csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
        surveyId: 'cmg6klyig0004l704u1kd78zb',
        baseUrl: 'https://wellness-monitor-tan.vercel.app'
      })
    }
  }


  const fetchPlayerData = async () => {
    try {
      // Fetch events filtered by user participation
      const eventsResponse = await fetch(`/api/events?userId=${user?.id}&userRole=${user?.role}`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setEvents(eventsData)
      }

      // Fetch player's media files and notes
      // First get the player data to get the player ID
      const playerResponse = await fetch('/api/players')
      if (playerResponse.ok) {
        const playersData = await playerResponse.json()
        const foundPlayer = playersData.find((player: any) => 
          player.email === user?.email
        )
        
        console.log('Players data:', playersData)
        console.log('User email:', user?.email)
        console.log('Found player:', foundPlayer)
        
        if (foundPlayer) {
          setCurrentPlayer(foundPlayer)
          
          // Get authentication token
          const token = localStorage.getItem('token')
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
          
          // Fetch player's media files
          const mediaResponse = await fetch(`/api/players/${foundPlayer.id}/media`, {
            headers
          })
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json()
            console.log('📁 Player dashboard - Fetched media data:', mediaData)
            
            // Transform API response to match frontend expectations
            const transformedMediaData = mediaData.map((file: any) => ({
              id: file.id,
              name: file.fileName, // Map fileName to name
              fileName: file.fileName,
              type: file.fileType, // Map fileType to type
              fileType: file.fileType,
              mimeType: file.fileType,
              size: file.fileSize, // Map fileSize to size
              fileSize: file.fileSize,
              uploadedAt: file.uploadedAt,
              url: file.fileUrl, // Map fileUrl to url
              thumbnailUrl: file.thumbnailUrl,
              tags: file.tags
            }))
            
            console.log('📁 Player dashboard - Transformed media data:', transformedMediaData)
            setMediaFiles(transformedMediaData)
          } else {
            console.error('❌ Failed to fetch media files:', mediaResponse.status, mediaResponse.statusText)
          }

          // Fetch player's notes
          const notesResponse = await fetch(`/api/players/${foundPlayer.id}/notes`, {
            headers
          })
          if (notesResponse.ok) {
            const notesData = await notesResponse.json()
            setPlayerNotes(notesData)
          } else {
            console.error('❌ Failed to fetch notes:', notesResponse.status, notesResponse.statusText)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching player data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkWellnessSurveyCompletion = async () => {
    if (!currentPlayer) {
      console.log('⚠️ [WELLNESS] No currentPlayer, skipping wellness check')
      return
    }
    
    console.log('🔍 [WELLNESS] Starting wellness check for player:', currentPlayer.id, currentPlayer.name)
    setIsCheckingWellness(true)
    try {
      // Get authentication token
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('❌ [WELLNESS] No authentication token found')
        setWellnessCompletedToday(false)
        return
      }

      // Check wellness survey completion from our API
      console.log(`🔍 [WELLNESS] Fetching wellness status for player ${currentPlayer.id}`)
      const response = await fetch(`/api/wellness/status/${currentPlayer.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [WELLNESS] Wellness survey status received:', data)
        const isCompleted = data.completed || false
        console.log(`📊 [WELLNESS] Setting wellnessCompletedToday to: ${isCompleted}`)
        setWellnessCompletedToday(isCompleted)
      } else {
        console.error('❌ [WELLNESS] Failed to check wellness status:', response.status, response.statusText)
        setWellnessCompletedToday(false)
      }
    } catch (error) {
      console.error('❌ [WELLNESS] Error checking wellness survey completion:', error)
      setWellnessCompletedToday(false)
    } finally {
      setIsCheckingWellness(false)
      console.log('✅ [WELLNESS] Wellness check completed')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'PLAYER') {
    return null
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string | undefined | null, fileName?: string) => {
    // If fileType is available, use it
    if (fileType) {
      if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />
      if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />
      return <File className="h-5 w-5" />
    }
    
    // Fallback: use file extension from fileName
    if (fileName) {
      const extension = fileName.toLowerCase().split('.').pop()
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '')) {
        return <Image className="h-5 w-5" />
      }
      if (extension === 'pdf') {
        return <FileText className="h-5 w-5" />
      }
    }
    
    return <File className="h-5 w-5" />
  }


  const renderMediaView = () => {
    // Block access if wellness not completed
    if (wellnessCompletedToday === false) {
      return (
        <div className="space-y-6">
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-red-800">
              Wellness Survey Required
            </h3>
            <p className="text-sm text-red-600">
              Complete your daily wellness survey to access media files
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => setViewMode('dashboard')}
        className="flex items-center space-x-2 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: colorScheme.text }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
          </button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: colorScheme.text }}>
          📁 Your Media Files
        </h2>
        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
          {mediaFiles.length} files uploaded
        </p>
      </div>

      {/* Media Files Grid with Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mediaFiles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Folder className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: colorScheme.text }}>
              No media files yet
            </h3>
            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
              Media files uploaded by coaches will appear here
            </p>
          </div>
        ) : (
          mediaFiles.map((file) => {
            // Use correct field names from database
            const fileName = file.fileName || file.name
            const fileType = file.fileType || file.mimeType
            const fileSize = file.fileSize || file.size
            const fileUrl = file.url
            
            // Determine file type for preview
            const isImage = fileType?.startsWith('image/') || 
                           file.type === 'IMAGE' ||
                           (fileName && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileName.toLowerCase().split('.').pop() || ''))
            
            const isPDF = fileType === 'application/pdf' || 
                         file.type === 'DOCUMENT' ||
                         (fileName && fileName.toLowerCase().endsWith('.pdf'))
            
            
            return (
              <div
                key={file.id}
                className="group"
              >
                {/* File Preview Card */}
                <div
                  className="relative overflow-hidden rounded-2xl border border-gray-200 transition-all duration-300 hover:scale-[1.02] hover:border-gray-300"
              style={{ 
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border
              }}
            >
                  {/* Preview Area */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-white">
                    {isImage ? (
                      <>
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('❌ Image failed to load:', fileUrl)
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', fileUrl)
                          }}
                        />
                        {/* Fallback for failed images */}
                        <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center">
                            <Image className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-xs text-gray-600">Image Preview Failed</p>
                            <p className="text-xs text-gray-500 mt-1">{fileName}</p>
                          </div>
                  </div>
                      </>
                    ) : isPDF ? (
                      <div className="w-full h-full relative">
                        <PDFThumbnail
                          pdfUrl={fileUrl}
                          fileName={fileName}
                          className="w-full h-full"
                          onLoad={() => console.log('✅ PDF thumbnail loaded successfully for:', fileName)}
                          onError={() => console.error('❌ PDF thumbnail failed to load for:', fileName)}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          {getFileIcon(fileType, fileName)}
                          <p className="text-xs font-medium mt-2 text-gray-800">
                            {fileType?.split('/')[1]?.toUpperCase() || file.type || 'File'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{fileName}</p>
                          </div>
                          </div>
                        )}

                    {/* Action Buttons - Always visible on mobile */}
                    <div className="absolute top-3 right-3 flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 sm:translate-y-1 sm:group-hover:translate-y-0">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 sm:p-2 rounded-lg transition-all duration-200 border hover:scale-110 shadow-sm"
                        style={{ 
                          borderColor: colorScheme.border,
                          backgroundColor: colorScheme.surface,
                          color: colorScheme.primary
                        }}
                        title="View PDF"
                      >
                        <Eye className="h-4 w-4 sm:h-4 sm:w-4" />
                      </a>
                      <a
                        href={fileUrl}
                        download={fileName}
                        className="p-2 sm:p-2 rounded-lg transition-all duration-200 border border-gray-200 bg-white/95 text-green-600 hover:bg-green-50 hover:scale-110 shadow-sm"
                        title="Download PDF"
                      >
                        <ExternalLink className="h-4 w-4 sm:h-4 sm:w-4" />
                      </a>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="p-5 bg-gradient-to-b from-transparent to-gray-50/50">
                    <h4 className="font-bold text-sm truncate mb-2 text-gray-800" style={{ color: colorScheme.text }}>
                      {fileName}
                    </h4>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span 
                        className="px-2 py-1 rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${colorScheme.primary}20`,
                          color: colorScheme.primary
                        }}
                      >
                        {fileSize ? formatFileSize(fileSize) : 'Unknown size'}
                      </span>
                      <span className="text-gray-500" style={{ color: colorScheme.textSecondary }}>
                        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                    {file.description && (
                      <p className="text-xs truncate text-gray-600 italic" style={{ color: colorScheme.textSecondary }}>
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
    )
  }

  const renderNotesView = () => {
    // Block access if wellness not completed
    if (wellnessCompletedToday === false) {
      return (
        <div className="space-y-6">
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-red-800">
              Wellness Survey Required
            </h3>
            <p className="text-sm text-red-600">
              Complete your daily wellness survey to access notes
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => setViewMode('dashboard')}
        className="flex items-center space-x-2 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: colorScheme.text }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: colorScheme.text }}>
          📝 Your Notes
        </h2>
        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
          {playerNotes.length} notes from coaches
        </p>
            </div>

      {/* Notes List */}
      <div className="space-y-4">
        {playerNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: colorScheme.text }}>
              No notes yet
            </h3>
            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
              Notes from coaches will appear here
            </p>
          </div>
        ) : (
          playerNotes.map((note) => (
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
                  {/* Date */}
                  <div className="flex-shrink-0 text-right">
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
                  className="text-sm sm:text-base prose prose-sm sm:prose-base max-w-none note-content"
                  style={{ color: colorScheme.textSecondary }}
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: colorScheme.background,
        background: colorScheme.background,
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0
      }}
    >
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: colorScheme.surface }}>
        {/* Player Name - Top Row */}
        <div className="flex items-center justify-center px-4 py-3">
          <div className="flex items-center space-x-3">
            {currentPlayer?.imageUrl ? (
              <img
                src={currentPlayer.imageUrl}
                alt={currentPlayer?.name || 'Player'}
                className="w-8 h-8 rounded-full object-cover border-2"
                style={{ borderColor: colorScheme.border }}
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white border-2 text-sm"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  borderColor: colorScheme.border
                }}
              >
                {currentPlayer?.name ? currentPlayer.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: colorScheme.text }}>
                {currentPlayer?.name || 'Player'}
              </p>
              <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                Player
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons - Bottom Row */}
        <div className="flex items-center justify-center space-x-4 px-4 py-3 border-t" style={{ borderColor: colorScheme.border }}>
          {/* Theme Selector - Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="p-2 rounded-md transition-colors hover:scale-105"
              style={{ 
                backgroundColor: 'transparent',
                color: colorScheme.text,
              }}
              title="Change Theme"
            >
              <Palette className="h-5 w-5" style={{ color: colorScheme.text }} />
            </button>

            {showThemeDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowThemeDropdown(false)}
                />
                
                {/* Theme selector - Fixed positioning on mobile */}
                <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-auto sm:mt-2 w-56 sm:w-48 rounded-lg shadow-lg border z-20"
                     style={{ 
                       backgroundColor: colorScheme.surface,
                       borderColor: colorScheme.border,
                       maxWidth: 'calc(100vw - 2rem)' // Prevent overflow on mobile
                     }}>
                  <div className="p-2">
                    <div className="px-3 py-2 text-sm font-medium border-b"
                         style={{ 
                           color: colorScheme.textSecondary,
                           borderColor: colorScheme.border 
                         }}>
                      Choose Theme
                    </div>
                    
                    <div className="py-1">
                      {themes.map((themeOption) => (
                        <button
                          key={themeOption.value}
                          onClick={() => {
                            setTheme(themeOption.value as any)
                            setShowThemeDropdown(false)
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors hover:bg-opacity-20"
                          style={{ 
                            color: colorScheme.text,
                            backgroundColor: theme === themeOption.value ? colorScheme.primary : 'transparent'
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full border-2"
                              style={{ 
                                backgroundColor: themeOption.color,
                                borderColor: colorScheme.border
                              }}
                            />
                            <span>{themeOption.name}</span>
                          </div>
                          {theme === themeOption.value && (
                            <Check className="h-4 w-4" style={{ color: colorScheme.text }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chat Button with Notifications */}
          <ChatNotifications onOpenChat={() => setShowTeamChat(true)} />

          {/* Notifications - Like admin */}
          <div className="p-2 rounded-md transition-colors hover:scale-105">
            <RealTimeNotifications />
          </div>
          
          <button
            onClick={logout}
            className="p-2 rounded-md transition-colors hover:scale-105"
            style={{ 
              backgroundColor: 'transparent',
              color: colorScheme.text,
            }}
            title="Logout"
          >
            <LogOut className="h-5 w-5" style={{ color: colorScheme.text }} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Render different views based on viewMode */}
        {viewMode === 'media' ? renderMediaView() : viewMode === 'notes' ? renderNotesView() : (
          <>
            {/* Welcome Section */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold" style={{ color: colorScheme.text }}>
                Welcome back, {currentPlayer?.name?.split(' ')[0] || 'Player'}! 👋
              </h2>
            </div>

            {/* Wellness Survey Required Alert - BLOCKS ACCESS */}
            {wellnessCompletedToday === false && (
              <div 
                className="mb-6 p-6 rounded-2xl border-2"
                style={{ 
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FCA5A5'
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-red-100">
                    <Heart className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-800 mb-1">
                      Daily Wellness Survey Required
                    </h3>
                    <p className="text-red-700 mb-3">
                      You must complete your daily wellness survey to access your dashboard and schedule.
                    </p>
                    <button
                      onClick={async () => {
                        console.log('Wellness card clicked!')
                        console.log('Current player:', currentPlayer)
                        
                        if (!currentPlayer || !currentPlayer.id) {
                          console.log('No current player found')
                          alert('Player information not found. Please try again.')
                          return
                        }
                        
                        // Get wellness settings (use defaults if not loaded)
                        const settings = wellnessSettings || {
                          csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
                          surveyId: 'cmg6klyig0004l704u1kd78zb',
                          baseUrl: 'https://wellness-monitor-tan.vercel.app'
                        }
                        
                        if (!settings.baseUrl || !settings.surveyId) {
                          alert('Wellness settings are incomplete. Please contact administrator.')
                          console.error('❌ Wellness settings incomplete:', settings)
                          return
                        }
                        
                        const wellnessUrl = `${settings.baseUrl}/kiosk/${settings.surveyId}`
                        console.log('🔗 Opening wellness kiosk URL:', wellnessUrl)
                        
                        // Open wellness app in new tab
                        const wellnessWindow = window.open(wellnessUrl, '_blank')
                        
                        if (!wellnessWindow) {
                          alert('Popup blocked. Please allow popups for this site and try again.')
                          return
                        }
                        
                        // Set up periodic checking for survey completion
                        const checkCompletion = setInterval(async () => {
                          if (wellnessWindow?.closed) {
                            clearInterval(checkCompletion)
                            console.log('Wellness app closed, checking for completion...')
                            // Re-check wellness survey completion
                            await checkWellnessSurveyCompletion()
                          }
                        }, 2000) // Check every 2 seconds
                        
                        // Clear interval after 10 minutes to avoid infinite checking
                        setTimeout(() => clearInterval(checkCompletion), 10 * 60 * 1000)
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      Complete Wellness Survey
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Wellness Survey Completed Success - Compact */}
            {wellnessCompletedToday === true && (
              <div 
                className="mb-4 p-3 rounded-lg border"
                style={{ 
                  backgroundColor: '#F0FDF4',
                  borderColor: '#86EFAC'
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <Heart className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-800">
                      ✅ Wellness Completed
                    </h3>
                    <p className="text-xs text-green-700">
                      Full dashboard access unlocked
                    </p>
                  </div>
                </div>
              </div>
            )}

                
            {/* Modern Media, Notes, Wellness, RPE, and Reports Cards - Only show if wellness completed or still checking */}
            {(wellnessCompletedToday === true || wellnessCompletedToday === null) && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6">
              {/* Media Card */}
              <button
                onClick={() => setViewMode('media')}
                className="group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] h-full flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.border}E6`
                }}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                  <div 
                    className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: '#DCFCE7' }}
                  >
                    <Folder className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" style={{ color: '#059669' }} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-0.5 sm:mb-1 md:mb-2" style={{ color: '#059669' }}>
                      Media
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#059669' }}>
                      View Media
                    </p>
                  </div>
                </div>
              </button>

              {/* Notes Card */}
              <button
                onClick={() => setViewMode('notes')}
                className="group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] h-full flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.border}E6`
                }}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                  <div 
                    className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: '#EDE9FE' }}
                  >
                    <FileText className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" style={{ color: '#7C3AED' }} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-0.5 sm:mb-1 md:mb-2" style={{ color: '#7C3AED' }}>
                      Notes
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#7C3AED' }}>
                      View Notes
                    </p>
                  </div>
                </div>
              </button>

              {/* Wellness App Card */}
              <button
                onClick={async () => {
                  console.log('Wellness card clicked!')
                  console.log('Current player:', currentPlayer)
                  console.log('User email:', user?.email)
                  
                  if (!currentPlayer || !currentPlayer.id) {
                    console.log('No current player found')
                    alert('Player information not found. Please try again.')
                    return
                  }
                  
                  // Get wellness settings (use defaults if not loaded)
                  const settings = wellnessSettings || {
                    csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
                    surveyId: 'cmg6klyig0004l704u1kd78zb',
                    baseUrl: 'https://wellness-monitor-tan.vercel.app'
                  }
                  
                  if (!settings.baseUrl || !settings.surveyId) {
                    alert('Wellness settings are incomplete. Please contact administrator.')
                    console.error('❌ Wellness settings incomplete:', settings)
                    return
                  }
                  
                  const wellnessUrl = `${settings.baseUrl}/kiosk/${settings.surveyId}`
                  console.log('AB AMS Player ID:', currentPlayer.id)
                  console.log('Wellness Survey ID:', settings.surveyId)
                  console.log('🔗 Opening wellness kiosk URL:', wellnessUrl)
                  
                  // Open wellness app in new tab
                  const wellnessWindow = window.open(wellnessUrl, '_blank')
                  
                  if (!wellnessWindow) {
                    alert('Popup blocked. Please allow popups for this site and try again.')
                    return
                  }
                  
                  // Set up periodic checking for survey completion
                  const checkCompletion = setInterval(async () => {
                    if (wellnessWindow?.closed) {
                      clearInterval(checkCompletion)
                      console.log('Wellness app closed, checking for completion...')
                      // Re-check wellness survey completion
                      await checkWellnessSurveyCompletion()
                    }
                  }, 2000) // Check every 2 seconds
                  
                  // Clear interval after 10 minutes to avoid infinite checking
                  setTimeout(() => clearInterval(checkCompletion), 10 * 60 * 1000)
                }}
                className="group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.border}E6`
                }}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                  <div 
                    className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: '#FEE2E2' }}
                  >
                    <Heart className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" style={{ color: '#EF4444' }} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-0.5 sm:mb-1 md:mb-2" style={{ color: '#EF4444' }}>
                      Wellness
                    </h3>
                    {wellnessCompletedToday === true ? (
                      <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#059669' }}>
                        ✅ Done
                      </p>
                    ) : wellnessCompletedToday === false ? (
                      <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#EF4444' }}>
                        ⚠️ Required
                      </p>
                    ) : (
                      <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#EF4444' }}>
                        {isCheckingWellness ? 'Checking...' : 'Survey'}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* RPE Survey Card */}
              <button
                onClick={async () => {
                  console.log('RPE card clicked!')
                  console.log('Current player:', currentPlayer)
                  
                  if (!currentPlayer || !currentPlayer.id) {
                    console.log('No current player found')
                    alert('Player information not found. Please try again.')
                    return
                  }
                  
                  // Use the same RPE survey ID for all players
                  // This ensures all players (existing and future) use the correct RPE survey
                  const rpePlayerId = 'cmg6z9rm30000ky04wzz9gym5'
                  
                  // For RPE survey, we'll directly open it without completion check for now
                  // You can add RPE completion check later if needed
                  
                  const rpeUrl = `https://wellness-monitor-tan.vercel.app/kiosk/${rpePlayerId}`
                  console.log('AB AMS Player ID:', currentPlayer.id)
                  console.log('RPE Player ID:', rpePlayerId)
                  console.log('Opening RPE kiosk URL:', rpeUrl)
                  
                  // Open RPE survey in new tab
                  window.open(rpeUrl, '_blank')
                }}
                className="group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.border}E6`
                }}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                  <div 
                    className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: '#FEF3C7' }}
                  >
                    <Activity className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" style={{ color: '#D97706' }} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-0.5 sm:mb-1 md:mb-2" style={{ color: '#D97706' }}>
                      RPE
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#D97706' }}>
                      Survey
                    </p>
                  </div>
                </div>
              </button>

              {/* Players Reports Card */}
              <button
                onClick={() => {
                  console.log('Players Reports clicked')
                  router.push('/player-dashboard/reports')
                }}
                className="group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.border}E6`
                }}
              >
                <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                  <div 
                    className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
                    style={{ backgroundColor: '#E0E7FF' }}
                  >
                    <File className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" style={{ color: '#4F46E5' }} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-0.5 sm:mb-1 md:mb-2" style={{ color: '#4F46E5' }}>
                      Reports
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-tight" style={{ color: '#4F46E5' }}>
                      View Reports
                    </p>
                  </div>
                </div>
              </button>
              </div>
            )}

        {/* Modern Calendar Section - Only show if wellness completed or still checking */}
        {(wellnessCompletedToday === true || wellnessCompletedToday === null) && (
          <div className="px-0 sm:px-6 mb-6">
            <div className="w-full rounded-3xl shadow-xl p-0 sm:p-4 border-2 transition-all duration-300 hover:shadow-2xl overflow-hidden" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold mb-4 px-4 sm:px-0" style={{ color: colorScheme.text }}>
                Calendar
              </h2>
              <div className="w-full">
                <ReadOnlyCalendar userId={user?.id} userRole={user?.role} />
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
      
      
      {/* Team Chat Modal */}
      <TeamChat 
        isOpen={showTeamChat} 
        onClose={() => setShowTeamChat(false)} 
      />
    </div>
  )
}