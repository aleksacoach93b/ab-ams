'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Calendar, Clock, MapPin, Users } from 'lucide-react'
import EventIconSelector from '@/components/EventIconSelector'
import MatchDayTagSelector from '@/components/MatchDayTagSelector'
import DatePicker from '@/components/DatePicker'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

export default function NewEventPage() {
  const router = useRouter()
  const { colorScheme, theme } = useTheme()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TRAINING',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    isAllDay: false,
    isRecurring: false,
    allowPlayerCreation: false,
    allowPlayerReschedule: false,
    icon: 'Dumbbell',
    matchDayTag: '',
    selectedPlayers: [] as string[],
    selectedStaff: [] as string[],
  })
  const [players, setPlayers] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Fetch players and staff data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playersResponse, staffResponse] = await Promise.all([
          fetch('/api/players'),
          fetch('/api/staff')
        ])
        
        if (playersResponse.ok) {
          const playersData = await playersResponse.json()
          setPlayers(playersData)
        }
        
        if (staffResponse.ok) {
          const staffData = await staffResponse.json()
          setStaff(staffData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePlayerToggle = (playerId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId]
    }))
  }

  const handleStaffToggle = (staffId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStaff: prev.selectedStaff.includes(staffId)
        ? prev.selectedStaff.filter(id => id !== staffId)
        : [...prev.selectedStaff, staffId]
    }))
  }

  const handleSelectAllPlayers = () => {
    const allPlayerIds = players.map(player => player.id)
    setFormData(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.length === allPlayerIds.length ? [] : allPlayerIds
    }))
  }

  const handleSelectAllStaff = () => {
    const allStaffIds = staff.map(staffMember => staffMember.id)
    setFormData(prev => ({
      ...prev,
      selectedStaff: prev.selectedStaff.length === allStaffIds.length ? [] : allStaffIds
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate Match Day Tag is required
    if (!formData.matchDayTag || formData.matchDayTag.trim() === '') {
      alert('Match Day Tag is required. Please select a Match Day Tag before saving.')
      // Scroll to Match Day Tag section
      const matchDayTagSection = document.querySelector('[data-match-day-tag-section]')
      if (matchDayTagSection) {
        matchDayTagSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Highlight the section
        matchDayTagSection.classList.add('ring-2', 'ring-red-500')
        setTimeout(() => {
          matchDayTagSection.classList.remove('ring-2', 'ring-red-500')
        }, 2000)
      }
      return
    }
    
    setIsLoading(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // Dispatch custom event to refresh calendar
        window.dispatchEvent(new CustomEvent('eventCreated'))
        router.push('/dashboard/calendar')
      } else {
        const errorData = await response.json()
        console.error('Failed to create event:', errorData.message)
        alert(`Failed to create event: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('An error occurred while creating the event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6" style={{ backgroundColor: colorScheme.background, minHeight: '100vh', padding: '1.5rem' }}>
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-md transition-colors"
          style={{
            backgroundColor: colorScheme.surface,
            color: colorScheme.text,
            border: `1px solid ${colorScheme.border}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colorScheme.primaryLight || colorScheme.surface
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colorScheme.surface
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 style={{ color: colorScheme.text }} className="text-2xl font-semibold">Add New Event</h1>
          <p style={{ color: colorScheme.textSecondary }}>
            Create a new training session, match, or meeting
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Type */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Event Type</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {[
              { type: 'TRAINING', label: 'Training', defaultIcon: 'Dumbbell' },
              { type: 'MATCH', label: 'Match', defaultIcon: 'Trophy' },
              { type: 'MEETING', label: 'Meeting', defaultIcon: 'Users' },
              { type: 'MEDICAL', label: 'Medical', defaultIcon: 'Heart' },
              { type: 'RECOVERY', label: 'Recovery', defaultIcon: 'Zap' },
              { type: 'MEAL', label: 'Meal', defaultIcon: 'MealPlate' },
              { type: 'REST', label: 'Rest', defaultIcon: 'BedTime' },
              { type: 'LB_GYM', label: 'LB Gym', defaultIcon: 'Dumbbell' },
              { type: 'UB_GYM', label: 'UB Gym', defaultIcon: 'Dumbbell' },
              { type: 'PRE_ACTIVATION', label: 'Pre-Activation', defaultIcon: 'Activity' },
              { type: 'REHAB', label: 'Rehab', defaultIcon: 'Heart' },
              { type: 'STAFF_MEETING', label: 'Staff Meeting', defaultIcon: 'Users' },
              { type: 'VIDEO_ANALYSIS', label: 'Video Analysis', defaultIcon: 'Video' },
              { type: 'DAY_OFF', label: 'Day Off', defaultIcon: 'Calendar' },
              { type: 'TRAVEL', label: 'Travel', defaultIcon: 'Bus' },
              { type: 'OTHER', label: 'Other', defaultIcon: 'Calendar' }
            ].map(({ type, label, defaultIcon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  type,
                  // Keep the current icon when changing type - don't override user selection
                  icon: prev.icon
                }))}
                style={{
                  border: `2px solid ${formData.type === type ? colorScheme.error : colorScheme.border}`,
                  backgroundColor: formData.type === type 
                    ? `${colorScheme.error}20` 
                    : colorScheme.surface,
                  color: formData.type === type 
                    ? colorScheme.error 
                    : colorScheme.text
                }}
                className="p-4 rounded-lg text-center transition-colors"
              >
                <div className="font-medium">{label}</div>
              </button>
            ))}
          </div>

              {/* Custom Event Icon */}
              <div>
                <h4 style={{ color: colorScheme.text }} className="text-md font-medium mb-3">Event Icon</h4>
                <EventIconSelector 
                  selectedIcon={formData.icon}
                  onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                />
              </div>
        </div>

        {/* Match Day Tag - Only visible to Admin */}
        {user?.role === 'ADMIN' && (
          <div 
            data-match-day-tag-section
            className="rounded-lg shadow p-6" 
            style={{ 
              backgroundColor: colorScheme.surface, 
              border: `1px solid ${colorScheme.border}`
            }}
          >
            <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">
              Match Day Tag <span style={{ color: '#EF4444' }}>*</span>
            </h3>
            
            <div>
              <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Select Match Day Tag <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <MatchDayTagSelector
                value={formData.matchDayTag}
                onChange={(tag) => setFormData(prev => ({ ...prev, matchDayTag: tag }))}
                isAdmin={true}
              />
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Event Details</h3>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="title" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
                placeholder="Enter event title"
              />
            </div>

            <div>
              <label htmlFor="description" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
                placeholder="Enter event description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                  Date *
                </label>
                <DatePicker
                    value={formData.date}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, date }))
                  }}
                  placeholder="Select date"
                    required
                  name="date"
                  id="date"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: colorScheme.surface,
                        borderColor: colorScheme.border,
                        color: colorScheme.text
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="endTime" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: colorScheme.surface,
                        borderColor: colorScheme.border,
                        color: colorScheme.text
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="location" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                  placeholder="Enter location or venue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Settings */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Event Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isAllDay" style={{ color: colorScheme.text }} className="text-sm font-medium">
                  All Day Event
                </label>
                <p style={{ color: colorScheme.textSecondary }} className="text-xs">Event lasts the entire day</p>
              </div>
              <input
                type="checkbox"
                id="isAllDay"
                name="isAllDay"
                checked={formData.isAllDay}
                onChange={handleInputChange}
                className="h-4 w-4 rounded"
                style={{
                  accentColor: colorScheme.primary,
                  borderColor: colorScheme.border
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isRecurring" style={{ color: colorScheme.text }} className="text-sm font-medium">
                  Recurring Event
                </label>
                <p style={{ color: colorScheme.textSecondary }} className="text-xs">Event repeats on a schedule</p>
              </div>
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
                className="h-4 w-4 rounded"
                style={{
                  accentColor: colorScheme.primary,
                  borderColor: colorScheme.border
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowPlayerCreation" style={{ color: colorScheme.text }} className="text-sm font-medium">
                  Allow Players to Create Events
                </label>
                <p style={{ color: colorScheme.textSecondary }} className="text-xs">Players can create their own events</p>
              </div>
              <input
                type="checkbox"
                id="allowPlayerCreation"
                name="allowPlayerCreation"
                checked={formData.allowPlayerCreation}
                onChange={handleInputChange}
                className="h-4 w-4 rounded"
                style={{
                  accentColor: colorScheme.primary,
                  borderColor: colorScheme.border
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowPlayerReschedule" style={{ color: colorScheme.text }} className="text-sm font-medium">
                  Allow Players to Reschedule
                </label>
                <p style={{ color: colorScheme.textSecondary }} className="text-xs">Players can reschedule this event</p>
              </div>
              <input
                type="checkbox"
                id="allowPlayerReschedule"
                name="allowPlayerReschedule"
                checked={formData.allowPlayerReschedule}
                onChange={handleInputChange}
                className="h-4 w-4 rounded"
                style={{
                  accentColor: colorScheme.primary,
                  borderColor: colorScheme.border
                }}
              />
            </div>
          </div>
        </div>

        {/* Players and Staff Selection */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Participants</h3>
          
          {loadingData ? (
            <div style={{ color: colorScheme.textSecondary }} className="text-center py-4">Loading players and staff...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Players Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 style={{ color: colorScheme.text }} className="text-md font-medium">
                    Players ({formData.selectedPlayers.length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllPlayers}
                    style={{ color: colorScheme.error }}
                    className="text-xs hover:opacity-80 font-medium transition-opacity"
                  >
                    {formData.selectedPlayers.length === players.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" style={{ borderColor: colorScheme.border }}>
                  {players.map((player) => (
                    <label 
                      key={player.id} 
                      className="flex items-center space-x-3 cursor-pointer p-2 rounded transition-colors"
                      style={{
                        backgroundColor: formData.selectedPlayers.includes(player.id) 
                          ? `${colorScheme.primary}20` 
                          : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!formData.selectedPlayers.includes(player.id)) {
                          e.currentTarget.style.backgroundColor = `${colorScheme.primary}10`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!formData.selectedPlayers.includes(player.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedPlayers.includes(player.id)}
                        onChange={() => handlePlayerToggle(player.id)}
                        className="h-4 w-4 rounded"
                        style={{
                          accentColor: colorScheme.primary,
                          borderColor: colorScheme.border
                        }}
                      />
                      <div className="flex-1">
                        <p style={{ color: colorScheme.text }} className="text-sm font-medium">
                          {player.firstName} {player.lastName}
                        </p>
                        <p style={{ color: colorScheme.textSecondary }} className="text-xs">
                          {player.position || 'No position'} • #{player.jerseyNumber || 'N/A'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Staff Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 style={{ color: colorScheme.text }} className="text-md font-medium">
                    Staff ({formData.selectedStaff.length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    style={{ color: colorScheme.error }}
                    className="text-xs hover:opacity-80 font-medium transition-opacity"
                  >
                    {formData.selectedStaff.length === staff.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" style={{ borderColor: colorScheme.border }}>
                  {staff.map((staffMember) => (
                    <label 
                      key={staffMember.id} 
                      className="flex items-center space-x-3 cursor-pointer p-2 rounded transition-colors"
                      style={{
                        backgroundColor: formData.selectedStaff.includes(staffMember.id) 
                          ? `${colorScheme.primary}20` 
                          : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!formData.selectedStaff.includes(staffMember.id)) {
                          e.currentTarget.style.backgroundColor = `${colorScheme.primary}10`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!formData.selectedStaff.includes(staffMember.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedStaff.includes(staffMember.id)}
                        onChange={() => handleStaffToggle(staffMember.id)}
                        className="h-4 w-4 rounded"
                        style={{
                          accentColor: colorScheme.primary,
                          borderColor: colorScheme.border
                        }}
                      />
                      <div className="flex-1">
                        <p style={{ color: colorScheme.text }} className="text-sm font-medium">
                          {staffMember.firstName} {staffMember.lastName}
                        </p>
                        <p style={{ color: colorScheme.textSecondary }} className="text-xs">
                          {staffMember.position || 'Staff Member'} • {staffMember.department || 'General'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors"
            style={{
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border,
              color: colorScheme.text
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorScheme.primaryLight || colorScheme.surface
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colorScheme.surface
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colorScheme.error,
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.filter = 'brightness(0.9)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.filter = 'none'
              }
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
