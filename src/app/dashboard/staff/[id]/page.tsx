'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, User, FileText, Download, Eye, Calendar, Edit } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import PDFThumbnail from '@/components/PDFThumbnail'
import ReadOnlyCalendar from '@/components/ReadOnlyCalendar'

interface Staff {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  imageUrl?: string
  userId?: string
  user?: {
    id: string
    email: string
  }
}

interface Report {
  id: string
  name: string
  description?: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  thumbnailUrl?: string
  createdAt: string
  folder?: {
    id: string
    name: string
  }
}

export default function StaffProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { colorScheme, theme } = useTheme()
  const { user } = useAuth()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reports' | 'events'>('reports')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<Report | null>(null)

  const staffId = params.id as string

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }

        const staffResponse = await fetch(`/api/staff/${staffId}`, { headers })
        
        if (staffResponse.ok) {
          const staffData = await staffResponse.json()
          setStaff(staffData)
          
          // Fetch reports for this specific staff member
          // Pass staffId as query parameter so admin/coach can view staff's reports
          const reportsResponse = await fetch(`/api/reports/staff-reports?staffId=${staffId}`, { headers })

          if (reportsResponse.ok) {
            const reportsData = await reportsResponse.json()
          // Flatten reports from all folders
          const allReports: Report[] = []
          if (reportsData.folders && Array.isArray(reportsData.folders)) {
            reportsData.folders.forEach((folder: any) => {
              if (folder.reports && Array.isArray(folder.reports)) {
                allReports.push(...folder.reports.map((r: any) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  fileName: r.fileName,
                  fileType: r.fileType,
                  fileSize: r.fileSize,
                  fileUrl: r.fileUrl,
                  thumbnailUrl: r.thumbnailUrl,
                  createdAt: r.createdAt,
                  folder: folder
                })))
              }
            })
          }
          if (reportsData.reports && Array.isArray(reportsData.reports)) {
            allReports.push(...reportsData.reports.map((r: any) => ({
              id: r.id,
              name: r.title || r.name, // Use title from schema, fallback to name
              description: r.description,
              fileName: r.fileName,
              fileType: r.fileType,
              fileSize: r.fileSize,
              fileUrl: r.fileUrl,
              thumbnailUrl: r.thumbnailUrl,
              createdAt: r.createdAt,
              folder: r.report_folders || r.folder // Use report_folders from schema, fallback to folder
            })))
          }
          setReports(allReports)
          } else {
            console.error('Failed to fetch reports:', reportsResponse.status, reportsResponse.statusText)
          }
        }
      } catch (error) {
        console.error('Error fetching staff data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (staffId) {
      fetchStaffData()
    }
  }, [staffId])

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return <FileText className="h-6 w-6" />
    return <FileText className="h-6 w-6" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading staff...
          </p>
        </div>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Staff member not found
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
            
            {/* Staff Avatar */}
            <div className="flex items-center space-x-3">
              {staff.imageUrl ? (
                <img
                  src={staff.imageUrl}
                  alt={`${staff.firstName} ${staff.lastName}`}
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
                {staff.firstName} {staff.lastName}
              </h1>
            </div>
          </div>
          
          {/* Edit Button */}
          <button
            onClick={() => router.push(`/dashboard/staff/${staffId}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="border-b"
        style={{ borderColor: colorScheme.border }}
      >
        <div className="flex">
          <button
            onClick={() => setActiveTab('reports')}
            className="px-6 py-3 text-sm font-medium border-b-2 transition-colors hover:opacity-70"
            style={{
              borderColor: activeTab === 'reports' ? colorScheme.primary : 'transparent',
              color: activeTab === 'reports' ? colorScheme.primary : colorScheme.textSecondary
            }}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Reports</span>
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

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <div className="p-4">
          {reports.length === 0 ? (
            <div 
              className="text-center py-12 rounded-lg border"
              style={{ 
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border
              }}
            >
              <FileText 
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: colorScheme.textSecondary }}
              />
              <h3 
                className="text-lg font-medium mb-2"
                style={{ color: colorScheme.text }}
              >
                No reports found
              </h3>
              <p style={{ color: colorScheme.textSecondary }}>
                No reports have been assigned to this staff member yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="group relative rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                  style={{ 
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.border
                  }}
                >
                  <div 
                    className="aspect-square flex items-center justify-center"
                    style={{ backgroundColor: colorScheme.background }}
                  >
                    {report.fileType === 'application/pdf' ? (
                      <PDFThumbnail
                        pdfUrl={report.fileUrl}
                        fileName={report.fileName}
                        className="w-full h-full"
                        onLoad={() => console.log('✅ PDF thumbnail loaded successfully')}
                        onError={() => console.error('❌ PDF thumbnail failed to load')}
                      />
                    ) : (
                      <div 
                        className="text-center"
                        style={{ color: colorScheme.textSecondary }}
                      >
                        {getFileIcon(report.fileType)}
                        <p className="text-xs mt-2 truncate px-2">{report.fileName}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 
                      className="text-sm font-medium truncate"
                      style={{ color: colorScheme.text }}
                    >
                      {report.name}
                    </h4>
                    {report.description && (
                      <p 
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: colorScheme.textSecondary }}
                      >
                        {report.description}
                      </p>
                    )}
                    <p 
                      className="text-xs mt-1"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {formatFileSize(report.fileSize)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setPreviewFile(report)
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
                      href={report.fileUrl}
                      download={report.fileName}
                      className="p-1.5 rounded-md transition-colors shadow-sm hover:opacity-80"
                      style={{
                        backgroundColor: colorScheme.border,
                        color: colorScheme.textSecondary
                      }}
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab Content */}
      {activeTab === 'events' && staff && (
        <div className="p-4">
          <ReadOnlyCalendar 
            userId={staff.userId || staff.user?.id} 
            userRole="STAFF"
          />
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold truncate">{previewFile.name}</h3>
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
              {previewFile.fileType === 'application/pdf' ? (
                <div className="w-full" style={{ minHeight: '600px' }}>
                  <PDFThumbnail
                    pdfUrl={previewFile.fileUrl}
                    fileName={previewFile.fileName}
                    className="w-full h-full"
                    onLoad={() => console.log('✅ PDF thumbnail loaded successfully')}
                    onError={() => console.error('❌ PDF thumbnail failed to load')}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewFile.fileUrl}
                    download={previewFile.fileName}
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
    </div>
  )
}

