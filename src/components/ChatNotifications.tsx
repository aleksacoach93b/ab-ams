'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
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

interface ChatNotificationsProps {
  onOpenChat: () => void
}

export default function ChatNotifications({ onOpenChat }: ChatNotificationsProps) {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [chatNotifications, setChatNotifications] = useState<Notification[]>([])
  const [unreadChatCount, setUnreadChatCount] = useState(0)


  const fetchChatNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('⚠️ [CHAT NOTIFICATIONS] No token found')
        return
      }

      const response = await fetch('/api/notifications?limit=100&unreadOnly=false', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        console.log('📱 [CHAT NOTIFICATIONS] Fetched notifications:', {
          total: data.notifications?.length || 0,
          allNotifications: data.notifications
        })
        
        // Filter only chat notifications
        const chatOnlyNotifications = (data.notifications || []).filter((notification: Notification) => {
          const isChat = notification.category === 'CHAT'
          if (!isChat && notification.category) {
            console.log('🔍 [CHAT NOTIFICATIONS] Non-chat notification:', notification.category, notification.title)
          }
          return isChat
        })
        
        const unreadChatNotifications = chatOnlyNotifications.filter((notification: Notification) => 
          !notification.isRead
        )
        
        console.log('📱 [CHAT NOTIFICATIONS] Filtered results:', {
          chatOnly: chatOnlyNotifications.length,
          unread: unreadChatNotifications.length,
          chatNotifications: chatOnlyNotifications
        })
        
        setChatNotifications(chatOnlyNotifications)
        setUnreadChatCount(unreadChatNotifications.length)
      } else {
        const errorText = await response.text()
        console.error('❌ [CHAT NOTIFICATIONS] Failed to fetch:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ [CHAT NOTIFICATIONS] Error fetching:', error)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchChatNotifications()
      
      // Poll for new chat notifications every 5 seconds for faster updates
      const interval = setInterval(fetchChatNotifications, 5000)
      
      // Also refresh when chat is closed
      const handleChatClosed = () => {
        fetchChatNotifications()
      }
      window.addEventListener('chat-closed', handleChatClosed)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('chat-closed', handleChatClosed)
      }
    }
  }, [user?.id])

  const markChatNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Mark all unread chat notifications as read
      const unreadChatIds = chatNotifications
        .filter(notification => !notification.isRead)
        .map(notification => notification.id)

      if (unreadChatIds.length > 0) {
        await Promise.all(
          unreadChatIds.map(id =>
            fetch(`/api/notifications/${id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ isRead: true })
            })
          )
        )
        
        // Refresh notifications
        fetchChatNotifications()
      }
    } catch (error) {
      console.error('Error marking chat notifications as read:', error)
    }
  }

  const handleChatClick = async () => {
    // Mark chat notifications as read when opening chat
    await markChatNotificationsAsRead()
    // Refresh count immediately
    setTimeout(() => fetchChatNotifications(), 300)
    onOpenChat()
  }

  return (
    <div className="relative">
      <button
        onClick={handleChatClick}
        className="p-2 rounded-md transition-colors hover:scale-105 relative"
        style={{ 
          backgroundColor: 'transparent',
          color: colorScheme.text,
        }}
        title="Team Chat"
      >
        <MessageCircle className="h-5 w-5" style={{ color: colorScheme.text }} />
        {unreadChatCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg z-10"
            style={{ 
              backgroundColor: '#ef4444',
              fontSize: '11px',
              lineHeight: '1.2'
            }}
          >
            {unreadChatCount > 99 ? '99+' : unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </button>
    </div>
  )
}
