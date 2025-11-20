'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye
} from 'lucide-react'
import CustomIcon from './CustomIcon'
import { useTheme } from '@/contexts/ThemeContext'

interface EventMedia {
  id: string
  name: string
  type: string
  url: string
  size?: number
  mimeType?: string
  uploadedAt: string
}

interface Event {
  id: string
  title: string
  type: string
  date: string
  startTime: string
  endTime: string
  location?: string
  description?: string
  color: string
  icon?: string
  media?: EventMedia[]
}

interface ReadOnlyCalendarProps {
  userId?: string
  userRole?: string
}

export default function ReadOnlyCalendar({ userId, userRole }: ReadOnlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { colorScheme } = useTheme()

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Ensure we have userId and userRole for filtering
        let finalUserId = userId
        let finalUserRole = userRole
        
        // If userId is provided but userRole is not, try to determine it
        // If userId doesn't look like a standard user ID, try fetching player data
        if (userId && !userRole) {
          // Try to fetch as player first
          try {
            const playerResponse = await fetch(`/api/players/${userId}`)
            if (playerResponse.ok) {
              const playerData = await playerResponse.json()
              // If we got player data, use the userId from player
              if (playerData.userId) {
                finalUserId = playerData.userId
                finalUserRole = 'PLAYER'
              }
            }
          } catch (err) {
            // If player fetch fails, try as staff
            try {
              const staffResponse = await fetch(`/api/staff/${userId}`)
              if (staffResponse.ok) {
                const staffData = await staffResponse.json()
                if (staffData.userId) {
                  finalUserId = staffData.userId
                  finalUserRole = 'STAFF'
                }
              }
            } catch (staffErr) {
              console.error('Error fetching user data for calendar:', err, staffErr)
            }
          }
        }
        
        const url = finalUserId && finalUserRole 
          ? `/api/events?userId=${finalUserId}&userRole=${finalUserRole}`
          : '/api/events'
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          const transformedEvents = data.map((event: any) => {
            // Use event.date for the date and event.startTime/endTime for times
            const eventDate = event.date ? new Date(event.date) : null
            const startTime = event.startTime || ''
            const endTime = event.endTime || ''
            
            // Format date in local timezone to avoid UTC conversion issues
            const formatLocalDate = (date: Date) => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }
            
            return {
              id: event.id,
              title: event.title,
              type: event.type,
              date: eventDate ? formatLocalDate(eventDate) : '',
              startTime: startTime,
              endTime: endTime,
              location: event.location?.name || event.location || '',
              description: event.description || '',
              color: getEventColor(event.type),
              icon: event.icon || event.iconName || 'Calendar',
              media: event.media || []
            }
          })
          setEvents(transformedEvents)
        }
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [userId, userRole])

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

  const getEventIcon = (event: Event) => {
    // Use the event icon if available, otherwise use Calendar as fallback
    // CRITICAL: Check both icon and iconName fields, and ensure we use the actual value
    const iconName = (event.icon && event.icon.trim() !== '') 
      ? event.icon.trim() 
      : ((event as any).iconName && (event as any).iconName.trim() !== '') 
        ? (event as any).iconName.trim() 
        : 'Calendar'
    console.log('🎨 [ReadOnlyCalendar] Rendering event icon:', { 
      eventTitle: event.title, 
      eventType: event.type,
      iconName, 
      hasIcon: !!event.icon,
      iconField: event.icon,
      iconNameField: (event as any).iconName,
      finalIconName: iconName
    })
    return <CustomIcon name={iconName} className="h-6 w-6" style={{ color: event.color }} />
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Convert to Monday-first week (0 = Sunday becomes 6, 1 = Monday becomes 0, etc.)
    const mondayFirstDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

    const days = []
    
    // Add empty cells for days before the first day of the month (Monday-first)
    for (let i = 0; i < mondayFirstDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Filter events for the date and sort by start time
    return events
      .filter(event => event.date === dateStr)
      .sort((a, b) => {
        // Parse start times (format: "HH:MM")
        const timeA = a.startTime || '00:00'
        const timeB = b.startTime || '00:00'
        return timeA.localeCompare(timeB)
      })
  }

  const getEventsForSelectedDate = () => {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Filter events for the selected date and sort by start time
    return events
      .filter(event => event.date === dateStr)
      .sort((a, b) => {
        // Sort events by start time
        const timeA = a.startTime.replace(':', '')
        const timeB = b.startTime.replace(':', '')
        return timeA.localeCompare(timeB)
      })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelectedDate = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // Monday first: Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const monthDays = getDaysInMonth(currentDate)
  const todayEvents = getEventsForSelectedDate()

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  return (
    <div 
      className="w-full"
      style={{ backgroundColor: colorScheme.surface }}
    >
      {/* Clean Month Navigation */}
      <div className="px-0 sm:px-4 py-4 w-full shadow-sm" style={{ backgroundColor: colorScheme.surface }}>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigateMonth('prev')} 
            className="p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: colorScheme.background,
              color: colorScheme.textSecondary,
              border: `1px solid ${colorScheme.border}`
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <h2 
              className="text-lg font-semibold tracking-tight"
              style={{ 
                color: colorScheme.text,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          
          <button 
            onClick={() => navigateMonth('next')} 
            className="p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: colorScheme.background,
              color: colorScheme.textSecondary,
              border: `1px solid ${colorScheme.border}`
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Calendar Grid */}
      <div className="px-0 sm:px-4 pb-4 w-full" style={{ backgroundColor: colorScheme.surface }}>
        <div className="rounded-2xl shadow-lg mx-0 sm:mx-4 overflow-hidden" style={{ backgroundColor: colorScheme.surface }}>
          {/* Day headers - Monday first */}
          <div 
            className="grid grid-cols-7 text-center text-xs font-semibold py-3"
            style={{ color: colorScheme.textSecondary }}
          >
            {days.map((day, index) => {
              // Debug: Log to ensure Monday is first
              if (index === 0) {
                console.log('📅 [ReadOnlyCalendar] First day in header:', day, 'Expected: M (Monday)')
              }
              return <div key={index} className="py-2">{day}</div>
            })}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 px-1 sm:px-2 pb-2">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-14"></div>
              }

              const dayIsToday = isToday(day)
              const dayIsSelected = isSelectedDate(day)
              const dayEvents = getEventsForDate(day)

              return (
                <div
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  className="h-14 flex flex-col items-center justify-center cursor-pointer relative rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md"
                  style={{
                    backgroundColor: dayIsSelected 
                      ? colorScheme.primary 
                      : dayIsToday 
                        ? `${colorScheme.primary}20`
                        : 'transparent',
                    border: dayIsSelected 
                      ? `2px solid ${colorScheme.primary}` 
                      : dayIsToday 
                        ? `2px solid ${colorScheme.primary}`
                        : 'none'
                  }}
                  onClick={() => setSelectedDate(day)}
                >
                  <div 
                    className={`text-xs font-medium ${
                      dayIsToday ? 'font-semibold' : ''
                    }`}
                    style={{ 
                      color: dayIsSelected 
                        ? '#FFFFFF' 
                        : dayIsToday 
                          ? colorScheme.primary 
                          : colorScheme.text 
                    }}
                  >
                    {day.getDate()}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: event.color }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Events Section */}
      <div 
        className="px-0 sm:px-4 pt-4 pb-4 w-full"
        style={{ backgroundColor: colorScheme.surface }}
      >
        <div className="flex flex-col items-center justify-center mb-4 relative mx-0 sm:mx-4">
          <div className="flex flex-col items-center justify-center w-full">
            <h3 
              className="text-sm font-medium text-center mb-2 tracking-wide"
              style={{ color: colorScheme.text }}
            >
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })} - {todayEvents.length} events
            </h3>
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-2 px-2 sm:px-4 mx-0 sm:mx-4 pb-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="animate-pulse p-3 rounded-lg"
                style={{ backgroundColor: colorScheme.surface }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: colorScheme.border }}
                  ></div>
                  <div className="flex-1 space-y-2">
                    <div 
                      className="h-3 rounded w-3/4"
                      style={{ backgroundColor: colorScheme.border }}
                    ></div>
                    <div 
                      className="h-2 rounded w-1/2"
                      style={{ backgroundColor: colorScheme.border }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : todayEvents.length === 0 ? (
          <div 
            className="text-center py-8 rounded-lg mx-0 sm:mx-4 mb-2"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <Calendar 
              className="h-8 w-8 mx-auto mb-3 opacity-50"
              style={{ color: colorScheme.textSecondary }}
            />
            <h4 
              className="text-base font-medium mb-2"
              style={{ color: colorScheme.text }}
            >
              No events scheduled
            </h4>
            <p 
              className="text-sm"
              style={{ color: colorScheme.textSecondary }}
            >
              This date is free.
            </p>
          </div>
        ) : (
          <div className="space-y-3 px-2 sm:px-4 mx-0 sm:mx-4 pb-2">
            {todayEvents.map((event, index) => (
              <div
                key={event.id}
                className="p-3 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.surface}, ${colorScheme.background})`,
                  border: `1px solid ${colorScheme.border}`,
                }}
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${event.color}20` }}
                  >
                    <div style={{ color: event.color }}>
                      {getEventIcon(event)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2"
                        style={{ 
                          backgroundColor: `${event.color}20`,
                          color: event.color
                        }}
                      >
                        {formatEventType(event.type)}
                      </span>
                    </div>
                    
                    <h4 
                      className="text-sm font-semibold mb-1"
                      style={{ color: colorScheme.text }}
                    >
                      {event.title}
                    </h4>
                    
                    {event.description && (
                      <div className="text-xs" style={{ color: colorScheme.textSecondary }}>
                        {event.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Start and End Times on the right */}
                  <div className="flex flex-col items-end text-right">
                    <div 
                      className="text-xs font-medium"
                      style={{ color: colorScheme.text }}
                    >
                      {event.startTime}
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {event.endTime}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Read-Only Event Modal */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div 
            className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ backgroundColor: colorScheme.surface }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Event Details
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ backgroundColor: colorScheme.errorLight, color: colorScheme.error }}
              >
                ✕
              </button>
            </div>

            {/* Event Content - READ ONLY */}
            <div className="space-y-6">
              {/* Event Header */}
              <div className="flex items-center space-x-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ backgroundColor: selectedEvent.color + '20' }}
                >
                  <div style={{ color: selectedEvent.color }}>
                    {getEventIcon(selectedEvent)}
                  </div>
                </div>
                <div>
                  <h4 
                    className="text-xl font-semibold"
                    style={{ color: colorScheme.text }}
                  >
                    {selectedEvent.title}
                  </h4>
                  <p 
                    className="text-sm"
                    style={{ color: colorScheme.textSecondary }}
                  >
                    {selectedEvent.type}
                  </p>
                </div>
              </div>

              {/* Event Details */}
              <div 
                className="rounded-lg p-4"
                style={{ backgroundColor: colorScheme.background }}
              >
                <h5 
                  className="font-medium mb-3"
                  style={{ color: colorScheme.text }}
                >
                  Event Information
                </h5>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar 
                      className="h-4 w-4" 
                      style={{ color: colorScheme.textSecondary }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: colorScheme.text }}
                    >
                      {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock 
                      className="h-4 w-4" 
                      style={{ color: colorScheme.textSecondary }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: colorScheme.text }}
                    >
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </span>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin 
                        className="h-4 w-4" 
                        style={{ color: colorScheme.textSecondary }}
                      />
                      <span 
                        className="text-sm"
                        style={{ color: colorScheme.text }}
                      >
                        {selectedEvent.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div 
                  className="rounded-lg p-4"
                  style={{ backgroundColor: colorScheme.background }}
                >
                  <h5 
                    className="font-medium mb-3"
                    style={{ color: colorScheme.text }}
                  >
                    Description
                  </h5>
                  <p 
                    className="text-sm"
                    style={{ color: colorScheme.text }}
                  >
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: colorScheme.border }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: colorScheme.primary,
                    color: 'white'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
