'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, BarChart3, TrendingUp, Users, Clock, Activity, RefreshCw } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import CustomIcon from './CustomIcon'

interface EventAnalyticsProps {
  userId?: string
  userRole?: string
}

interface EventStats {
  totalEvents: number
  avgDuration: number
  avgParticipation: number
  mostPopularType: string
  eventTypesDistribution: {
    type: string
    count: number
    percentage: number
  }[]
  eventsByDate: {
    date: string
    count: number
  }[]
  participationTrend: {
    date: string
    participation: number
  }[]
}

export default function EventAnalytics({ userId, userRole }: EventAnalyticsProps) {
  const { colorScheme } = useTheme()
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: '', // Will be set in useEffect to avoid hydration mismatch
    to: '' // Will be set in useEffect to avoid hydration mismatch
  })

  // Set date range after component mounts to avoid hydration mismatch
  useEffect(() => {
    setDateRange({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
      to: new Date().toISOString().split('T')[0] // today
    })
  }, [])

  const fetchEventAnalytics = async () => {
    setLoading(true)
    try {
      console.log('📊 Fetching analytics for date range:', dateRange)
      
      // Validate date range
      if (!dateRange.from || !dateRange.to) {
        console.error('📊 Invalid date range:', dateRange)
        return
      }
      
      const startDate = new Date(dateRange.from + 'T00:00:00')
      const endDate = new Date(dateRange.to + 'T23:59:59')
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('📊 Invalid dates:', { startDate, endDate })
        return
      }
      
      // Fetch live events data directly from the events API
      const eventsResponse = await fetch('/api/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (eventsResponse.ok) {
        const events = await eventsResponse.json()
        console.log('📊 Live events data:', events)
        
        // Filter events by date range
        const filteredEvents = events.filter((event: any) => {
          const eventDate = new Date(event.date)
          return eventDate >= startDate && eventDate <= endDate
        })
        
        console.log('📊 Filtered events for date range:', filteredEvents)
        
        // Process the live events data
        const analytics = calculateAnalytics(filteredEvents)
        console.log('📊 Processed analytics:', analytics)
        setEventStats(analytics)
      } else {
        console.error('Failed to fetch events')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch analytics if dateRange has valid values
    if (dateRange.from && dateRange.to) {
      fetchEventAnalytics()
    }
  }, [dateRange])

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getEventTypeColor = (type: string) => {
    const colors = {
      'TRAINING': '#F59E0B', // Orange
      'MATCH': '#EF4444', // Red
      'MEETING': '#3B82F6', // Blue
      'MEDICAL': '#10B981', // Green
      'RECOVERY': '#8B5CF6', // Purple
      'MEAL': '#F97316', // Orange-red
      'REST': '#6366F1', // Indigo
      'LB_GYM': '#DC2626', // Dark Red
      'UB_GYM': '#B91C1C', // Red
      'PRE_ACTIVATION': '#EA580C', // Orange
      'REHAB': '#059669', // Green
      'STAFF_MEETING': '#1D4ED8', // Blue
      'VIDEO_ANALYSIS': '#7C3AED', // Purple
      'DAY_OFF': '#F59E0B', // Orange
      'TRAVEL': '#06B6D4', // Cyan
      'OTHER': '#6B7280' // Gray
    }
    return colors[type as keyof typeof colors] || '#6B7280'
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

  const getEventTypeIcon = (type: string) => {
    const iconMap = {
      'TRAINING': 'Dumbbell',
      'MATCH': 'FootballBall',
      'MEETING': 'Meeting',
      'MEDICAL': 'BloodSample',
      'RECOVERY': 'Recovery',
      'MEAL': 'MealPlate',
      'REST': 'BedTime',
      'LB_GYM': 'Dumbbell',
      'UB_GYM': 'Dumbbell',
      'PRE_ACTIVATION': 'WarmUp',
      'REHAB': 'Recovery',
      'STAFF_MEETING': 'Meeting',
      'VIDEO_ANALYSIS': 'Video',
      'DAY_OFF': 'BedTime',
      'TRAVEL': 'Bus',
      'OTHER': 'Calendar'
    }
    return iconMap[type as keyof typeof iconMap] || 'Calendar'
  }

  const processAnalyticsData = (analyticsData: any[]): EventStats => {
    // Validate input data
    if (!Array.isArray(analyticsData)) {
      console.error('📊 Invalid analytics data:', analyticsData)
      return {
        totalEvents: 0,
        avgDuration: 0,
        avgParticipation: 0,
        mostPopularType: 'N/A',
        eventTypesDistribution: [],
        eventsByDate: [],
        participationTrend: []
      }
    }

    // Process daily analytics data
    const totalEvents = analyticsData.reduce((sum, item) => sum + (item.count || 0), 0)
    
    // Calculate average duration
    const validDurationItems = analyticsData.filter(item => item.avgDuration && !isNaN(item.avgDuration))
    const avgDuration = validDurationItems.length > 0 
      ? Math.round(validDurationItems.reduce((sum, item) => sum + item.avgDuration, 0) / validDurationItems.length)
      : 0

    // Event types distribution
    const eventTypesDistribution = analyticsData
      .filter(item => item.eventType && item.count)
      .map(item => ({
        type: item.eventType,
        count: item.count || 0,
        icon: getEventTypeIcon(item.eventType),
        percentage: totalEvents > 0 ? Math.round(((item.count || 0) / totalEvents) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    // Most popular event type
    const mostPopularType = eventTypesDistribution.length > 0 
      ? eventTypesDistribution[0].type 
      : 'N/A'

    // Events by date
    const eventsByDate = analyticsData.reduce((acc, item) => {
      if (!item.date) return acc
      const date = new Date(item.date)
      if (isNaN(date.getTime())) return acc
      const dateStr = date.toISOString().split('T')[0]
      acc[dateStr] = (acc[dateStr] || 0) + (item.count || 0)
      return acc
    }, {} as Record<string, number>)

    const eventsByDateArray = Object.entries(eventsByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Participation trend (simplified for daily analytics)
    const participationTrend = analyticsData
      .filter(item => item.date && !isNaN(new Date(item.date).getTime()))
      .map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        participation: 100 // Assume 100% participation for saved data
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      totalEvents,
      avgDuration,
      avgParticipation: 100, // Assume 100% for saved data
      mostPopularType,
      eventTypesDistribution,
      eventsByDate: eventsByDateArray,
      participationTrend
    }
  }

  const calculateAnalytics = (events: any[]): EventStats => {
    const totalEvents = events.length
    
    // Calculate average duration
    const avgDuration = totalEvents > 0 
      ? Math.round(events.reduce((sum, event) => {
          if (event.startTime && event.endTime) {
            const start = new Date(`2000-01-01T${event.startTime}`)
            const end = new Date(`2000-01-01T${event.endTime}`)
            const duration = (end.getTime() - start.getTime()) / (1000 * 60) // minutes
            return sum + duration
          }
          return sum
        }, 0) / totalEvents)
      : 0

    // Calculate average participation (based on actual participants)
    const avgParticipation = totalEvents > 0
      ? Math.round((events.reduce((sum, event) => {
          const totalParticipants = event.participants?.length || 0
          const participationRate = totalParticipants > 0 ? 100 : 0
          return sum + participationRate
        }, 0) / totalEvents) * 10) / 10
      : 0

    // Event types distribution with proper labels
    const eventTypes = events.reduce((acc, event) => {
      const type = event.type || 'OTHER'
      const typeLabel = formatEventType(type) // Use the formatted label
      if (!acc[typeLabel]) {
        acc[typeLabel] = {
          count: 0,
          icon: event.iconName || event.icon || getEventTypeIcon(type),
          originalType: type // Store the original type for color lookup
        }
      }
      acc[typeLabel].count += 1
      return acc
    }, {} as Record<string, { count: number, icon: string, originalType: string }>)
    

    const eventTypesDistribution = Object.entries(eventTypes).map(([type, data]) => ({
      type,
      count: data.count,
      icon: data.icon,
      originalType: data.originalType, // Include original type
      percentage: totalEvents > 0 ? Math.round((data.count / totalEvents) * 100) : 0
    })).sort((a, b) => b.count - a.count)

    // Most popular event type
    const mostPopularType = eventTypesDistribution.length > 0 
      ? eventTypesDistribution[0].type 
      : 'N/A'

    // Events by date
    const eventsByDate = events.reduce((acc, event) => {
      const date = new Date(event.date).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByDateArray = Object.entries(eventsByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Participation trend
    const participationTrend = events.map(event => {
      const totalParticipants = event.participants?.length || 0
      const participationRate = totalParticipants > 0 ? 100 : 0
      
      return {
        date: new Date(event.date).toISOString().split('T')[0],
        participation: participationRate
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      totalEvents,
      avgDuration,
      avgParticipation,
      mostPopularType,
      eventTypesDistribution,
      eventsByDate: eventsByDateArray,
      participationTrend
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 rounded w-1/3" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          <div className="h-32 rounded w-full" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
            <div className="h-24 rounded" style={{ backgroundColor: colorScheme.border + '40' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selection - In container */}
      <div className="rounded-lg shadow-sm p-6 border space-y-4" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="text-center">
          <h2 
            className="text-xl font-semibold tracking-tight" 
            style={{ 
              color: colorScheme.text,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            Event Analytics
          </h2>
        </div>

        {/* Date Range Picker - Centered */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Calendar className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: colorScheme.textSecondary }}>
              Date Range:
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm flex-shrink-0"
              style={{ 
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border,
                color: colorScheme.text
              }}
            />
            <span className="text-sm whitespace-nowrap" style={{ color: colorScheme.textSecondary }}>
              to
            </span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm flex-shrink-0"
              style={{ 
                backgroundColor: colorScheme.surface,
                borderColor: colorScheme.border,
                color: colorScheme.text
              }}
            />
            
            <button
              onClick={fetchEventAnalytics}
              className="p-2 rounded-lg transition-colors hover:bg-opacity-20 flex-shrink-0"
              style={{ 
                color: colorScheme.text,
                backgroundColor: 'transparent'
              }}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {eventStats ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Event Types Distribution */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <h3 
              className="text-xl font-semibold mb-4 tracking-tight text-center" 
              style={{ 
                color: colorScheme.text,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Event Types Distribution
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventStats.eventTypesDistribution.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between p-3 rounded-lg shadow-md border hover:shadow-lg transition-all duration-300 hover:scale-105" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
                  <div className="flex items-center space-x-3">
                    <CustomIcon 
                      name={item.icon} 
                      className="w-4 h-4" 
                      style={{ color: getEventTypeColor(item.originalType) }} 
                    />
                    <span className="text-sm font-medium tracking-wide" style={{ color: colorScheme.text }}>
                      {item.type}
                    </span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: colorScheme.textSecondary }}>
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Statistics */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <h3 
              className="text-xl font-semibold mb-4 tracking-tight text-center" 
              style={{ 
                color: colorScheme.text,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Event Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg shadow-md border hover:shadow-lg transition-all duration-300 hover:scale-105" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  <span className="text-sm font-medium tracking-wide" style={{ color: colorScheme.text }}>
                    Total Events
                  </span>
                </div>
                <span className="text-base font-semibold" style={{ color: colorScheme.textSecondary }}>
                  {eventStats.totalEvents}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg shadow-md border hover:shadow-lg transition-all duration-300 hover:scale-105" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  <span className="text-sm font-medium tracking-wide" style={{ color: colorScheme.text }}>
                    Avg Duration
                  </span>
                </div>
                <span className="text-base font-semibold" style={{ color: colorScheme.textSecondary }}>
                  {eventStats.avgDuration} min
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg shadow-md border hover:shadow-lg transition-all duration-300 hover:scale-105" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  <span className="text-sm font-medium tracking-wide" style={{ color: colorScheme.text }}>
                    Avg Participation
                  </span>
                </div>
                <span className="text-base font-semibold" style={{ color: colorScheme.textSecondary }}>
                  {eventStats.avgParticipation}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg shadow-md border hover:shadow-lg transition-all duration-300 hover:scale-105" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5" style={{ color: colorScheme.primary }} />
                  <span className="text-sm font-medium tracking-wide" style={{ color: colorScheme.text }}>
                    Most Popular
                  </span>
                </div>
                <span className="text-base font-semibold" style={{ color: colorScheme.textSecondary }}>
                  {formatEventType(eventStats.mostPopularType)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
              No event data available for the selected date range
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
