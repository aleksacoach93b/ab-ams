'use client'

import React, { useState, useEffect } from 'react'
import { Users, Calendar, StickyNote, Clock, ArrowRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Activity {
  id: string
  type: 'player' | 'event' | 'note'
  title: string
  description?: string
  timestamp: Date
  link?: string
}

interface ActivityFeedProps {
  limit?: number
  showHeader?: boolean
  showViewAll?: boolean
  compact?: boolean
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 5, showHeader = true, showViewAll = true, compact = false }) => {
  const { colorScheme } = useTheme()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActivities()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchActivities = async () => {
    try {
      const [playersRes, eventsRes, notesRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/events'),
        fetch('/api/coach-notes/staff-notes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ])

      const allActivities: Activity[] = []

      // Process players (most recent first)
      if (playersRes.ok) {
        try {
          const players = await playersRes.json()
          if (Array.isArray(players)) {
            players.slice(0, 5).forEach((player: any) => {
              if (player && (player.createdAt || player.updatedAt)) {
                allActivities.push({
                  id: `player-${player.id}`,
                  type: 'player',
                  title: player.name || 'Unknown Player',
                  description: player.availabilityStatus ? `Status: ${player.availabilityStatus}` : undefined,
                  timestamp: new Date(player.updatedAt || player.createdAt),
                  link: `/dashboard/players/${player.id}`
                })
              }
            })
          }
        } catch (error) {
          console.error('Error processing players:', error)
        }
      }

      // Process events (most recent first)
      if (eventsRes.ok) {
        try {
          const events = await eventsRes.json()
          if (Array.isArray(events)) {
            events.slice(0, 5).forEach((event: any) => {
              if (event && (event.createdAt || event.startTime)) {
                allActivities.push({
                  id: `event-${event.id}`,
                  type: 'event',
                  title: event.title || 'Untitled Event',
                  description: event.type ? `Type: ${event.type}` : undefined,
                  timestamp: new Date(event.createdAt || event.startTime),
                  link: `/dashboard/calendar`
                })
              }
            })
          }
        } catch (error) {
          console.error('Error processing events:', error)
        }
      }

      // Process notes (most recent first)
      if (notesRes.ok) {
        try {
          const notesData = await notesRes.json()
          const notes = notesData.notes || notesData || []
          if (Array.isArray(notes)) {
            notes.slice(0, 5).forEach((note: any) => {
              if (note && (note.createdAt || note.updatedAt)) {
                allActivities.push({
                  id: `note-${note.id}`,
                  type: 'note',
                  title: note.title || 'Untitled Note',
                  description: note.author?.name ? `By: ${note.author.name}` : undefined,
                  timestamp: new Date(note.updatedAt || note.createdAt),
                  link: '/dashboard/notes'
                })
              }
            })
          }
        } catch (error) {
          console.error('Error processing notes:', error)
        }
      }

      // Sort by timestamp (most recent first) and limit
      const sortedActivities = allActivities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit || allActivities.length)

      setActivities(sortedActivities)
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'player':
        return <Users className="h-4 w-4" style={{ color: colorScheme.primary }} />
      case 'event':
        return <Calendar className="h-4 w-4" style={{ color: '#3B82F6' }} />
      case 'note':
        return <StickyNote className="h-4 w-4" style={{ color: '#F59E0B' }} />
      default:
        return <Clock className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className={compact ? "p-2" : "p-3 sm:p-4 rounded-lg border-2"} style={compact ? {} : { backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          <div className="h-4 bg-gray-200 rounded w-1/2" style={{ backgroundColor: colorScheme.border + '40' }}></div>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={compact ? "p-2" : "p-3 sm:p-4 rounded-lg border-2"} style={compact ? {} : { backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
        {showHeader && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold" style={{ color: colorScheme.text }}>Recent Activity</h3>
          </div>
        )}
        <p className="text-xs" style={{ color: colorScheme.textSecondary }}>No recent activity</p>
      </div>
    )
  }

  return (
    <div className={compact ? "" : "p-3 sm:p-4 rounded-lg border-2"} style={compact ? {} : { backgroundColor: colorScheme.surface, borderColor: `${colorScheme.border}E6` }}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: colorScheme.text }}>Recent Activity</h3>
          {showViewAll && (
            <button
              onClick={() => {
                // Navigate to a full activity page or expand view
                // For now, just scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: colorScheme.primary }}
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start gap-2 ${compact ? "p-1" : "p-2"} rounded hover:bg-opacity-50 transition-colors cursor-pointer`}
            style={{ 
              backgroundColor: activity.link ? `${colorScheme.primary}05` : 'transparent',
            }}
            onClick={() => {
              if (activity.link) {
                window.location.href = activity.link
              }
            }}
          >
            <div className="mt-0.5 flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${compact ? "text-xs" : "text-xs"} font-medium truncate`} style={{ color: colorScheme.text }}>
                {activity.title}
              </p>
              {activity.description && (
                <p className={`${compact ? "text-[10px]" : "text-[10px] sm:text-xs"} truncate`} style={{ color: colorScheme.textSecondary }}>
                  {activity.description}
                </p>
              )}
              <p className={`${compact ? "text-[10px]" : "text-[10px]"} mt-0.5`} style={{ color: colorScheme.textSecondary }}>
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActivityFeed

