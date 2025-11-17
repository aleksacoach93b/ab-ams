'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  User, 
  Activity, 
  AlertTriangle, 
  FileText, 
  FolderOpen, 
  Percent, 
  StickyNote, 
  X, 
  Eye, 
  Download,
  Bell,
  MessageCircle,
  BarChart3,
  Target,
  Zap,
  Heart,
  Trophy,
  Star,
  ChevronRight,
  Plus,
  Filter,
  Search,
  Settings,
  MoreVertical,
  MapPin
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

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
  performance?: {
    rating: number
    trend: 'up' | 'down' | 'stable'
    lastUpdated: string
  }
}

interface Event {
  id: string
  title: string
  description?: string
  type: string
  date: string
  startTime: string
  endTime: string
  location?: string
  participants: Player[]
  status: 'upcoming' | 'in-progress' | 'completed'
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  createdAt: string
  isRead: boolean
  category?: 'SYSTEM' | 'PLAYER' | 'EVENT' | 'WELLNESS' | 'CHAT' | 'REPORT' | 'GENERAL'
}

interface ModernDashboardProps {
  onNavigate?: (path: string) => void
}

export default function ModernDashboard({ onNavigate }: ModernDashboardProps) {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'events' | 'analytics'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  // Fetch notifications separately for real-time updates
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out chat notifications - they should be shown on chat icon
        const nonChatNotifications = (data.notifications || []).filter((notification: Notification) => 
          notification.category !== 'CHAT'
        )
        
        setNotifications(nonChatNotifications)
        setUnreadNotificationsCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    // Simulate real-time updates
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    
    // Listen for custom events to refresh data
    const handleRefreshEvents = () => {
      fetchDashboardData()
    }
    
    window.addEventListener('eventCreated', handleRefreshEvents)
    window.addEventListener('eventUpdated', handleRefreshEvents)
    window.addEventListener('eventDeleted', handleRefreshEvents)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('eventCreated', handleRefreshEvents)
      window.removeEventListener('eventUpdated', handleRefreshEvents)
      window.removeEventListener('eventDeleted', handleRefreshEvents)
    }
  }, [])

  // Real-time notifications polling
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
      // Poll for new notifications every 5 seconds for faster updates
      const notificationsInterval = setInterval(fetchNotifications, 5000)
      return () => clearInterval(notificationsInterval)
    }
  }, [user?.id])

  const fetchDashboardData = async () => {
    try {
      // Fetch players
      const playersResponse = await fetch('/api/players')
      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        setPlayers(playersData.map((player: any) => ({
          ...player,
          performance: {
            rating: 4, // Fixed value to avoid hydration mismatch
            trend: 'stable' as 'up' | 'down' | 'stable', // Fixed value to avoid hydration mismatch
            lastUpdated: new Date().toISOString()
          }
        })))
      }

      // Fetch events
      const eventsResponse = await fetch('/api/events')
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const processedEvents = eventsData.map((event: any) => ({
          ...event,
          status: getEventStatus(event.startTime, event.endTime)
        }))
        
        // Sort events by date and time
        const sortedEvents = processedEvents.sort((a: any, b: any) => {
          const dateA = new Date(`${a.date || a.startTime} ${a.startTime || ''}`)
          const dateB = new Date(`${b.date || b.startTime} ${b.startTime || ''}`)
          return dateA.getTime() - dateB.getTime()
        })
        
        setEvents(sortedEvents)
      }

      // Notifications are fetched separately via fetchNotifications()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventStatus = (startTime: string, endTime: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'in-progress'
    return 'completed'
  }

  const getEventColor = (type: string) => {
    const colors = {
      TRAINING: '#F59E0B',
      MATCH: '#EF4444',
      MEETING: '#3B82F6',
      MEDICAL: '#10B981',
      RECOVERY: '#8B5CF6',
      MEAL: '#F97316',
      REST: '#6366F1',
      LB_GYM: '#DC2626',
      UB_GYM: '#B91C1C',
      PRE_ACTIVATION: '#EA580C',
      REHAB: '#059669',
      STAFF_MEETING: '#1D4ED8',
      VIDEO_ANALYSIS: '#7C3AED',
      DAY_OFF: '#F59E0B',
      TRAVEL: '#06B6D4',
      OTHER: '#6B7280'
    }
    return colors[type as keyof typeof colors] || colors.OTHER
  }

  const formatEventType = (type: string) => {
    const typeMap = {
      'TRAINING': 'Training',
      'MATCH': 'Match',
      'MEETING': 'Meeting',
      'MEDICAL': 'Medical',
      'RECOVERY': 'Recovery',
      'MEAL': 'Meal',
      'REST': 'Rest',
      'LB_GYM': 'LB Gym',
      'UB_GYM': 'UB Gym',
      'PRE_ACTIVATION': 'Pre-Activation',
      'REHAB': 'Rehab',
      'STAFF_MEETING': 'Staff Meeting',
      'VIDEO_ANALYSIS': 'Video Analysis',
      'DAY_OFF': 'Day Off',
      'TRAVEL': 'Travel',
      'OTHER': 'Other'
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'FULLY_AVAILABLE': '#10B981',
      'ACTIVE': '#10B981',
      'PARTIAL_TRAINING': '#F59E0B',
      'INJURED': '#EF4444',
      'NOT_AVAILABLE': '#6B7280'
    }
    return colors[status as keyof typeof colors] || '#6B7280'
  }

  const getPerformanceIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead: true })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
        // Refresh notifications to update count
        setTimeout(() => fetchNotifications(), 500)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Use the unread count from API response
  const unreadNotifications = unreadNotificationsCount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>Loading modern dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colorScheme.background }}>
      {/* Modern Header with Glassmorphism */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-opacity-90 border-b" 
           style={{ 
             backgroundColor: `${colorScheme.surface}CC`,
             borderColor: colorScheme.border 
           }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                     style={{ 
                       background: `linear-gradient(135deg, ${colorScheme.primary}, ${colorScheme.primary}CC)`,
                       boxShadow: `0 8px 32px ${colorScheme.primary}40`
                     }}>
                  AB
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colorScheme.text }}>
                  Modern Dashboard
                </h1>
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  Real-time athlete management
                </p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                        style={{ color: colorScheme.textSecondary }} />
                <input
                  type="text"
                  placeholder="Search players, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                  style={{ 
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`,
                    focusRingColor: colorScheme.primary
                  }}
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl transition-all duration-200 hover:scale-105 relative"
                  style={{ backgroundColor: colorScheme.surface }}
                >
                  <Bell className="h-5 w-5" style={{ color: colorScheme.text }} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border z-50"
                       style={{ 
                         backgroundColor: colorScheme.surface,
                         borderColor: colorScheme.border 
                       }}>
                    <div className="p-4 border-b" style={{ borderColor: colorScheme.border }}>
                      <h3 className="font-semibold" style={{ color: colorScheme.text }}>
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                          <p style={{ color: colorScheme.textSecondary }}>No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                            className={`p-4 border-b transition-colors cursor-pointer hover:opacity-80 ${!notification.isRead ? 'bg-opacity-50' : ''}`}
                            style={{ 
                              borderColor: colorScheme.border,
                              backgroundColor: !notification.isRead ? `${colorScheme.primary}10` : 'transparent'
                            }}>
                            <div className="flex items-start space-x-3">
                              <div 
                                className="w-2 h-2 rounded-full mt-2"
                                style={{ 
                                  backgroundColor: !notification.isRead ? colorScheme.primary : colorScheme.border
                                }}
                              ></div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm" style={{ color: colorScheme.text }}>
                                  {notification.title}
                                </h4>
                                <p className="text-xs mt-1" style={{ color: colorScheme.textSecondary }}>
                                  {notification.message}
                                </p>
                                <p className="text-xs mt-2" style={{ color: colorScheme.textSecondary }}>
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <button className="px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: colorScheme.primary,
                        color: colorScheme.primaryText || 'white'
                      }}>
                <Plus className="h-4 w-4 inline mr-2" />
                Quick Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4">
        <div className="flex space-x-1 p-1 rounded-2xl" style={{ backgroundColor: colorScheme.surface }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'players', label: 'Players', icon: Users },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.id ? 'shadow-lg' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? colorScheme.primary : 'transparent',
                color: activeTab === tab.id ? (colorScheme.primaryText || 'white') : colorScheme.text
              }}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards with Animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  title: 'Total Players', 
                  value: players.length, 
                  icon: Users, 
                  color: '#3B82F6',
                  change: '+12%',
                  trend: 'up'
                },
                { 
                  title: 'Active Today', 
                  value: players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE' || p.availabilityStatus === 'ACTIVE').length, 
                  icon: Activity, 
                  color: '#10B981',
                  change: '+5%',
                  trend: 'up'
                },
                { 
                  title: 'Events Today', 
                  value: events.filter(e => e.status === 'upcoming' || e.status === 'in-progress').length, 
                  icon: Calendar, 
                  color: '#F59E0B',
                  change: '+2',
                  trend: 'stable'
                },
                { 
                  title: 'Avg Performance', 
                  value: players.length > 0 ? (players.reduce((acc, p) => acc + (p.performance?.rating || 0), 0) / players.length).toFixed(1) : '0.0', 
                  icon: Star, 
                  color: '#8B5CF6',
                  change: '+0.3',
                  trend: 'up'
                }
              ].map((stat, index) => (
                <div key={index} 
                     className="group p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl"
                     style={{ 
                       backgroundColor: colorScheme.surface,
                       borderColor: colorScheme.border
                     }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${stat.color}20` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    <div className="flex items-center space-x-1 text-sm font-medium"
                         style={{ color: stat.trend === 'up' ? '#10B981' : stat.trend === 'down' ? '#EF4444' : '#6B7280' }}>
                      {stat.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                      {stat.trend === 'down' && <TrendingUp className="h-4 w-4 rotate-180" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1" style={{ color: colorScheme.text }}>
                    {stat.value}
                  </h3>
                  <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events */}
              <div className="p-6 rounded-2xl border" 
                   style={{ 
                     backgroundColor: colorScheme.surface,
                     borderColor: colorScheme.border 
                   }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                    Upcoming Events
                  </h3>
                  <button className="text-sm font-medium" style={{ color: colorScheme.primary }}>
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {events.slice(0, 4).map((event) => (
                    <div key={event.id} 
                         className="flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                         style={{ backgroundColor: colorScheme.background }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                           style={{ backgroundColor: `${getEventColor(event.type)}20` }}>
                        <Calendar className="h-6 w-6" style={{ color: getEventColor(event.type) }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          {event.title}
                        </h4>
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          {new Date(event.date).toLocaleDateString()} • {event.startTime} • {event.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performers */}
              <div className="p-6 rounded-2xl border" 
                   style={{ 
                     backgroundColor: colorScheme.surface,
                     borderColor: colorScheme.border 
                   }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                    Top Performers
                  </h3>
                  <button className="text-sm font-medium" style={{ color: colorScheme.primary }}>
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {players
                    .filter(p => p.performance)
                    .sort((a, b) => (b.performance?.rating || 0) - (a.performance?.rating || 0))
                    .slice(0, 4)
                    .map((player, index) => (
                    <div key={player.id} 
                         className="flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                         style={{ backgroundColor: colorScheme.background }}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
                           style={{ 
                             backgroundColor: index < 3 ? '#F59E0B' : colorScheme.border,
                             color: index < 3 ? 'white' : colorScheme.text
                           }}>
                        {index + 1}
                      </div>
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} 
                             className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                             style={{ backgroundColor: colorScheme.primary }}>
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          {player.name}
                        </h4>
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          {player.position}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPerformanceIcon(player.performance?.trend || 'stable')}
                        <span className="font-semibold" style={{ color: colorScheme.text }}>
                          {player.performance?.rating}/5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {players.map((player) => (
                <div key={player.id} 
                     className="group p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl"
                     style={{ 
                       backgroundColor: colorScheme.surface,
                       borderColor: colorScheme.border
                     }}>
                  <div className="flex flex-col items-center text-center">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt={player.name} 
                           className="w-16 h-16 rounded-full object-cover mb-4 border-2"
                           style={{ borderColor: getStatusColor(player.availabilityStatus || player.status || '') }} />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-white mb-4 border-2"
                           style={{ 
                             backgroundColor: colorScheme.primary,
                             borderColor: getStatusColor(player.availabilityStatus || player.status || '')
                           }}>
                        {player.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    
                    <h3 className="font-semibold mb-2" style={{ color: colorScheme.text }}>
                      {player.name}
                    </h3>
                    
                    <p className="text-sm mb-3" style={{ color: colorScheme.textSecondary }}>
                      {player.position}
                    </p>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 rounded-full"
                           style={{ backgroundColor: getStatusColor(player.availabilityStatus || player.status || '') }}></div>
                      <span className="text-xs font-medium"
                            style={{ color: getStatusColor(player.availabilityStatus || player.status || '') }}>
                        {player.availabilityStatus || player.status}
                      </span>
                    </div>
                    
                    {player.performance && (
                      <div className="flex items-center space-x-1">
                        {getPerformanceIcon(player.performance.trend)}
                        <span className="text-sm font-medium" style={{ color: colorScheme.text }}>
                          {player.performance.rating}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Events List */}
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} 
                     className="p-6 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                     style={{ 
                       backgroundColor: colorScheme.surface,
                       borderColor: colorScheme.border
                     }}>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                         style={{ backgroundColor: `${getEventColor(event.type)}20` }}>
                      <Calendar className="h-8 w-8" style={{ color: getEventColor(event.type) }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                          {event.title}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${getEventColor(event.type)}20`,
                                color: getEventColor(event.type)
                              }}>
                          {formatEventType(event.type)}
                        </span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: colorScheme.textSecondary }}>
                        {event.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm" style={{ color: colorScheme.textSecondary }}>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                        {event.participants.length} participants
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  title: 'Performance Score', 
                  value: '4.2/5', 
                  icon: Star, 
                  color: '#F59E0B',
                  change: '+0.3',
                  trend: 'up'
                },
                { 
                  title: 'Attendance Rate', 
                  value: '92%', 
                  icon: Users, 
                  color: '#10B981',
                  change: '+5%',
                  trend: 'up'
                },
                { 
                  title: 'Wellness Score', 
                  value: '7.8/10', 
                  icon: Heart, 
                  color: '#EF4444',
                  change: '+0.2',
                  trend: 'up'
                }
              ].map((stat, index) => (
                <div key={index} 
                     className="p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl"
                     style={{ 
                       backgroundColor: colorScheme.surface,
                       borderColor: colorScheme.border
                     }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${stat.color}20` }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                    <div className="flex items-center space-x-1 text-sm font-medium"
                         style={{ color: stat.trend === 'up' ? '#10B981' : '#EF4444' }}>
                      {stat.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1" style={{ color: colorScheme.text }}>
                    {stat.value}
                  </h3>
                  <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Analytics Actions */}
            <div className="p-6 rounded-2xl border text-center"
                 style={{ 
                   backgroundColor: colorScheme.surface,
                   borderColor: colorScheme.border 
                 }}>
              <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.primary }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: colorScheme.text }}>
                Advanced Analytics Available
              </h3>
              <p className="text-sm mb-6" style={{ color: colorScheme.textSecondary }}>
                View detailed performance metrics, trends, and insights with our comprehensive analytics dashboard.
              </p>
              <button
                onClick={() => onNavigate?.('/dashboard/analytics')}
                className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: colorScheme.primaryText || 'white'
                }}
              >
                View Full Analytics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
