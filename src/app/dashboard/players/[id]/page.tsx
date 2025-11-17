'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, User, Upload, FileText, Image, Video, File, Trash2, Download, Eye, Search, Filter, Calendar, Grid, List, Plus, StickyNote, Edit, Pin, MessageCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import RichTextEditor from '@/components/RichTextEditor'
import PDFThumbnail from '@/components/PDFThumbnail'
import ReadOnlyCalendar from '@/components/ReadOnlyCalendar'

interface Player {
  id: string
  firstName: string
  lastName: string
  position: string
  dateOfBirth: string
  height: string
  weight: string
  status: string
  team: string
  avatar: string | null
  email: string
}

interface MediaFile {
  id: string
  name: string
  fileName?: string // For backward compatibility
  mimeType: string
  fileType?: string // For backward compatibility
  size: number
  fileSize?: number // For backward compatibility
  uploadedAt: string
  uploadDate?: string // For backward compatibility
  url: string
  thumbnail?: string
  thumbnailUrl?: string
  tags?: string[]
}

interface PlayerNote {
  id: string
  title?: string
  content: string
  isVisibleToPlayer: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
  }
}

export default function PlayerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { colorScheme, theme } = useTheme()
  const { user } = useAuth()
  const [player, setPlayer] = useState<Player | null>(null)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'media' | 'notes' | 'chats' | 'events'>('media')
  const [showNewNote, setShowNewNote] = useState(false)
  const [editingNote, setEditingNote] = useState<PlayerNote | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingMediaTags, setEditingMediaTags] = useState<MediaFile | null>(null)
  const [selectedUploadTags, setSelectedUploadTags] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [playerChatRooms, setPlayerChatRooms] = useState<any[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [wellnessCompletedToday, setWellnessCompletedToday] = useState<boolean | null>(null)
  const [isCheckingWellness, setIsCheckingWellness] = useState(false)
  const [wellnessSettings, setWellnessSettings] = useState<{
    csvUrl: string
    surveyId: string
    baseUrl: string
  } | null>(null)

  const playerId = params.id as string

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
      }
    } catch (error) {
      console.error('Error fetching wellness settings:', error)
    }
  }

  useEffect(() => {
    fetchWellnessSettings()
    const fetchPlayerData = async () => {
      try {
        // Get authentication token
        const token = localStorage.getItem('token')
        const headers = token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }

        const [playerResponse, mediaResponse, notesResponse, tagsResponse, chatResponse] = await Promise.all([
          fetch(`/api/players/${playerId}`),
          fetch(`/api/players/${playerId}/media`, { headers }),
          fetch(`/api/players/${playerId}/notes`, { headers }),
          fetch(`/api/players/${playerId}/tags`),
          fetch(`/api/players/${playerId}/chat-rooms`, { headers }) // ADD HEADERS WITH TOKEN!
        ])

        if (playerResponse.ok) {
          const playerData = await playerResponse.json()
          // Map imageUrl to avatar for compatibility
          setPlayer({
            ...playerData,
            avatar: playerData.imageUrl || playerData.avatar || null
          })
        }

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json()
          console.log('📁 Fetched media data:', mediaData)
          
          // Transform the data to match our interface
          // Filter duplicates by ID first
          const uniqueMediaMap = new Map()
          mediaData.forEach((file: any) => {
            if (!uniqueMediaMap.has(file.id)) {
              uniqueMediaMap.set(file.id, file)
            }
          })
          
          const transformedMedia = Array.from(uniqueMediaMap.values()).map((file: any) => ({
            id: file.id,
            name: file.fileName,
            fileName: file.fileName,
            mimeType: file.fileType,
            fileType: file.fileType,
            size: file.fileSize,
            fileSize: file.fileSize,
            uploadedAt: file.uploadedAt || file.createdAt,
            uploadDate: file.uploadedAt || file.createdAt,
            url: file.fileUrl || file.url,
            thumbnailUrl: file.thumbnailUrl,
            tags: Array.isArray(file.tags) ? file.tags : (file.tags ? file.tags.split(',').map((t: string) => t.trim()) : [])
          }))
          console.log('📁 Transformed media data:', transformedMedia)
          setMediaFiles(transformedMedia)
        }

        if (notesResponse.ok) {
          const notesData = await notesResponse.json()
          setNotes(notesData)
        }

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          setAvailableTags(tagsData.tags || [])
        }

        if (chatResponse.ok) {
          const chatData = await chatResponse.json()
          console.log('💬 Fetched player chat rooms:', chatData)
          setPlayerChatRooms(Array.isArray(chatData) ? chatData : [])
        } else {
          console.error('❌ Failed to fetch chat rooms:', chatResponse.status, chatResponse.statusText)
          const errorText = await chatResponse.text().catch(() => 'Unknown error')
          console.error('Error details:', errorText)
          setPlayerChatRooms([])
        }

        // Check wellness survey completion for players
        if (user?.role === 'PLAYER' && playerId === user.id) {
          await checkWellnessSurveyCompletion()
        }
      } catch (error) {
        console.error('Error fetching player data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (playerId) {
      fetchPlayerData()
    }
  }, [playerId, user])

  const checkWellnessSurveyCompletion = async () => {
    if (!playerId) return
    
    setIsCheckingWellness(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        setWellnessCompletedToday(false)
        return
      }

      const response = await fetch(`/api/wellness/status/${playerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Wellness survey status:', data)
        setWellnessCompletedToday(data.completed || false)
      } else {
        console.error('Failed to check wellness status:', response.status, response.statusText)
        setWellnessCompletedToday(false)
      }
    } catch (error) {
      console.error('Error checking wellness survey completion:', error)
      setWellnessCompletedToday(false)
    } finally {
      setIsCheckingWellness(false)
    }
  }

  const handleFileUpload = async (files: FileList, tags: string[] = []) => {
    console.log('📁 Starting file upload:', { 
      fileCount: files.length, 
      files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })),
      tags,
      playerId 
    })
    
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('files', file)
      })
      
      if (tags.length > 0) {
        formData.append('tags', tags.join(','))
      }

      console.log('📁 Sending request to:', `/api/players/${playerId}/media`)
      console.log('📁 FormData contents:', Array.from(formData.entries()))

      // Get authentication token for upload
      const token = localStorage.getItem('token')
      const uploadHeaders: any = {}
      if (token) {
        uploadHeaders['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/players/${playerId}/media`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData
      })

      console.log('📁 Response status:', response.status)

      if (response.ok) {
        const newMedia = await response.json()
        console.log('✅ Upload successful, received data:', newMedia)
        // Transform the response to match our interface
        const transformedMedia = newMedia.map((file: any) => ({
          id: file.id,
          name: file.fileName,
          fileName: file.fileName,
          mimeType: file.fileType,
          fileType: file.fileType,
          size: file.fileSize,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt || file.createdAt,
          uploadDate: file.uploadedAt || file.createdAt,
          url: file.fileUrl || file.url,
          thumbnailUrl: file.thumbnailUrl,
          tags: Array.isArray(file.tags) ? file.tags : (file.tags ? file.tags.split(',').map((t: string) => t.trim()) : [])
        }))
        console.log('✅ Transformed media:', transformedMedia)
        setMediaFiles(prev => [...prev, ...transformedMedia])
        setShowUploadModal(false)
        setSelectedUploadTags([]) // Reset selected tags
        setSelectedFiles(null) // Reset selected files
      } else {
        console.error('❌ Upload failed with status:', response.status)
        let errorData = {}
        try {
          const responseText = await response.text()
          console.error('❌ Raw response:', responseText)
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
          errorData = { message: 'Failed to parse error response' }
        }
        
        console.error('❌ Parsed error data:', errorData)
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status} error`
        alert(`Failed to upload files: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Error uploading files')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      // Get authentication token for delete
      const token = localStorage.getItem('token')
      const headers: any = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/players/${playerId}/media/${mediaId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setMediaFiles(prev => prev.filter(file => file.id !== mediaId))
        // Refresh tags after deletion
        const tagsResponse = await fetch(`/api/players/${playerId}/tags`)
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          setAvailableTags(tagsData.tags || [])
        }
      } else {
        alert('Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error deleting file')
    }
  }

  const handleUpdateMediaTags = async (mediaId: string, tags: string[]) => {
    try {
      // Get authentication token for update
      const token = localStorage.getItem('token')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/players/${playerId}/media/${mediaId}/tags`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tags }),
      })

      if (response.ok) {
        // Update the media file in state
        setMediaFiles(prev => prev.map(file => 
          file.id === mediaId ? { ...file, tags } : file
        ))
        
        // Refresh available tags
        const tagsResponse = await fetch(`/api/players/${playerId}/tags`)
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          setAvailableTags(tagsData.tags || [])
        }
        
        setEditingMediaTags(null)
      } else {
        alert('Failed to update tags')
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('Error updating tags')
    }
  }

  const addNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      setAvailableTags(prev => [...prev, newTag.trim()].sort())
      setNewTag('')
    }
  }

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    setSelectedFiles(files)
  }

  const handleConfirmUpload = async () => {
    if (selectedFiles && selectedFiles.length > 0) {
      await handleFileUpload(selectedFiles, selectedUploadTags)
    }
  }

  const getFileIcon = (file: MediaFile) => {
    const fileType = file.fileType || file.mimeType || ''
    if (fileType.startsWith('image/')) return <Image className="h-6 w-6" />
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6" />
    if (fileType === 'application/pdf') return <FileText className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  const formatFileSize = (file: MediaFile) => {
    const bytes = file.fileSize || file.size || 0
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredMedia = mediaFiles.filter(file => {
    const fileName = file.fileName || file.name || ''
    const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === 'All' || 
      (file.tags && file.tags.includes(selectedFilter))
    return matchesSearch && matchesFilter
  })

  // Note handling functions
  const handleSaveNote = async (content: string, isVisible: boolean, isPinned: boolean) => {
    console.log('handleSaveNote called with:', { content, isVisible, isPinned, playerId, userId: user?.id })
    
    if (!user?.id) {
      alert('You must be logged in to save notes')
      return
    }
    
    try {
      // Extract text content for title (first 50 characters)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const textContent = tempDiv.textContent || tempDiv.innerText || ''
      const title = textContent.trim().substring(0, 50) || 'Untitled Note'
      
      // Get token from localStorage
      const token = localStorage.getItem('token')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/players/${playerId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          content,
          isVisibleToPlayer: isVisible,
          isPinned,
          authorId: user.id
        }),
      })

      console.log('Save note response:', response.status, response.statusText)

      if (response.ok) {
        const newNote = await response.json()
        console.log('Note saved successfully:', newNote)
        setNotes(prev => [newNote, ...prev])
        setShowNewNote(false)
        alert('Note saved successfully!')
      } else {
        const errorData = await response.json()
        console.error('Failed to save note:', errorData)
        alert(`Failed to save note: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Error saving note')
    }
  }

  const handleUpdateNote = async (noteId: string, content: string, isVisible: boolean, isPinned: boolean) => {
    try {
      const response = await fetch(`/api/players/${playerId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          isVisibleToPlayer: isVisible,
          isPinned
        }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => note.id === noteId ? updatedNote : note))
        setEditingNote(null)
      } else {
        alert('Failed to update note')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Error updating note')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const response = await fetch(`/api/players/${playerId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
      } else {
        alert('Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Error deleting note')
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading player...
          </p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Player not found
          </p>
          <button
            onClick={() => router.back()}
            className="text-red-600 mt-2"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: colorScheme.background }}
    >
      {/* Header */}
      <div 
        className="sticky top-0 border-b px-4 py-3"
        style={{ 
          backgroundColor: colorScheme.surface,
          borderColor: colorScheme.border
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-md transition-colors hover:opacity-70"
              style={{ color: colorScheme.textSecondary }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            {/* Player Avatar */}
            <div className="flex items-center space-x-3">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={`${player.firstName} ${player.lastName}`}
                  className="w-10 h-10 rounded-full object-cover border-2"
                  style={{ borderColor: colorScheme.border }}
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border
                  }}
                >
                  <User className="h-5 w-5" style={{ color: colorScheme.textSecondary }} />
                </div>
              )}
              <h1 
                className="text-xl font-bold"
                style={{ color: colorScheme.text }}
              >
                {player.firstName} {player.lastName}
              </h1>
            </div>
          </div>
          
          {/* Edit Button */}
          <button
            onClick={() => router.push(`/dashboard/players/${playerId}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Wellness Survey Lock - Only for players viewing their own profile */}
      {user?.role === 'PLAYER' && playerId === user.id && wellnessCompletedToday === false && (
        <div className="p-6 m-4 rounded-2xl border-2" style={{ 
          backgroundColor: '#FEF2F2',
          borderColor: '#FCA5A5'
        }}>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <User className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800 mb-2">
                Daily Wellness Survey Required
              </h3>
              <p className="text-red-700 mb-4">
                You must complete your daily wellness survey to access your profile and all features.
              </p>
              <button
                onClick={async () => {
                  if (!wellnessSettings) {
                    alert('Wellness settings not loaded. Please refresh the page.')
                    return
                  }
                  
                  const wellnessUrl = `${wellnessSettings.baseUrl}/kiosk/${wellnessSettings.surveyId}`
                  
                  const wellnessWindow = window.open(wellnessUrl, '_blank')
                  
                  // Check for survey completion after window closes
                  const checkCompletion = setInterval(async () => {
                    if (wellnessWindow?.closed) {
                      clearInterval(checkCompletion)
                      await checkWellnessSurveyCompletion()
                    }
                  }, 2000)
                  
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

      {/* Main Content - Only show if wellness completed or user is not a player */}
      {!(user?.role === 'PLAYER' && playerId === user.id && wellnessCompletedToday === false) && (
        <>
      {/* Tabs */}
      <div 
        className="border-b"
        style={{ borderColor: colorScheme.border }}
      >
        <div className="flex">
          <button
            onClick={() => setActiveTab('media')}
            className="px-6 py-3 text-sm font-medium border-b-2 transition-colors hover:opacity-70"
            style={{
              borderColor: activeTab === 'media' ? colorScheme.primary : 'transparent',
              color: activeTab === 'media' ? colorScheme.primary : colorScheme.textSecondary
            }}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Media</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className="px-6 py-3 text-sm font-medium border-b-2 transition-colors hover:opacity-70"
            style={{
              borderColor: activeTab === 'notes' ? colorScheme.primary : 'transparent',
              color: activeTab === 'notes' ? colorScheme.primary : colorScheme.textSecondary
            }}
          >
            <div className="flex items-center space-x-2">
              <StickyNote className="h-4 w-4" />
              <span>Notes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className="px-6 py-3 text-sm font-medium border-b-2 transition-colors hover:opacity-70"
            style={{
              borderColor: activeTab === 'chats' ? colorScheme.primary : 'transparent',
              color: activeTab === 'chats' ? colorScheme.primary : colorScheme.textSecondary
            }}
          >
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Chats</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className="px-6 py-3 text-sm font-medium border-b-2 transition-colors hover:opacity-70"
            style={{
              borderColor: activeTab === 'events' ? colorScheme.primary : 'transparent',
              color: activeTab === 'events' ? colorScheme.primary : colorScheme.textSecondary
            }}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Events</span>
            </div>
          </button>
        </div>
      </div>

      {/* Media Tab Content */}
      {activeTab === 'media' && (
        <>
          {/* Search and Filter Bar */}
          <div 
            className="p-4 border-b"
            style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border
            }}
          >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for event or media name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border,
                color: colorScheme.text
              }}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={() => setSelectedFilter('All')}
              className="px-3 py-1 text-sm rounded-full transition-colors hover:opacity-80"
              style={{
                backgroundColor: selectedFilter === 'All' ? colorScheme.primary : colorScheme.border,
                color: selectedFilter === 'All' ? 'white' : colorScheme.text
              }}
            >
              All
            </button>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedFilter(tag)}
                className="px-3 py-1 text-sm rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: selectedFilter === tag ? colorScheme.primary : colorScheme.border,
                  color: selectedFilter === tag ? 'white' : colorScheme.text
                }}
              >
                {tag}
              </button>
            ))}
            <button
              onClick={() => setShowTagModal(true)}
              className="px-3 py-1 text-sm rounded-full transition-colors hover:opacity-80 border-2 border-dashed"
              style={{
                borderColor: colorScheme.border,
                color: colorScheme.text
              }}
            >
              + Add Tag
            </button>
          </div>

          {/* View Mode and Upload */}
          <div className="flex items-center space-x-2">
            <div 
              className="flex items-center border rounded-md"
              style={{ borderColor: colorScheme.border }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? colorScheme.primary : 'transparent',
                  color: viewMode === 'grid' ? 'white' : colorScheme.textSecondary
                }}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? colorScheme.primary : 'transparent',
                  color: viewMode === 'list' ? 'white' : colorScheme.textSecondary
                }}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="p-4">
        {filteredMedia.length === 0 ? (
          <div 
            className="text-center py-12 rounded-lg border"
            style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border
            }}
          >
            <Upload 
              className="h-16 w-16 mx-auto mb-4"
              style={{ color: colorScheme.textSecondary }}
            />
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: colorScheme.text }}
            >
              No media files found
            </h3>
            <p style={{ color: colorScheme.textSecondary }}>
              {searchTerm || selectedFilter !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first media file to get started'
              }
            </p>
            {!searchTerm && selectedFilter === 'All' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Media
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'space-y-3'
          }>
            {filteredMedia.map((file) => (
              <div
                key={file.id}
                className={`group relative ${
                  viewMode === 'grid' 
                    ? 'rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow'
                    : 'flex items-center p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow'
                }`}
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border
                }}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid View */}
                    <div 
                      className="aspect-square flex items-center justify-center"
                      style={{ backgroundColor: colorScheme.background }}
                    >
                      {(file.fileType || file.mimeType || '').startsWith('image/') ? (
                        <img
                          src={file.url}
                          alt={file.fileName || file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (file.fileType || file.mimeType || '') === 'application/pdf' ? (
                        <PDFThumbnail
                          pdfUrl={file.url}
                          fileName={file.fileName || file.name}
                          className="w-full h-full"
                          onLoad={() => console.log('✅ PDF thumbnail loaded successfully')}
                          onError={() => console.error('❌ PDF thumbnail failed to load')}
                        />
                      ) : (
                        <div 
                          className="text-center"
                          style={{ color: colorScheme.textSecondary }}
                        >
                          {getFileIcon(file)}
                          <p className="text-xs mt-2 truncate px-2">{file.fileName || file.name}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 
                        className="text-sm font-medium truncate"
                        style={{ color: colorScheme.text }}
                      >
                        {file.fileName || file.name}
                      </h4>
                      <p 
                        className="text-xs mt-1"
                        style={{ color: colorScheme.textSecondary }}
                      >
                        {formatFileSize(file)}
                      </p>
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{ 
                                backgroundColor: colorScheme.primary + '20',
                                color: colorScheme.primary
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div 
                      className="flex-shrink-0 mr-3"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {getFileIcon(file)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-sm font-medium truncate"
                        style={{ color: colorScheme.text }}
                      >
                        {file.fileName || file.name}
                      </h4>
                      <p 
                        className="text-xs"
                        style={{ color: colorScheme.textSecondary }}
                      >
                        {formatFileSize(file)} • {new Date(file.uploadDate || file.uploadedAt).toLocaleDateString()}
                      </p>
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{ 
                                backgroundColor: colorScheme.primary + '20',
                                color: colorScheme.primary
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className={`absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  viewMode === 'list' ? 'relative top-0 right-0 opacity-100' : ''
                }`}>
                  <button
                    onClick={() => {
                      setPreviewFile(file)
                      setShowPreviewModal(true)
                    }}
                    className="p-1.5 rounded-md transition-colors shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: colorScheme.border,
                      color: colorScheme.textSecondary
                    }}
                    title="View"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <a
                    href={file.url}
                    download={file.fileName || file.name}
                    className="p-1.5 rounded-md transition-colors shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: colorScheme.border,
                      color: colorScheme.textSecondary
                    }}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setEditingMediaTags(file)}
                    className="p-1.5 rounded-md transition-colors shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: colorScheme.border,
                      color: colorScheme.textSecondary
                    }}
                    title="Edit Tags"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteMedia(file.id)}
                    className="p-1.5 rounded-md transition-colors shadow-sm hover:opacity-80"
                    style={{
                      backgroundColor: colorScheme.border,
                      color: colorScheme.textSecondary
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <div className="p-4">
          {/* Add Note Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowNewNote(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </button>
          </div>

          {/* New Note Editor */}
          {showNewNote && (
            <div className="mb-6">
              <RichTextEditor
                onSave={(content) => {
                  console.log('RichTextEditor onSave called with:', content)
                  handleSaveNote(content, true, false)
                }}
                onCancel={() => setShowNewNote(false)}
                placeholder="Enter a note about this player..."
              />
            </div>
          )}

          {/* Notes List */}
          {notes.length === 0 ? (
            <div 
              className="text-center py-12 rounded-lg border"
              style={{ 
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border
              }}
            >
              <StickyNote 
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: colorScheme.textSecondary }}
              />
              <h3 
                className="text-lg font-medium mb-2"
                style={{ color: colorScheme.text }}
              >
                No notes yet
              </h3>
              <p style={{ color: colorScheme.textSecondary }}>
                Add your first note about this player
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
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
                      {/* Date and Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap block" style={{ color: colorScheme.textSecondary }}>
                            {new Date(note.createdAt).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                          {note.updatedAt !== note.createdAt && (
                            <span className="text-xs text-gray-500 whitespace-nowrap block">(edited)</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {note.isPinned && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Pin className="h-3 w-3 mr-1" />
                              PINNED
                            </span>
                          )}
                          <button
                            onClick={() => setEditingNote(note)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-opacity-20"
                            style={{ color: colorScheme.textSecondary }}
                            title="Edit Note"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-opacity-20"
                            style={{ color: colorScheme.error || '#EF4444' }}
                            title="Delete Note"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

                  {/* Note Content */}
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    {editingNote && editingNote.id === note.id ? (
                      <RichTextEditor
                        initialContent={note.content}
                        onSave={(content) => handleUpdateNote(note.id, content, note.isVisibleToPlayer, note.isPinned)}
                        onCancel={() => setEditingNote(null)}
                        isVisible={note.isVisibleToPlayer}
                        isPinned={note.isPinned}
                        onToggleVisible={(visible) => {
                          const updatedNote = { ...note, isVisibleToPlayer: visible }
                          setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n))
                        }}
                        onTogglePinned={(pinned) => {
                          const updatedNote = { ...note, isPinned: pinned }
                          setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n))
                        }}
                        isEditing={true}
                      />
                    ) : (
                      <div 
                        className={`text-sm sm:text-base prose prose-sm sm:prose-base max-w-none note-content ${
                          theme === 'dark' ? 'prose-invert' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Upload Media Files
              </h3>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Upload PDFs, images, videos, and other files
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedUploadTags(prev => 
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedUploadTags.includes(tag)
                          ? 'bg-red-600 text-white'
                          : theme === 'dark' 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowTagModal(true)}
                  className="text-sm transition-colors"
                  style={{ color: colorScheme.text }}
                >
                  + Add New Tag
                </button>
              </div>
              
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav"
                onChange={handleFileSelection}
                className="w-full p-3 border border-gray-300 rounded-md"
                disabled={uploading}
              />
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-2">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Selected {selectedFiles.length} file(s):
                  </p>
                  <ul className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index} className="truncate">• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    if (!uploading) {
                      setShowUploadModal(false)
                      setSelectedUploadTags([])
                      setSelectedFiles(null)
                    }
                  }}
                  className={`px-4 py-2 rounded-md ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpload}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || !selectedFiles || selectedFiles.length === 0}
                >
                  {uploading ? 'Uploading...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Manage Tags
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Add New Tag
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tag name"
                    className={`flex-1 px-3 py-2 border rounded-md ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    onKeyPress={(e) => e.key === 'Enter' && addNewTag()}
                  />
                  <button
                    onClick={addNewTag}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Existing Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <div
                      key={tag}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full"
                    >
                      <span className="text-sm">{tag}</span>
                      <button
                        onClick={() => {
                          setAvailableTags(prev => prev.filter(t => t !== tag))
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTagModal(false)
                    setNewTag('')
                  }}
                  className={`px-4 py-2 rounded-md ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Media Tags Modal */}
      {editingMediaTags && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Tags for {editingMediaTags.fileName || editingMediaTags.name}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = editingMediaTags.tags || []
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag]
                        setEditingMediaTags({ ...editingMediaTags, tags: newTags })
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        (editingMediaTags.tags || []).includes(tag)
                          ? 'bg-red-600 text-white'
                          : theme === 'dark' 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingMediaTags(null)}
                  className={`px-4 py-2 rounded-md ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateMediaTags(editingMediaTags.id, editingMediaTags.tags || [])}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Save Tags
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab Content */}
      {activeTab === 'events' && player && (
        <div className="p-4">
          <ReadOnlyCalendar 
            userId={(player as any).userId || (player as any).user?.id || player.id} 
            userRole={user?.role === 'PLAYER' && playerId === user.id ? 'PLAYER' : undefined}
          />
        </div>
      )}

      {/* Chat Tab Content */}
      {activeTab === 'chats' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
              Chat Rooms ({playerChatRooms.length})
            </h3>
            <button
              onClick={async () => {
                // Refresh chat rooms
                const token = localStorage.getItem('token')
                const headers = token ? {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                } : {
                  'Content-Type': 'application/json'
                }
                const chatResponse = await fetch(`/api/players/${playerId}/chat-rooms`, { headers })
                if (chatResponse.ok) {
                  const chatData = await chatResponse.json()
                  console.log('💬 Refreshed player chat rooms:', chatData)
                  setPlayerChatRooms(Array.isArray(chatData) ? chatData : [])
                }
              }}
              className="px-3 py-1 text-sm rounded-md transition-colors"
              style={{
                backgroundColor: colorScheme.primary,
                color: colorScheme.primaryText || 'white'
              }}
            >
              Refresh
            </button>
          </div>
          
          {playerChatRooms.length === 0 ? (
            <div className="text-center py-8" style={{ color: colorScheme.textSecondary }}>
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No chat rooms available</p>
              <p className="text-sm mt-2">You need to be added to a chat room by an administrator</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playerChatRooms.map((room: any) => (
                <div
                  key={room.id}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.border
                  }}
                  onClick={() => {
                    // Open chat in new window or navigate to chat
                    window.open(`/dashboard/chat?room=${room.id}`, '_blank')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold" style={{ color: colorScheme.text }}>
                        {room.name}
                      </h4>
                      <p className="text-sm mt-1" style={{ color: colorScheme.textSecondary }}>
                        {room.participants?.length || 0} participants
                      </p>
                      {room.lastMessage && (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs truncate" style={{ color: colorScheme.textSecondary }}>
                            <span className="font-medium">{room.lastMessage.senderName || 'Unknown'}:</span> {room.lastMessage.content}
                          </p>
                          {room.lastMessage.timestamp && (
                            <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                              {new Date(room.lastMessage.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <MessageCircle className="h-6 w-6 ml-4" style={{ color: colorScheme.primary }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Chat Tab Content - OLD */}
      {false && activeTab === 'chats' && (
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
              Chat Rooms
            </h2>
            {playerChatRooms.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
                <p style={{ color: colorScheme.textSecondary }}>
                  This player is not a member of any chat rooms yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {playerChatRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-lg border transition-colors hover:opacity-80 cursor-pointer"
                    style={{ 
                      backgroundColor: colorScheme.surface,
                      borderColor: colorScheme.border
                    }}
                    onClick={() => {
                      // Open chat modal or navigate to chat
                      console.log('Opening chat room:', room.name)
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                        style={{ backgroundColor: colorScheme.primary }}
                      >
                        {room.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium" style={{ color: colorScheme.text }}>
                          {room.name}
                        </h3>
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          {room.participants?.length || 0} members
                        </p>
                        {room.lastMessage && (
                          <p className="text-sm mt-1" style={{ color: colorScheme.textSecondary }}>
                            Last message: {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold truncate">{previewFile.fileName || previewFile.name}</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewFile(null)
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back</span>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {(previewFile.fileType || previewFile.mimeType || '').includes('pdf') ? (
                <div className="w-full" style={{ minHeight: '600px' }}>
                  <PDFThumbnail
                    pdfUrl={previewFile.url}
                    fileName={previewFile.fileName || previewFile.name}
                    className="w-full h-full"
                    onLoad={() => console.log('✅ PDF thumbnail loaded successfully')}
                    onError={() => console.error('❌ PDF thumbnail failed to load')}
                  />
                </div>
              ) : (previewFile.fileType || previewFile.mimeType || '').startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.fileName || previewFile.name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.fileName || previewFile.name}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}