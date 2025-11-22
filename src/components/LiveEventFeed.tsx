'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import CustomIcon from './CustomIcon'

interface Event {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  icon?: string
  iconName?: string
  type?: string
  color?: string
}

interface LiveEventFeedProps {
  playerId?: string
  userId?: string
  userRole?: string
}

export default function LiveEventFeed({ playerId, userId, userRole }: LiveEventFeedProps) {
  const { colorScheme } = useTheme()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default: today
    return new Date().toISOString().split('T')[0]
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today'
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow'
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Fetch events for selected date
  const fetchEvents = async (date: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Get user info to pass to API
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      let userId: string | null = null
      let userRole: string | null = null
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        userId = userData.id || userData.userId
        userRole = userData.role
      }
      
      // Fetch events with user filter for proper participant filtering
      const response = await fetch(`/api/events?date=${date}${userId ? `&userId=${userId}` : ''}${userRole ? `&userRole=${userRole}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const allEvents = await response.json()
        
        // Filter events by selected date
        let filteredEvents = allEvents.filter((event: any) => {
          // First, check if event is for the selected date
          const eventDate = event.date ? new Date(event.date).toISOString().split('T')[0] : null
          if (eventDate !== date) {
            return false // Skip events not for selected date
          }
          return true
        })
        
        // If playerId is provided, filter by player participation (for players)
        // If userId/userRole is provided but not PLAYER, show all events (for admin/staff)
        if (playerId) {
          filteredEvents = filteredEvents.filter((event: any) => {
            // Check if player is a participant
            // Check if event has selectedPlayers array
            if (event.selectedPlayers && Array.isArray(event.selectedPlayers)) {
              return event.selectedPlayers.includes(playerId)
            }
            // Check if event has participants array
            if (event.participants && Array.isArray(event.participants)) {
              return event.participants.some((p: any) => 
                p.id === playerId || p.playerId === playerId || (typeof p === 'string' && p === playerId)
              )
            }
            // Check event_participants if available
            if (event.event_participants && Array.isArray(event.event_participants)) {
              return event.event_participants.some((p: any) => 
                p.playerId === playerId || p.id === playerId
              )
            }
            return false
          })
        }
        // For admin/staff (userId provided but no playerId), show all events for the date (already filtered above)
        
        const playerEvents = filteredEvents

        // Map events to include color and icon (same as calendar)
        const mappedEvents = playerEvents.map((event: any) => ({
          ...event,
          color: event.color || getEventColor(event.type),
          icon: event.icon || event.iconName || 'Calendar'
        }))

        // Sort by startTime
        const sortedEvents = mappedEvents.sort((a: any, b: any) => {
          const timeA = a.startTime || '00:00'
          const timeB = b.startTime || '00:00'
          return timeA.localeCompare(timeB)
        })

        setEvents(sortedEvents)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchEvents(selectedDate)
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchEvents(selectedDate)
    }, 60000)

    return () => clearInterval(interval)
  }, [playerId, userId, userRole, selectedDate])

  // Auto-scroll animation
  useEffect(() => {
    if (loading || events.length === 0) return

    const container = scrollContainerRef.current
    if (!container) return

    const scrollContent = container.querySelector('.scroll-content') as HTMLElement
    if (!scrollContent) return

    // Wait for layout to calculate widths
    const startAnimation = () => {
      // Reset scroll position
      container.scrollLeft = 0

      // Calculate total width needed for seamless loop
      const totalWidth = scrollContent.scrollWidth
      const containerWidth = container.offsetWidth

      // Only animate if content is wider than container
      if (totalWidth <= containerWidth) {
        return
      }

      let startTime: number | null = null
      const duration = 120000 // 120 seconds (2 minutes) for full scroll - MUCH SLOWER
      const distance = totalWidth / 2 // Since we duplicate events, scroll half the distance

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = (elapsed / duration) % 1 // Use modulo for infinite loop
        
        // Linear animation for smooth continuous scroll
        container.scrollLeft = progress * distance

        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(startAnimation, 200)
    
    return () => {
      clearTimeout(timeoutId)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [events, loading])

  // Get event color (same as calendar)
  const getEventColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return '#F59E0B' // Orange
      case 'MATCH': return '#EF4444' // Red
      case 'MEETING': return '#3B82F6' // Blue
      case 'MEDICAL': return '#10B981' // Green
      case 'RECOVERY': return '#8B5CF6' // Purple
      case 'MEAL': return '#F97316' // Orange-red
      case 'REST': return '#6366F1' // Indigo
      case 'LB_GYM': return '#DC2626' // Dark Red
      case 'UB_GYM': return '#B91C1C' // Red
      case 'PRE_ACTIVATION': return '#EA580C' // Orange
      case 'REHAB': return '#059669' // Green
      case 'STAFF_MEETING': return '#1D4ED8' // Blue
      case 'VIDEO_ANALYSIS': return '#7C3AED' // Purple
      case 'DAY_OFF': return '#F59E0B' // Orange
      case 'TRAVEL': return '#06B6D4' // Cyan
      default: return '#6B7280' // Gray
    }
  }

  // Get event icon component (same as calendar)
  const getEventIcon = (event: Event) => {
    const iconName = event.icon || event.iconName || 'Calendar'
    const iconColor = event.color || getEventColor(event.type || '')
    return <CustomIcon name={iconName} className="h-5 w-5" style={{ color: iconColor }} />
  }

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    setShowDatePicker(false)
    setLoading(true)
  }

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate)
    if (direction === 'prev') {
      date.setDate(date.getDate() - 1)
    } else {
      date.setDate(date.getDate() + 1)
    }
    handleDateChange(date.toISOString().split('T')[0])
  }

  // Reset to today
  const resetToToday = () => {
    const today = new Date().toISOString().split('T')[0]
    handleDateChange(today)
  }

  if (loading) {
    return null // Don't show anything while loading
  }

  if (events.length === 0) {
    return null // Don't show if no events
  }

  // Duplicate events for seamless loop
  const duplicatedEvents = [...events, ...events]

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div 
      className="mx-0 mb-4 rounded-xl overflow-hidden shadow-lg w-full"
      style={{ 
        backgroundColor: colorScheme.surface,
        border: `1px solid ${colorScheme.border}`,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
      }}
    >
      {/* Header with Date Picker */}
      <div 
        className="px-4 py-3 flex items-center justify-between border-b relative"
        style={{ 
          borderColor: colorScheme.border,
          backgroundColor: colorScheme.primary + '15'
        }}
      >
        <div className="flex items-center space-x-2 flex-1">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colorScheme.primary }}
          />
          <span 
            className="text-sm font-semibold"
            style={{ color: colorScheme.text }}
          >
            {isToday ? "Today's Events" : `${formatDateDisplay(selectedDate)}'s Events`}
          </span>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center space-x-2">
          {/* Previous Day */}
          <button
            onClick={() => navigateDate('prev')}
            className="p-1 rounded-md transition-colors hover:bg-opacity-20"
            style={{ 
              color: colorScheme.textSecondary,
              backgroundColor: 'transparent'
            }}
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Date Picker Button */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-2 py-1 rounded-md text-xs font-medium transition-colors hover:bg-opacity-20 flex items-center space-x-1"
            style={{ 
              color: colorScheme.text,
              backgroundColor: colorScheme.primary + '20'
            }}
            title="Select date"
          >
            <Calendar className="h-3 w-3" />
            <span>{formatDateDisplay(selectedDate)}</span>
          </button>

          {/* Next Day */}
          <button
            onClick={() => navigateDate('next')}
            className="p-1 rounded-md transition-colors hover:bg-opacity-20"
            style={{ 
              color: colorScheme.textSecondary,
              backgroundColor: 'transparent'
            }}
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Reset to Today (if not today) */}
          {!isToday && (
            <button
              onClick={resetToToday}
              className="px-2 py-1 rounded-md text-xs font-medium transition-colors hover:bg-opacity-20"
              style={{ 
                color: colorScheme.primary,
                backgroundColor: colorScheme.primary + '20'
              }}
              title="Reset to today"
            >
              Today
            </button>
          )}
        </div>

        {/* Date Picker Dropdown */}
        {showDatePicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDatePicker(false)}
            />
            <div
              className="absolute right-4 top-full mt-2 z-20 rounded-lg shadow-lg border p-3"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border
              }}
            >
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
                className="w-full px-3 py-2 rounded-md border text-sm"
                style={{
                  backgroundColor: colorScheme.background,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Scrolling Events */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-hidden relative"
        style={{
          height: '80px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        <div 
          className="scroll-content flex items-center space-x-3 px-4 py-3"
          style={{ 
            width: 'max-content',
            willChange: 'transform'
          }}
        >
          {duplicatedEvents.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className="flex-shrink-0 px-4 py-2 rounded-lg border flex items-center space-x-3"
              style={{
                backgroundColor: colorScheme.background,
                borderColor: colorScheme.border,
                minWidth: '280px'
              }}
            >
              {/* Event Icon - Using CustomIcon (same as calendar) */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ backgroundColor: `${event.color}20` }}
              >
                <div style={{ color: event.color }}>
                  {getEventIcon(event)}
                </div>
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-sm font-semibold truncate"
                  style={{ color: colorScheme.text }}
                >
                  {event.title}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock 
                    className="h-3 w-3 flex-shrink-0" 
                    style={{ color: colorScheme.textSecondary }} 
                  />
                  <span 
                    className="text-xs"
                    style={{ color: colorScheme.textSecondary }}
                  >
                    {event.startTime} - {event.endTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
