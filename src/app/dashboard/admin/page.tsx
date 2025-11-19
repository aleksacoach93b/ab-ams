'use client'

import { useState, useEffect } from 'react'
import { Settings, Users, Shield, Clock, MapPin, User, AlertTriangle, Eye, Download, FileText, TrendingUp, BarChart3, MessageCircle, Link as LinkIcon, Copy, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import TeamChat from '@/components/TeamChat'

interface LoginLog {
  id: string
  userId: string
  email: string
  role: string
  ipAddress: string
  userAgent: string
  location?: string
  success: boolean
  failureReason?: string
  createdAt: string
  user: {
    id: string
    name?: string
    email: string
    role: string
    player?: {
      id: string
      name: string
      imageUrl?: string
    }
    staff?: {
      id: string
      firstName: string
      lastName: string
      avatar?: string
    }
  }
}

interface LoginStats {
  totalLogins: number
  successfulLogins: number
  failedLogins: number
  uniqueUsers: number
}

interface FileAnalytics {
  id: string
  userId: string
  fileType: string
  fileId?: string
  fileName?: string
  action: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    playerData?: any
    staffData?: any
  }
}

interface AnalyticsSummary {
  totalViews: number
  totalDownloads: number
  uniqueUsers: number
  uniqueReports: number
  recentActivity: number
}

const adminSections = [
  {
    title: 'User Management',
    description: 'Manage users, roles, and permissions',
    icon: Users,
    href: '/dashboard/admin/users',
    color: 'bg-blue-500'
  },
  {
    title: 'System Settings',
    description: 'Configure app settings and preferences',
    icon: Settings,
    href: '/dashboard/admin/settings',
    color: 'bg-slate-500'
  }
]

