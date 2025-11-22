'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Event {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
}

interface LiveEventFeedProps {
  playerId: string
}

export default function LiveEventFeed({ playerId }: LiveEventFeedProps) {
  const { colorScheme } = useTheme()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Fetch today's events for the player
  const fetchTodayEvents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const today = new Date().toISOString().split('T')[0]
      
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
      const response = await fetch(`/api/events?date=${today}${userId ? `&userId=${userId}` : ''}${userRole ? `&userRole=${userRole}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const allEvents = await response.json()
        
        // If API already filtered by participant, use all events
        // Otherwise, filter events where player is a participant
        let playerEvents = allEvents
        
        // Double-check filtering if needed
        if (userRole === 'PLAYER') {
          playerEvents = allEvents.filter((event: any) => {
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

        // Sort by startTime
        const sortedEvents = playerEvents.sort((a: any, b: any) => {
          const timeA = a.startTime || '00:00'
          const timeB = b.startTime || '00:00'
          return timeA.localeCompare(timeB)
        })

        setEvents(sortedEvents)
      }
    } catch (error) {
      console.error('Error fetching today events:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTodayEvents()
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchTodayEvents()
    }, 60000)

    return () => clearInterval(interval)
  }, [playerId])

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
      const duration = 50000 // 50 seconds for full scroll (slower, smoother)
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

  if (loading) {
    return null // Don't show anything while loading
  }

  if (events.length === 0) {
    return null // Don't show if no events
  }

  // Duplicate events for seamless loop
  const duplicatedEvents = [...events, ...events]

  return (
    <div 
      className="mx-4 mb-4 rounded-xl overflow-hidden shadow-lg"
      style={{ 
        backgroundColor: colorScheme.surface,
        border: `1px solid ${colorScheme.border}`,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ 
          borderColor: colorScheme.border,
          backgroundColor: colorScheme.primary + '15'
        }}
      >
        <div className="flex items-center space-x-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colorScheme.primary }}
          />
          <span 
            className="text-sm font-semibold"
            style={{ color: colorScheme.text }}
          >
            Today's Events
          </span>
        </div>
        <Calendar 
          className="h-4 w-4" 
          style={{ color: colorScheme.textSecondary }} 
        />
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
              {/* Event Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: colorScheme.primary + '20' }}
              >
                <Calendar 
                  className="h-5 w-5" 
                  style={{ color: colorScheme.primary }} 
                />
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

