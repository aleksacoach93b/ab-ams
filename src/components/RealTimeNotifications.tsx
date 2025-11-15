'use client'

import React, { useState, useEffect } from 'react'
import { Bell, X, MessageCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  createdAt: string
  isRead: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category: 'SYSTEM' | 'PLAYER' | 'EVENT' | 'WELLNESS' | 'CHAT' | 'REPORT' | 'GENERAL'
  relatedId?: string
  relatedType?: string
}

interface RealTimeNotificationsProps {
  userId?: string
  userRole?: string
}

export default function RealTimeNotifications({ userId, userRole }: RealTimeNotificationsProps) {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

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
        // Also filter out read notifications - only show unread ones
        const nonChatNotifications = data.notifications.filter((notification: Notification) => 
          notification.category !== 'CHAT' && !notification.isRead
        )
        const nonChatUnreadCount = nonChatNotifications.length
        
        setNotifications(nonChatNotifications)
        setUnreadCount(nonChatUnreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
      
      // Poll for new notifications every 5 seconds for faster updates
      const interval = setInterval(fetchNotifications, 5000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const showToastNotification = (notification: Notification) => {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border max-w-sm transform transition-all duration-300 translate-x-full'
    toast.style.backgroundColor = colorScheme.surface
    toast.style.borderColor = colorScheme.border
    toast.style.color = colorScheme.text

    const icon = getNotificationIcon(notification.type)
    const iconColor = getNotificationColor(notification.type)

    toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0" style="color: ${iconColor}">
          ${icon}
        </div>
        <div class="flex-1">
          <h4 class="font-medium text-sm">${notification.title}</h4>
          <p class="text-xs mt-1" style="color: ${colorScheme.textSecondary}">${notification.message}</p>
        </div>
        <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `

    document.body.appendChild(toast)

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)'
    }, 100)

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast)
        }
      }, 300)
    }, 5000)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
      case 'WARNING':
        return '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>'
      case 'ERROR':
        return '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
      default:
        return '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return '#10B981'
      case 'WARNING': return '#F59E0B'
      case 'ERROR': return '#EF4444'
      default: return '#3B82F6'
    }
  }

  const markAsRead = async (notificationId: string) => {
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
        // Remove the notification from the list when marked as read
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        // Refresh to ensure sync
        setTimeout(() => fetchNotifications(), 500)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Clear all notifications when marked as read
        setNotifications([])
        setUnreadCount(0)
        // Refresh to ensure sync
        setTimeout(() => fetchNotifications(), 500)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#EF4444'
      case 'URGENT': return '#DC2626'
      case 'MEDIUM': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PLAYER': return '👤'
      case 'EVENT': return '📅'
      case 'WELLNESS': return '❤️'
      case 'SYSTEM': return '⚙️'
      case 'CHAT': return '💬'
      case 'REPORT': return '📊'
      default: return '💬'
    }
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl transition-all duration-200 hover:scale-105 relative"
          style={{ backgroundColor: colorScheme.surface }}
        >
          <Bell className="h-5 w-5" style={{ color: colorScheme.text }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown - Fixed positioning on mobile */}
        {isOpen && (
          <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-auto sm:mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[calc(100vw-2rem)] sm:max-w-96 rounded-2xl shadow-2xl border z-50 max-h-80 sm:max-h-96 overflow-hidden"
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b flex items-center justify-between" style={{ borderColor: colorScheme.border }}>
              <h3 className="font-semibold" style={{ color: colorScheme.text }}>
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium px-2 py-1 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: colorScheme.primary,
                      color: colorScheme.primaryText || 'white'
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ color: colorScheme.textSecondary }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-60 sm:max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 sm:p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                  <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} 
                       className={`p-4 border-b transition-all duration-200 hover:bg-opacity-50 ${
                         !notification.isRead ? 'bg-opacity-50' : ''
                       }`}
                       style={{ 
                         borderColor: colorScheme.border,
                         backgroundColor: !notification.isRead ? `${colorScheme.primary}10` : 'transparent'
                       }}>
                    <div className="flex items-start space-x-3">
                      {/* Priority indicator */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full"
                             style={{ backgroundColor: getPriorityColor(notification.priority) }}></div>
                      </div>
                      
                      {/* Category icon */}
                      <div className="flex-shrink-0 text-lg">
                        {getCategoryIcon(notification.category)}
                      </div>
                      
                      {/* Notification content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
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
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 rounded hover:bg-opacity-20 transition-colors"
                                style={{ color: colorScheme.primary }}
                                title="Mark as read"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 rounded hover:bg-opacity-20 transition-colors"
                              style={{ color: colorScheme.textSecondary }}
                              title="Delete"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t text-center" style={{ borderColor: colorScheme.border }}>
                <button 
                  className="text-sm font-medium" 
                  style={{ color: colorScheme.text }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
