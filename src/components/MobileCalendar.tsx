'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Filter,
  Grid3X3,
  List,
  Eye,
  EyeOff
} from 'lucide-react'
import CustomIcon from './CustomIcon'
import EventModal from './EventModal'
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
  selectedPlayers?: string[]
  selectedStaff?: string[]
}

interface MobileCalendarProps {
  onEventClick?: (event: Event) => void
  onAddEvent?: () => void
  user?: {
    role?: string
    id?: string
  } | null
  staffPermissions?: {
    canCreateEvents?: boolean
    canEditEvents?: boolean
    canDeleteEvents?: boolean
  }
  showAddButtons?: boolean
}

export default function MobileCalendar({ onEventClick, onAddEvent, user, staffPermissions, showAddButtons = true }: MobileCalendarProps) {
  // ALWAYS log when component mounts/renders
  console.log('🚀 [MobileCalendar] Component MOUNTED/RENDERED at:', new Date().toISOString())
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const { colorScheme } = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Check if user can manage events
  const canManageEvents = () => {
    if (!showAddButtons) return false
    if (user?.role === 'ADMIN' || user?.role === 'COACH') {
      return true
    }
    if (user?.role === 'STAFF' && staffPermissions?.canCreateEvents) {
      return true
    }
    return false
  }
  
  // Modern UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        const transformedEvents = data.map((event: any) => {
          // Parse the event date from the API response
          // API can return date as string (YYYY-MM-DD) or we need to extract from startTime
          let eventDate: Date | null = null
          if (event.date) {
            eventDate = new Date(event.date)
          } else if (event.startTime) {
            eventDate = new Date(event.startTime)
          }
          
          // Format date in local timezone to avoid UTC conversion issues
          const formatLocalDate = (date: Date) => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
          
          // Extract time from ISO string or use as-is if already in HH:MM format
          const extractTime = (timeStr: string | null | undefined): string => {
            if (!timeStr) return ''
            // If already in HH:MM format, return as-is
            if (/^\d{2}:\d{2}$/.test(timeStr)) {
              return timeStr
            }
            // If ISO string, extract time part
            if (timeStr.includes('T')) {
              const date = new Date(timeStr)
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              return `${hours}:${minutes}`
            }
            return timeStr
          }
          
          // Extract participant IDs from the participants array
          const selectedPlayers = event.participants
            ?.filter((p: any) => p.playerId)
            ?.map((p: any) => p.playerId) || []
          
          const selectedStaff = event.participants
            ?.filter((p: any) => p.staffId)
            ?.map((p: any) => p.staffId) || []

          const transformedEvent = {
            id: event.id,
            title: event.title,
            type: event.type, // Preserve original type from API - DO NOT TRANSFORM
            date: eventDate ? formatLocalDate(eventDate) : '',
            startTime: extractTime(event.startTime),
            endTime: extractTime(event.endTime),
            location: event.location?.name || event.location || '',
            description: event.description || '',
            color: getEventColor(event.type),
            icon: event.icon || event.iconName || 'Calendar', // Use icon or iconName, fallback to Calendar
            media: event.media || [],
            selectedPlayers,
            selectedStaff
          }
          
          // Log if type is missing or seems incorrect
          if (!transformedEvent.type) {
            console.warn('⚠️ [MobileCalendar] Event missing type:', {
              eventId: event.id,
              title: event.title,
              originalType: event.type
            })
          }
          
          return transformedEvent
        })
        setEvents(transformedEvents)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    
    // Listen for custom event to refresh events list
    const handleRefreshEvents = () => {
      fetchEvents()
    }
    
    window.addEventListener('eventCreated', handleRefreshEvents)
    window.addEventListener('eventUpdated', handleRefreshEvents)
    window.addEventListener('eventDeleted', handleRefreshEvents)
    
    return () => {
      window.removeEventListener('eventCreated', handleRefreshEvents)
      window.removeEventListener('eventUpdated', handleRefreshEvents)
      window.removeEventListener('eventDeleted', handleRefreshEvents)
    }
  }, [])

  const getEventColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return '#F59E0B' // Orange
      case 'MATCH': return '#EF4444' // Red
      case 'MEETING': return '#3B82F6' // Blue
      case 'MEDICAL': return '#10B981' // Green
      case 'RECOVERY': return '#8B5CF6' // Purple
      case 'MEAL': return '#F97316' // Orange-Red (distinct from training)
      case 'REST': return '#6366F1' // Indigo
      case 'LB_GYM': return '#DC2626' // Dark Red
      case 'UB_GYM': return '#B91C1C' // Red
      case 'PRE_ACTIVATION': return '#EA580C' // Orange
      case 'REHAB': return '#059669' // Green
      case 'STAFF_MEETING': return '#1D4ED8' // Blue
      case 'VIDEO_ANALYSIS': return '#7C3AED' // Purple
      case 'DAY_OFF': return '#F59E0B' // Orange
      case 'TRAVEL': return '#06B6D4' // Cyan
      case 'OTHER': return '#6B7280' // Gray
      default: return '#6B7280' // Gray
    }
  }

  const getEventIcon = (event: Event) => {
    // Use the event icon if available, otherwise use Calendar as fallback
    const iconName = event.icon || 'Calendar'
    console.log('🎨 [MobileCalendar] Rendering event icon:', { 
      eventTitle: event.title, 
      eventType: event.type,
      iconName, 
      hasIcon: !!event.icon,
      iconField: event.icon,
      iconNameField: (event as any).iconName
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
    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    const mondayFirstDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

    // Debug log
    console.log('📅 [MobileCalendar] getDaysInMonth:', {
      month: month + 1,
      year,
      firstDayOfMonth: firstDay.toLocaleDateString(),
      startingDayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startingDayOfWeek],
      mondayFirstDay,
      expectedEmptyCells: mondayFirstDay
    })

    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month (Monday-first)
    for (let i = 0; i < mondayFirstDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    // Ensure we always have a multiple of 7 days for proper grid layout
    const totalCells = days.length
    const remainingCells = totalCells % 7
    if (remainingCells !== 0) {
      const cellsToAdd = 7 - remainingCells
      for (let i = 0; i < cellsToAdd; i++) {
        days.push(null)
      }
    }
    
    // Debug: Verify first non-null day
    const firstActualDay = days.find(d => d !== null)
    if (firstActualDay) {
      const firstDayOfWeek = firstActualDay.getDay()
      console.log('📅 [MobileCalendar] First actual day in grid:', {
        date: firstActualDay.toLocaleDateString(),
        dayOfWeek: firstDayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][firstDayOfWeek],
        shouldBeMonday: firstDayOfWeek === 1,
        emptyCellsBefore: mondayFirstDay
      })
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return events.filter(event => event.date === dateStr)
  }

  const getEventsForSelectedDate = () => {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    let filteredEvents = events.filter(event => event.date === dateStr)
    
    // Apply type filters if any are selected
    if (selectedEventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        selectedEventTypes.includes(event.type)
      )
    }
    
    // Sort events by start time
    filteredEvents.sort((a, b) => {
      const timeA = a.startTime.replace(':', '')
      const timeB = b.startTime.replace(':', '')
      return timeA.localeCompare(timeB)
    })
    
    return filteredEvents
  }

  // Get unique event types for filtering
  const getEventTypes = () => {
    const types = [...new Set(events.map(event => event.type))]
    return types
  }

  // Toggle event type filter
  const toggleEventTypeFilter = (type: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedEventTypes([])
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

  // Monday-first week days array - EXPLICIT ORDER
  const days = [
    { label: 'M', dayOfWeek: 1 }, // Monday
    { label: 'T', dayOfWeek: 2 }, // Tuesday
    { label: 'W', dayOfWeek: 3 }, // Wednesday
    { label: 'T', dayOfWeek: 4 }, // Thursday
    { label: 'F', dayOfWeek: 5 }, // Friday
    { label: 'S', dayOfWeek: 6 }, // Saturday
    { label: 'S', dayOfWeek: 0 }  // Sunday
  ]
  
  // ALWAYS log when component renders calendar
  console.log('📅 [MobileCalendar] Component rendering calendar for:', currentDate.toLocaleDateString())
  console.log('📅 [MobileCalendar] Days array (should start with Monday):', days.map(d => d.label).join(', '))
  
  const monthDays = getDaysInMonth(currentDate)
  const todayEvents = getEventsForSelectedDate()
  
  // Log the first few days to verify order
  console.log('📅 [MobileCalendar] First 7 items in monthDays array:', monthDays.slice(0, 7).map(d => d ? d.toLocaleDateString() : 'null').join(', '))

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleEditEvent = async (updatedEvent: Event) => {
    // Refresh events from API after edit
    const response = await fetch('/api/events')
    if (response.ok) {
      const data = await response.json()
      const transformedEvents = data.map((event: any) => {
        // Extract participant IDs from the participants array
        const selectedPlayers = event.participants
          ?.filter((p: any) => p.playerId)
          ?.map((p: any) => p.playerId) || []
        
        const selectedStaff = event.participants
          ?.filter((p: any) => p.staffId)
          ?.map((p: any) => p.staffId) || []

        // Parse the event date from the API response
        let eventDate: Date | null = null
        if (event.date) {
          eventDate = new Date(event.date)
        } else if (event.startTime) {
          eventDate = new Date(event.startTime)
        }
        
        // Format date in local timezone to avoid UTC conversion issues
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        // Extract time from ISO string or use as-is if already in HH:MM format
        const extractTime = (timeStr: string | null | undefined): string => {
          if (!timeStr) return ''
          // If already in HH:MM format, return as-is
          if (/^\d{2}:\d{2}$/.test(timeStr)) {
            return timeStr
          }
          // If ISO string, extract time part
          if (timeStr.includes('T')) {
            const date = new Date(timeStr)
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            return `${hours}:${minutes}`
          }
          return timeStr
        }

        return {
          id: event.id,
          title: event.title,
          type: event.type,
          date: eventDate ? formatLocalDate(eventDate) : '',
          startTime: extractTime(event.startTime),
          endTime: extractTime(event.endTime),
          location: event.location?.name || event.location || '',
          description: event.description || '',
          color: getEventColor(event.type),
          icon: event.icon || 'Calendar',
          selectedPlayers,
          selectedStaff
        }
      })
      setEvents(transformedEvents)
    }
    setIsModalOpen(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId))
    setIsModalOpen(false)
  }

  // Calculate duration between two times
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return ''
    
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    const diffMinutes = endMinutes - startMinutes
    
    if (diffMinutes <= 0) return ''
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}min`
    }
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: colorScheme.background }}
    >
      {/* Enhanced Header with Gradient */}
      <div 
        className="sticky top-0 px-0 sm:px-6 py-4 z-20 shadow-lg"
        style={{ 
          backgroundColor: colorScheme.surface,
          borderBottom: `1px solid ${colorScheme.border}`
        }}
      >
        <div className="flex items-center justify-between relative">
          <div className="flex-1"></div>
          <div className="flex items-center absolute left-1/2 transform -translate-x-1/2">
            <h1 
              className="text-xl font-bold text-center tracking-tight"
              style={{ 
                color: colorScheme.text, 
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Calendar
            </h1>
          </div>
          
          <div className="flex-1 flex justify-end">
            {canManageEvents() && (
              <button
                onClick={onAddEvent}
                className="px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: '#FFFFFF'
                }}
              >
                + Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Month Navigation */}
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
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
        <div className="rounded-2xl shadow-lg mx-0 sm:mx-4" style={{ backgroundColor: colorScheme.surface }}>
          {/* Day headers - Monday first - EXPLICIT ORDER */}
          <div 
            className="grid text-center text-xs font-semibold py-3"
            style={{ 
              color: colorScheme.textSecondary,
              gridTemplateColumns: 'repeat(7, 1fr)', // Explicitly set 7 columns
              display: 'grid'
            }}
            ref={(el) => {
              if (el) {
                console.log('📅 [MobileCalendar] Header div rendered!')
                const children = Array.from(el.children) as HTMLElement[]
                console.log('📅 [MobileCalendar] Number of header children:', children.length)
                const firstChild = children[0]
                if (firstChild) {
                  console.log('📅 [MobileCalendar] Header rendered - First column text:', firstChild.textContent, 'Expected: M (Monday)')
                  console.log('📅 [MobileCalendar] All header columns:', children.map(c => c.textContent).join(', '))
                } else {
                  console.warn('⚠️ [MobileCalendar] Header has no children!')
                }
              } else {
                console.warn('⚠️ [MobileCalendar] Header ref is null!')
              }
            }}
          >
            {/* Monday - EXPLICIT FIRST */}
            <div className="py-2" style={{ gridColumn: '1', order: 0 }}>M</div>
            {/* Tuesday */}
            <div className="py-2" style={{ gridColumn: '2', order: 1 }}>T</div>
            {/* Wednesday */}
            <div className="py-2" style={{ gridColumn: '3', order: 2 }}>W</div>
            {/* Thursday */}
            <div className="py-2" style={{ gridColumn: '4', order: 3 }}>T</div>
            {/* Friday */}
            <div className="py-2" style={{ gridColumn: '5', order: 4 }}>F</div>
            {/* Saturday */}
            <div className="py-2" style={{ gridColumn: '6', order: 5 }}>S</div>
            {/* Sunday - EXPLICIT LAST */}
            <div className="py-2" style={{ gridColumn: '7', order: 6 }}>S</div>
          </div>

          {/* Calendar days */}
          <div 
            className="grid grid-cols-7 gap-1 px-1 sm:px-2 pb-2"
            style={{ 
              gridTemplateColumns: 'repeat(7, 1fr)' // Explicitly set 7 columns
            }}
          >
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
                    ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)' 
                    : dayIsToday 
                      ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                      : 'transparent',
                  border: dayIsSelected 
                    ? '2px solid #3B82F6' 
                    : dayIsToday 
                      ? '2px solid #F59E0B'
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
                        ? '#D97706' 
                        : colorScheme.text 
                  }}
                >
                  {day.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="w-1.5 h-1.5 rounded-full shadow-sm"
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
        className="px-0 sm:px-4 py-4 w-full"
        style={{ backgroundColor: colorScheme.surface }}
      >
        <div className="flex flex-col items-center justify-center mb-4 relative">
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
          
          {canManageEvents() && (
            <button
              onClick={onAddEvent}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 mt-2"
              style={{ 
                backgroundColor: colorScheme.primary,
                color: '#FFFFFF'
              }}
            >
              + Add Event
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="space-y-2">
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
            className="text-center py-8 rounded-lg"
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
            {canManageEvents() && (
              <button
                onClick={onAddEvent}
                className="text-sm font-medium"
                style={{ color: colorScheme.text }}
              >
                + Add Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 px-2">
            {todayEvents.map((event, index) => (
              <div
                key={event.id}
                className="p-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.surface}, ${colorScheme.background})`,
                  border: `2px solid ${colorScheme.border}`,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                }}
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-1.5 h-10 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: event.color }}
                  />
                  
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                    style={{ backgroundColor: `${event.color}20` }}
                  >
                    <div style={{ color: event.color }}>
                      {getEventIcon(event)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1.5">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 shadow-sm"
                        style={{ 
                          backgroundColor: `${event.color}20`,
                          color: event.color
                        }}
                      >
                        {formatEventType(event.type)}
                      </span>
                    </div>
                    
                    <h4 
                      className="text-sm font-medium mb-1"
                      style={{ color: colorScheme.text }}
                    >
                      {event.title}
                      {event.startTime && event.endTime && (
                        <span 
                          className="text-xs font-normal ml-2"
                          style={{ color: colorScheme.textSecondary }}
                        >
                          ({calculateDuration(event.startTime, event.endTime)})
                        </span>
                      )}
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


      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        user={user}
        staffPermissions={staffPermissions}
      />
    </div>
  )
}