export default function AdminPage() {
  const { colorScheme } = useTheme()
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [loginStats, setLoginStats] = useState<LoginStats>({
    totalLogins: 0,
    successfulLogins: 0,
    failedLogins: 0,
    uniqueUsers: 0
  })
  const [fileAnalytics, setFileAnalytics] = useState<FileAnalytics[]>([])
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>({
    totalViews: 0,
    totalDownloads: 0,
    uniqueUsers: 0,
    uniqueReports: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)
  const [showTeamChat, setShowTeamChat] = useState(false)

  // Set default date after component mounts to avoid hydration mismatch
  useEffect(() => {
    const dateInput = document.getElementById('collection-date') as HTMLInputElement
    if (dateInput) {
      dateInput.value = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  }, [])
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics-links'>('overview')
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [csvType, setCsvType] = useState<'events' | 'players'>('events')

  useEffect(() => {
    fetchLoginData()
    fetchAnalyticsData()
    
    // Real-time polling every 5 seconds
    const loginInterval = setInterval(fetchLoginData, 5000)
    const analyticsInterval = setInterval(fetchAnalyticsData, 5000)
    
    return () => {
      clearInterval(loginInterval)
      clearInterval(analyticsInterval)
    }
  }, [])

  const fetchLoginData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch('/api/admin/login-logs?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLoginLogs(data.loginLogs)
        
        // Calculate stats
        const totalLogins = data.totalCount
        const successfulLogins = data.loginLogs.filter((log: LoginLog) => log.success).length
        const failedLogins = data.loginLogs.filter((log: LoginLog) => !log.success).length
        const uniqueUsers = new Set(data.loginLogs.map((log: LoginLog) => log.userId)).size
        
        setLoginStats({
          totalLogins,
          successfulLogins,
          failedLogins,
          uniqueUsers
        })
      }
    } catch (error) {
      console.error('Error fetching login data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch('/api/admin/file-access?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFileAnalytics(data.fileAccessLogs)
        
        // Calculate summary from the logs
        const totalViews = data.fileAccessLogs.filter((log: any) => log.action === 'VIEW').length
        const totalDownloads = data.fileAccessLogs.filter((log: any) => log.action === 'DOWNLOAD').length
        const uniqueUsers = new Set(data.fileAccessLogs.map((log: any) => log.userId)).size
        const uniqueReports = new Set(data.fileAccessLogs.filter((log: any) => log.fileType === 'REPORT').map((log: any) => log.fileId)).size
        const recentActivity = data.fileAccessLogs.filter((log: any) => {
          const logTime = new Date(log.createdAt)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return logTime > oneDayAgo
        }).length
        
        setAnalyticsSummary({
          totalViews,
          totalDownloads,
          uniqueUsers,
          uniqueReports,
          recentActivity
        })
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const getLoginStatusColor = (success: boolean) => {
    return success ? 'bg-green-500' : 'bg-red-500'
  }

  const getLoginStatusIcon = (success: boolean) => {
    return success ? Shield : AlertTriangle
  }

  const getUserDisplayName = (log: LoginLog) => {
    if (log.user.player) {
      return log.user.player.name
    }
    if (log.user.staff) {
      return `${log.user.staff.firstName} ${log.user.staff.lastName}`
    }
    return log.user.name || log.email
  }

  const getUserInitials = (log: LoginLog) => {
    if (log.user.player) {
      const name = log.user.player.name
      const parts = name.split(' ')
      return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name[0]
    }
    if (log.user.staff) {
      const firstName = log.user.staff.firstName || ''
      const lastName = log.user.staff.lastName || ''
      if (firstName && lastName) {
        return `${firstName[0]}${lastName[0]}`
      }
      // Fallback to staff name if firstName/lastName not available
      const staffName = log.user.staff.name || ''
      const parts = staffName.split(' ')
      return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : staffName[0] || 'S'
    }
    const name = log.user.name || log.email
    const parts = name.split(' ')
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name[0]
  }

  const getUserAvatar = (log: LoginLog) => {
    if (log.user.player?.imageUrl) {
      return log.user.player.imageUrl
    }
    if (log.user.staff?.avatar) {
      return log.user.staff.avatar
    }
    return null
  }

  return (
    <div className="space-y-6" style={{ backgroundColor: colorScheme.background }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: colorScheme.text }}>Admin Dashboard</h1>
          <p style={{ color: colorScheme.textSecondary }}>Monitor and manage your athlete management system</p>
        </div>
        <button
          onClick={() => setShowTeamChat(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: colorScheme.primary,
            color: colorScheme.primaryText || 'white'
          }}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Team Chat</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: colorScheme.surface }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'overview' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'overview' ? colorScheme.primary : 'transparent',
            color: activeTab === 'overview' ? (colorScheme.primaryText || 'white') : colorScheme.text
          }}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics-links')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'analytics-links' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'analytics-links' ? colorScheme.primary : 'transparent',
            color: activeTab === 'analytics-links' ? (colorScheme.primaryText || 'white') : colorScheme.text
          }}
        >
          <LinkIcon className="h-4 w-4" />
          <span>Analytics Links</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Login Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Logins</p>
              <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>{loginStats.totalLogins}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Successful</p>
              <p className="text-2xl font-semibold" style={{ color: '#10B981' }}>{loginStats.successfulLogins}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Failed Attempts</p>
              <p className="text-2xl font-semibold" style={{ color: '#EF4444' }}>{loginStats.failedLogins}</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Active Users</p>
              <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>{loginStats.uniqueUsers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section, index) => (
          <Link key={index} href={section.href}>
            <div className="rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer" style={{ backgroundColor: colorScheme.surface }}>
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 ${section.color} rounded-lg flex items-center justify-center`}>
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>{section.title}</h3>
                    <p className="text-sm" style={{ color: colorScheme.textSecondary }}>{section.description}</p>
                  </div>
                </div>
                
                <div className="w-full text-left px-4 py-2 text-sm font-medium border rounded-md transition-colors" 
                     style={{ 
                       color: colorScheme.primary, 
                       borderColor: colorScheme.primary,
                       backgroundColor: colorScheme.primary + '10'
                     }}>
                  Manage {section.title}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Login Activity Monitoring */}
      <div className="rounded-lg shadow" style={{ backgroundColor: colorScheme.surface }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: colorScheme.border }}>
          <h3 className="text-lg font-medium" style={{ color: colorScheme.text }}>🔒 Login Activity Monitoring</h3>
          <p className="text-sm mt-1" style={{ color: colorScheme.textSecondary }}>
            Real-time tracking of all login attempts and user access patterns
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colorScheme.primary }}></div>
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
              <p className="text-lg font-medium" style={{ color: colorScheme.text }}>No login activity yet</p>
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>Login attempts will appear here once users start accessing the system</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loginLogs.map((log) => {
                const StatusIcon = getLoginStatusIcon(log.success)
                return (
                  <div key={log.id} className="flex items-center space-x-4 p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: colorScheme.background,
                         borderColor: colorScheme.border 
                       }}>
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 ${getLoginStatusColor(log.success)} rounded-full`}></div>
                    </div>
                    
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {getUserAvatar(log) ? (
                        <img
                          src={getUserAvatar(log)!}
                          alt={getUserDisplayName(log)}
                          className="w-10 h-10 rounded-full object-cover border-2"
                          style={{ borderColor: colorScheme.border }}
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white border-2"
                          style={{ 
                            backgroundColor: colorScheme.primary,
                            borderColor: colorScheme.border
                          }}
                        >
                          {getUserInitials(log)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium" style={{ color: colorScheme.text }}>
                          {getUserDisplayName(log)}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: log.role === 'ADMIN' ? '#EF444420' : 
                                               log.role === 'COACH' ? '#3B82F620' : '#10B98120',
                                color: log.role === 'ADMIN' ? '#EF4444' : 
                                       log.role === 'COACH' ? '#3B82F6' : '#10B981'
                              }}>
                          {log.role}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                        {log.success ? 'Successfully logged in' : `Failed login: ${log.failureReason}`}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" style={{ color: colorScheme.textSecondary }} />
                          <span className="text-xs" style={{ color: colorScheme.textSecondary }}>{log.ipAddress}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" style={{ color: colorScheme.textSecondary }} />
                          <span className="text-xs" style={{ color: colorScheme.textSecondary }}>{formatTimeAgo(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <StatusIcon className="h-5 w-5" style={{ color: log.success ? '#10B981' : '#EF4444' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* File Access Analytics */}
      <div className="rounded-lg shadow" style={{ backgroundColor: colorScheme.surface }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: colorScheme.border }}>
          <h3 className="text-lg font-medium" style={{ color: colorScheme.text }}>📊 File Access Analytics</h3>
          <p className="text-sm mt-1" style={{ color: colorScheme.textSecondary }}>
            Track who opens and downloads files from the Reports system
          </p>
        </div>
        <div className="p-6">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
              <div className="flex items-center">
                <Eye className="h-8 w-8 mr-3" style={{ color: '#3B82F6' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Views</p>
                  <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{analyticsSummary.totalViews}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
              <div className="flex items-center">
                <Download className="h-8 w-8 mr-3" style={{ color: '#10B981' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Downloads</p>
                  <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{analyticsSummary.totalDownloads}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
              <div className="flex items-center">
                <Users className="h-8 w-8 mr-3" style={{ color: '#F59E0B' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Active Users</p>
                  <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{analyticsSummary.uniqueUsers}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
              <div className="flex items-center">
                <FileText className="h-8 w-8 mr-3" style={{ color: '#8B5CF6' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Files Accessed</p>
                  <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{analyticsSummary.uniqueReports}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 mr-3" style={{ color: '#EF4444' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Last 24h</p>
                  <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{analyticsSummary.recentActivity}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent File Access Activity */}
          <div>
            <h4 className="text-md font-medium mb-4" style={{ color: colorScheme.text }}>Recent File Access Activity</h4>
            {fileAnalytics.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
                <p className="text-lg font-medium" style={{ color: colorScheme.text }}>No file access activity yet</p>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>File views and downloads will appear here once users start accessing reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fileAnalytics.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: colorScheme.background,
                         borderColor: colorScheme.border 
                       }}>
                    <div className="flex-shrink-0">
                      {activity.action === 'VIEW' ? (
                        <Eye className="h-5 w-5" style={{ color: '#3B82F6' }} />
                      ) : (
                        <Download className="h-5 w-5" style={{ color: '#10B981' }} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium" style={{ color: colorScheme.text }}>
                          {activity.user.name || activity.user.email}
                        </p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: activity.user.role === 'ADMIN' ? '#FEE2E2' : 
                                               activity.user.role === 'COACH' ? '#FEF3C7' : '#E5E7EB',
                                color: activity.user.role === 'ADMIN' ? '#DC2626' : 
                                       activity.user.role === 'COACH' ? '#D97706' : '#374151'
                              }}>
                          {activity.user.role}
                        </span>
                        <span className="text-sm font-medium" style={{ color: activity.action === 'VIEW' ? '#3B82F6' : '#10B981' }}>
                          {activity.action === 'VIEW' ? 'viewed' : 'downloaded'}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                        <span className="font-medium">{activity.fileName || 'Unknown File'}</span>
                        <span className="text-xs ml-2 px-2 py-1 rounded-full" style={{ backgroundColor: colorScheme.surface }}>
                          {activity.fileType}
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                        {formatTimeAgo(activity.createdAt)} • {activity.fileType} • {activity.ipAddress}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Analytics Links Tab */}
      {activeTab === 'analytics-links' && (
        <div className="space-y-6">
          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colorScheme.primary}20` }}>
                <LinkIcon className="h-6 w-6" style={{ color: colorScheme.primary }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>Analytics Links</h2>
                <p style={{ color: colorScheme.textSecondary }}>Download CSV data for Power BI integration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Analytics CSV */}
              <div className="border rounded-lg p-4" style={{ borderColor: colorScheme.border }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium" style={{ color: colorScheme.text }}>Event Analytics</h3>
                    <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                      Daily event data with type, count, and duration
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colorScheme.primary}20` }}>
                    <FileText className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    <strong>Format:</strong> Date, Event Type, Event Title, Count, Duration
                  </div>
                  <div className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    <strong>Data:</strong> Saved past days + live today (updated until 00:00)
                  </div>
                  <div className="text-xs" style={{ color: colorScheme.textSecondary }}>
                    <strong>Last Update:</strong> {new Date().toLocaleDateString()} at 00:00
                  </div>
                  <button
                    onClick={() => {
                      setCsvType('events')
                      setShowCSVModal(true)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: colorScheme.primary,
                      color: colorScheme.primaryText || 'white'
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>Get CSV Link</span>
                  </button>
                </div>
              </div>

              {/* Player Analytics CSV */}
              <div className="border rounded-lg p-4" style={{ borderColor: colorScheme.border }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium" style={{ color: colorScheme.text }}>Player Analytics</h3>
                    <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                      Player performance and activity data
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colorScheme.primary}20` }}>
                    <Users className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    <strong>Format:</strong> Date, Player Name, Availability Status
                  </div>
                  <div className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    <strong>Data:</strong> Saved past days + live today (updated until 00:00)
                  </div>
                  <div className="text-xs" style={{ color: colorScheme.textSecondary }}>
                    <strong>Last Update:</strong> {new Date().toLocaleDateString()} at 00:00
                  </div>
                  <button
                    onClick={() => {
                      setCsvType('players')
                      setShowCSVModal(true)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: colorScheme.primary,
                      color: colorScheme.primaryText || 'white'
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>Get CSV Link</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colorScheme.background }}>
              <h4 className="font-medium mb-2" style={{ color: colorScheme.text }}>Power BI Integration Instructions:</h4>
              <ol className="text-sm space-y-1" style={{ color: colorScheme.textSecondary }}>
                <li>1. Download the CSV files above</li>
                <li>2. In Power BI, go to "Get Data" → "Text/CSV"</li>
                <li>3. Select the downloaded CSV file</li>
                <li>4. Configure data types and relationships</li>
                <li>5. Create your visualizations</li>
              </ol>
            </div>

            {/* Manual Trigger Section */}
            <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
              <h4 className="font-medium mb-3" style={{ color: colorScheme.text }}>Manual Data Collection</h4>
              <p className="text-sm mb-4" style={{ color: colorScheme.textSecondary }}>
                Trigger manual data collection for a specific date. This is useful for backfilling missing data or testing.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="date"
                  id="collection-date"
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                  defaultValue=""
                />
                <button
                  onClick={async () => {
                    const dateInput = document.getElementById('collection-date') as HTMLInputElement
                    const date = dateInput.value
                    
                    try {
                      const response = await fetch('/api/analytics/trigger-collection', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ date })
                      })
                      
                      if (response.ok) {
                        alert('Data collection triggered successfully!')
                      } else {
                        alert('Failed to trigger data collection')
                      }
                    } catch (error) {
                      alert('Error triggering data collection')
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: colorScheme.primary,
                    color: colorScheme.primaryText || 'white'
                  }}
                >
                  Trigger Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Export Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colorScheme.surface }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                CSV Export Link
              </h3>
              <button
                onClick={() => setShowCSVModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                Use this link to import data into Power BI:
              </p>
              
              {/* CSV Link */}
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'https://ab-ams-app.vercel.app'}/api/analytics/${csvType}-csv`}
                  className="w-full p-3 border rounded-md text-sm font-mono resize-none"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const csvUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ab-ams-app.vercel.app'}/api/analytics/${csvType}-csv`
                    navigator.clipboard.writeText(csvUrl)
                    alert('Link copied to clipboard!')
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md font-medium transition-colors"
                  style={{ 
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </button>
                
                <button
                  onClick={() => window.open(`/api/analytics/${csvType}-csv`, '_blank')}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors"
                  style={{ 
                    backgroundColor: colorScheme.primary,
                    color: colorScheme.primaryText || 'white'
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Link</span>
                </button>
              </div>

              {/* Power BI Instructions */}
              <div className="mt-6 p-4 rounded-md" style={{ backgroundColor: colorScheme.background }}>
                <h4 className="font-medium mb-3" style={{ color: colorScheme.text }}>
                  Power BI Instructions:
                </h4>
                <ol className="text-sm space-y-1" style={{ color: colorScheme.textSecondary }}>
                  <li>1. Copy the link above</li>
                  <li>2. In Power BI, go to "Get Data" → "Web"</li>
                  <li>3. Paste the URL and click "OK"</li>
                  <li>4. The data will be imported automatically</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Chat Modal */}
      <TeamChat 
        isOpen={showTeamChat} 
        onClose={() => setShowTeamChat(false)} 
      />
    </div>
  )
}