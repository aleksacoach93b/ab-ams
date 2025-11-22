'use client'

import React, { useState, useEffect } from 'react'
import { 
  FolderPlus, 
  Upload, 
  FolderOpen, 
  File, 
  Eye, 
  Edit, 
  Trash2, 
  ArrowLeft,
  MoreVertical,
  Download,
  Share2,
  Settings,
  EyeIcon,
  Check,
  Pencil,
  Users,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import PDFThumbnail from '@/components/PDFThumbnail'

interface ReportFolder {
  id: string
  name: string
  description?: string
  parentId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  parent?: ReportFolder
  children: ReportFolder[]
  reports: Report[]
  visibleToPlayers: {
    id: string
    canView: boolean
    player: {
      id: string
      name: string
      email: string
    }
  }[]
  _count: {
    reports: number
    children: number
  }
}

interface Report {
  id: string
  name: string
  description?: string
  folderId: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  thumbnailUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  folder: ReportFolder
}

interface Player {
  id: string
  name: string
  email: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function PlayerReportsPage() {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [folders, setFolders] = useState<ReportFolder[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState<ReportFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<ReportFolder | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showUploadReport, setShowUploadReport] = useState(false)
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Report | ReportFolder | null>(null)
  const [previewFile, setPreviewFile] = useState<Report | null>(null)

  useEffect(() => {
    // Optimized: Use cached data if available (30 seconds cache)
    const cacheKey = 'player-reports-data'
    const cacheTime = 30000 // 30 seconds
    const cached = sessionStorage.getItem(cacheKey)
    const now = Date.now()
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (now - timestamp < cacheTime) {
          setFolders(data.folders || [])
          setPlayers(data.players || [])
          setLoading(false)
          // Still fetch in background for fresh data
          fetchData(true)
          fetchReports()
          return
        }
      } catch (e) {
        // Cache invalid, continue with normal fetch
      }
    }
    
    fetchData()
    fetchReports()
  }, [])

  const fetchData = async (background = false) => {
    try {
      if (!background) setLoading(true)
      
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const parentId = selectedFolder?.id || null
      const foldersUrl = parentId 
        ? `/api/player-reports/folders?parentId=${parentId}`
        : '/api/player-reports/folders'

      // Only fetch players if not cached (they don't change often)
      const playersCacheKey = 'player-reports-players'
      const playersCached = sessionStorage.getItem(playersCacheKey)
      let playersData = []
      
      if (playersCached) {
        try {
          const { data, timestamp } = JSON.parse(playersCached)
          if (Date.now() - timestamp < 300000) { // 5 minutes cache for players
            playersData = data
          }
        } catch (e) {}
      }
      
      const promises: Promise<any>[] = [
        fetch(foldersUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]
      
      if (playersData.length === 0) {
        promises.push(
          fetch('/api/players', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        )
      }

      const responses = await Promise.all(promises)
      const foldersResponse = responses[0]
      const playersResponse = responses[1]

      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json()
        setFolders(foldersData)
        
        // Cache data
        const cacheData = {
          folders: foldersData,
          players: playersData.length > 0 ? playersData : (playersResponse && playersResponse.ok ? await playersResponse.json() : [])
        }
        sessionStorage.setItem('player-reports-data', JSON.stringify({
          data: cacheData,
          timestamp: Date.now()
        }))
      }

      if (playersResponse && playersResponse.ok) {
        const freshPlayersData = await playersResponse.json()
        const playersArray = Array.isArray(freshPlayersData) ? freshPlayersData : []
        setPlayers(playersArray)
        
        // Cache players separately (longer cache)
        sessionStorage.setItem(playersCacheKey, JSON.stringify({
          data: playersArray,
          timestamp: Date.now()
        }))
      } else if (playersData.length > 0) {
        setPlayers(playersData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }

  const fetchReports = async (folderId?: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const url = folderId 
        ? `/api/player-reports?folderId=${folderId}`
        : '/api/player-reports'

      // Cache key based on folderId
      const cacheKey = `player-reports-${folderId || 'root'}`
      const cached = sessionStorage.getItem(cacheKey)
      const now = Date.now()
      
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          if (now - timestamp < 30000) { // 30 seconds cache
            setReports(data.reports || [])
            // Still fetch in background
            fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }).then(async (response) => {
              if (response.ok) {
                const freshData = await response.json()
                setReports(freshData.reports || [])
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  data: freshData,
                  timestamp: Date.now()
                }))
              }
            }).catch(() => {})
            return
          }
        } catch (e) {}
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
        
        // Cache reports
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const navigateToFolder = async (folder: ReportFolder) => {
    setCurrentPath(prev => [...prev, folder])
    setSelectedFolder(folder)
    await fetchReports(folder.id)
    await fetchData() // Refresh folders to show subfolders
  }

  const navigateUp = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1)
      setCurrentPath(newPath)
      
      if (newPath.length === 0) {
        setSelectedFolder(null)
        fetchReports()
      } else {
        const parentFolder = newPath[newPath.length - 1]
        setSelectedFolder(parentFolder)
        fetchReports(parentFolder.id)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    return '📁'
  }

  const handleFileAction = (action: 'view' | 'download', report: Report) => {
    if (action === 'view') {
      setPreviewFile(report)
      setShowPreviewModal(true)
    } else if (action === 'download') {
      handleDownload(report)
    }
  }

  const handleDownload = async (report: Report) => {
    try {
      // Build full URL if it's a relative path
      const fileUrl = report.fileUrl.startsWith('http') 
        ? report.fileUrl 
        : `${window.location.origin}${report.fileUrl}`
      
      const token = localStorage.getItem('token')
      
      // Try to fetch with authentication first
      if (token) {
        try {
          const response = await fetch(fileUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            // Get the blob and create download link
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = report.fileName || report.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            return
          }
        } catch (authError) {
          console.log('Auth fetch failed, trying direct download:', authError)
        }
      }

      // Fallback: Direct download (for public files or if auth fails)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = report.fileName || report.name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file. Please try again.')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/player-reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchReports(selectedFolder?.id)
        await fetchData()
      } else {
        console.error('Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? All reports inside will also be deleted.')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/player-reports/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchData()
        await fetchReports(selectedFolder?.id)
      } else {
        console.error('Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/player-reports/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      })

      if (response.ok) {
        await fetchData()
        setShowRenameModal(false)
        setSelectedItem(null)
      } else {
        console.error('Failed to rename folder')
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
    }
  }

  if (loading) {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.text }}>Loading reports...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 rounded-lg hover:opacity-80 transition-colors border"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
                  Player Reports Management
                </h1>
                <p className="text-sm mt-1" style={{ color: colorScheme.textSecondary }}>
                  Manage reports and folders for players
                </p>
              </div>
            </div>
            {/* Only show action buttons for admins and coaches */}
            {user && (user.role === 'ADMIN' || user.role === 'COACH') && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: colorScheme.primary, color: 'white' }}
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={() => setShowUploadReport(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: colorScheme.primary, color: 'white' }}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        {currentPath.length > 0 && (
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => {
                  setCurrentPath([])
                  setSelectedFolder(null)
                  fetchReports()
                }}
                className="hover:underline"
                style={{ color: colorScheme.primary }}
              >
                Player Reports
              </button>
              {currentPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4 rotate-180" style={{ color: colorScheme.textSecondary }} />
                  <button
                    onClick={() => {
                      const newPath = currentPath.slice(0, index + 1)
                      setCurrentPath(newPath)
                      setSelectedFolder(folder)
                      fetchReports(folder.id)
                    }}
                    className="hover:underline"
                    style={{ color: colorScheme.primary }}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Folders */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border p-6" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
                Folders
              </h2>
              <div className="space-y-2">
                {folders.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: colorScheme.textSecondary }}>
                    No folders available
                  </p>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-10 transition-colors group"
                      style={{ backgroundColor: colorScheme.surface }}
                    >
                      <button
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center space-x-3 flex-1 text-left"
                      >
                        <FolderOpen className="h-5 w-5" style={{ color: '#7C3AED' }} />
                        <div>
                          <p className="font-medium" style={{ color: colorScheme.text }}>
                            {folder.name}
                          </p>
                          <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                            {(folder.reports?.length || folder._count?.reports || 0)} reports
                          </p>
                        </div>
                      </button>
                      {/* Only show admin controls for admins and coaches */}
                      {user && (user.role === 'ADMIN' || user.role === 'COACH') && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedItem(folder)
                              setShowVisibilityModal(true)
                            }}
                            className="p-2 rounded hover:opacity-80 transition-colors border"
                            style={{ 
                              backgroundColor: colorScheme.primary + '20',
                              borderColor: colorScheme.border,
                              color: colorScheme.primary
                            }}
                            title="Manage Visibility"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(folder)
                              setShowRenameModal(true)
                            }}
                            className="p-2 rounded hover:opacity-80 transition-colors border"
                            style={{ 
                              backgroundColor: colorScheme.primary + '20',
                              borderColor: colorScheme.border,
                              color: colorScheme.primary
                            }}
                            title="Rename"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="p-2 rounded hover:opacity-80 transition-colors border"
                            style={{ 
                              backgroundColor: '#DC2626',
                              borderColor: '#DC2626',
                              color: '#ffffff'
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border p-6" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                  {selectedFolder ? selectedFolder.name : 'All Reports'}
                </h2>
                {currentPath.length > 0 && (
                  <button
                    onClick={navigateUp}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:opacity-80 transition-colors border"
                    style={{ 
                      backgroundColor: colorScheme.surface,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Back</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <File className="h-12 w-12 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
                    <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                      No reports in this folder
                    </p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow group"
                      style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getFileIcon(report.fileType)}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: colorScheme.text }}>
                            {report.fileName}
                          </p>
                          <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                            {formatFileSize(report.fileSize)} • {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleFileAction('view', report)}
                          className="p-3 rounded-lg hover:opacity-80 transition-colors border"
                          style={{ 
                            backgroundColor: colorScheme.primary + '20',
                            borderColor: colorScheme.border,
                            color: colorScheme.primary
                          }}
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleFileAction('download', report)}
                          className="p-3 rounded-lg hover:opacity-80 transition-colors border"
                          style={{ 
                            backgroundColor: colorScheme.primary + '20',
                            borderColor: colorScheme.border,
                            color: colorScheme.primary
                          }}
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {/* Only show delete button for admins and coaches */}
                        {user && (user.role === 'ADMIN' || user.role === 'COACH') && (
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-2 rounded-lg hover:opacity-80 transition-colors border"
                            style={{ 
                              backgroundColor: '#DC2626',
                              borderColor: '#DC2626',
                              color: '#ffffff'
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Folder Modal - Only for admins and coaches */}
        {showCreateFolder && user && (user.role === 'ADMIN' || user.role === 'COACH') && (
          <CreateFolderForm
            parentFolder={selectedFolder}
            onClose={() => setShowCreateFolder(false)}
            onSuccess={async () => {
              await fetchData()
              setShowCreateFolder(false)
            }}
            colorScheme={colorScheme}
          />
        )}

        {/* Upload Report Modal - Only for admins and coaches */}
        {showUploadReport && user && (user.role === 'ADMIN' || user.role === 'COACH') && (
          <UploadReportForm
            folders={folders}
            onClose={() => setShowUploadReport(false)}
            onSuccess={async () => {
              await fetchReports(selectedFolder?.id)
              await fetchData()
              setShowUploadReport(false)
            }}
            colorScheme={colorScheme}
          />
        )}

        {/* Visibility Modal - Only for admins and coaches */}
        {showVisibilityModal && selectedItem && user && (user.role === 'ADMIN' || user.role === 'COACH') && (
          <VisibilityManager
            item={selectedItem}
            players={players}
            onCancel={() => {
              setShowVisibilityModal(false)
              setSelectedItem(null)
            }}
            onSuccess={async () => {
              await fetchData()
              await fetchReports()
            }}
            colorScheme={colorScheme}
          />
        )}

        {/* Rename Modal - Only for admins and coaches */}
        {showRenameModal && selectedItem && user && (user.role === 'ADMIN' || user.role === 'COACH') && (
          <RenameFolderForm
            folder={selectedItem as ReportFolder}
            onClose={() => {
              setShowRenameModal(false)
              setSelectedItem(null)
            }}
            onSuccess={handleRenameFolder}
            colorScheme={colorScheme}
          />
        )}

        {/* Preview Modal - Full screen for better viewing */}
        {showPreviewModal && previewFile && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <div 
              className="rounded-lg w-full h-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
              style={{ 
                backgroundColor: colorScheme.surface, 
                border: `2px solid ${colorScheme.border}` 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed */}
              <div 
                className="flex items-center justify-between p-3 sm:p-4 flex-shrink-0" 
                style={{ 
                  borderBottom: `1px solid ${colorScheme.border}`,
                  backgroundColor: colorScheme.surface
                }}
              >
                <h3 
                  style={{ color: colorScheme.text }} 
                  className="text-base sm:text-lg font-semibold truncate flex-1 mr-4"
                >
                  {previewFile.fileName}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border"
                    style={{
                      backgroundColor: colorScheme.primary,
                      borderColor: colorScheme.primary,
                      color: '#ffffff'
                    }}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>
              
              {/* Content - Scrollable */}
              <div 
                className="flex-1 overflow-auto p-2 sm:p-4"
                style={{ backgroundColor: colorScheme.background }}
              >
                {previewFile.fileType.includes('pdf') ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <iframe
                      src={(() => {
                        const baseUrl = previewFile.fileUrl.startsWith('http') 
                          ? previewFile.fileUrl 
                          : `${window.location.origin}${previewFile.fileUrl}`
                        // Add token if available for authenticated access
                        const token = localStorage.getItem('token')
                        const separator = baseUrl.includes('?') ? '&' : '?'
                        return `${baseUrl}${separator}token=${token}#toolbar=1&navpanes=1&scrollbar=1&zoom=page-width`
                      })()}
                      className="w-full border-0 rounded-lg"
                      style={{
                        width: '100%',
                        minHeight: 'calc(95vh - 120px)',
                        height: 'calc(95vh - 120px)',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      title={`PDF Preview: ${previewFile.fileName}`}
                    />
                  </div>
                ) : previewFile.fileType.includes('image') ? (
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={previewFile.fileUrl}
                      alt={previewFile.fileName}
                      className="max-w-full max-h-[calc(95vh-120px)] h-auto object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p style={{ color: colorScheme.textSecondary }} className="mb-4">
                      Preview not available for this file type
                    </p>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="inline-flex items-center px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: colorScheme.primary,
                        color: '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(0.9)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'none'
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Create Folder Form Component
function CreateFolderForm({ parentFolder, onClose, onSuccess, colorScheme }: any) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('/api/player-reports/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          parentId: parentFolder?.id || null
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        console.error('Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
        <h3 style={{ color: colorScheme.text }} className="text-lg font-semibold mb-4">Create New Folder</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Enter folder name"
              required
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
          <div>
            <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Enter folder description"
              rows={3}
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors border"
              style={{
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                borderColor: colorScheme.border
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              style={{
                backgroundColor: colorScheme.primary,
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.filter = 'brightness(0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.filter = 'none'
                }
              }}
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Upload Report Form Component
function UploadReportForm({ folders, onClose, onSuccess, colorScheme }: any) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !file) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('description', description.trim() || '')
      formData.append('file', file)
      formData.append('folderId', selectedFolderId || 'null')

      const response = await fetch('/api/player-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        onSuccess()
      } else {
        console.error('Failed to upload report')
      }
    } catch (error) {
      console.error('Error uploading report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
        <h3 style={{ color: colorScheme.text }} className="text-lg font-semibold mb-4">Upload Report</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">Report Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Enter report name"
              required
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
          <div>
            <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Enter report description"
              rows={3}
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
          <div>
            <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">Folder</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            >
              <option value="">No folder (root level)</option>
              {folders.map((folder: any) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !file}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Visibility Manager Component
function VisibilityManager({ item, players, onCancel, onSuccess, colorScheme }: any) {
  const [selectedPlayers, setSelectedPlayers] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    // Initialize with all players unchecked
    const initialSelection: {[key: string]: boolean} = {}
    players.forEach((player: any) => {
      initialSelection[player.id] = false
    })
    setSelectedPlayers(initialSelection)
  }, [players])

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      // Create player access array from selected players
      const playerAccess = Object.entries(selectedPlayers)
        .filter(([playerId, canView]) => canView) // Only include selected players
        .map(([playerId, canView]) => ({
          playerId,
          canView
        }))

      console.log('=== FRONTEND DEBUG ===')
      console.log('Selected players:', selectedPlayers)
      console.log('Player access data being sent:', playerAccess)
      console.log('Players array:', players)

      const endpoint = `/api/player-reports/folders/${item.id}`
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playerAccess
        })
      })

      if (response.ok) {
        console.log('✅ Successfully updated player access')
        onSuccess()
      } else {
        const errorData = await response.text()
        console.error('❌ Failed to update player access:', errorData)
      }
    } catch (error) {
      console.error('❌ Error updating player access:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Player Access Control</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((player: any) => (
              <div key={player.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`player-${player.id}`}
                  checked={selectedPlayers[player.id] || false}
                  onChange={(e) => {
                    setSelectedPlayers(prev => ({
                      ...prev,
                      [player.id]: e.target.checked
                    }))
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label 
                  htmlFor={`player-${player.id}`}
                  className="text-sm font-medium"
                  style={{ color: colorScheme.text }}
                >
                  {player.name}
                </label>
              </div>
            ))}
          </div>
          {players.length === 0 && (
            <p 
              className="text-sm text-center py-4"
              style={{ color: colorScheme.textSecondary }}
            >
              No players found
            </p>
          )}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg transition-colors border"
            style={{
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
              borderColor: colorScheme.border
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: colorScheme.primary,
              color: '#FFFFFF'
            }}
          >
            Save Access
          </button>
        </div>
      </div>
    </div>
  )
}

// Rename Folder Form Component
function RenameFolderForm({ folder, onClose, onSuccess, colorScheme }: any) {
  const [name, setName] = useState(folder.name)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === folder.name) {
      onClose()
      return
    }

    setLoading(true)
    try {
      await onSuccess(folder.id, name.trim())
    } catch (error) {
      console.error('Error renaming folder:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-lg max-w-md w-full p-6"
        style={{ 
          backgroundColor: colorScheme.surface, 
          border: `1px solid ${colorScheme.border}` 
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: colorScheme.text }}
        >
          Rename Folder
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: colorScheme.text }}
            >
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Enter folder name"
              required
              style={{
                backgroundColor: colorScheme.background,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors border"
              style={{
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                borderColor: colorScheme.border
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || name.trim() === folder.name}
              className="px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              style={{
                backgroundColor: colorScheme.primary,
                color: '#FFFFFF'
              }}
            >
              {loading ? 'Renaming...' : 'Rename Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}