'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Calendar, Clock, MapPin, Users } from 'lucide-react'
import EventIconSelector from '@/components/EventIconSelector'
import MatchDayTagSelector from '@/components/MatchDayTagSelector'
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
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className={`p-2 rounded-md transition-colors ${
            theme === 'dark' 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Add New Event</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Create a new training session, match, or meeting
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Type */}
        <div className={`rounded-lg shadow p-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-medium mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Event Type</h3>
          
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
                className={`p-4 border-2 rounded-lg text-center ${
                  formData.type === type
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300'
                      : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className="font-medium">{label}</div>
              </button>
            ))}
          </div>

              {/* Custom Event Icon */}
              <div>
                <h4 className={`text-md font-medium mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Event Icon</h4>
                <EventIconSelector 
                  selectedIcon={formData.icon}
                  onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                />
              </div>
        </div>

        {/* Match Day Tag - Only visible to Admin */}
        {user?.role === 'ADMIN' && (
          <div className={`rounded-lg shadow p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-medium mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Match Day Tag</h3>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Select Match Day Tag
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
        <div className={`rounded-lg shadow p-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-lg font-medium mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Event Details</h3>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter event title"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter event description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter location or venue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Event Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                  All Day Event
                </label>
                <p className="text-xs text-gray-500">Event lasts the entire day</p>
              </div>
              <input
                type="checkbox"
                id="isAllDay"
                name="isAllDay"
                checked={formData.isAllDay}
                onChange={handleInputChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                  Recurring Event
                </label>
                <p className="text-xs text-gray-500">Event repeats on a schedule</p>
              </div>
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowPlayerCreation" className="text-sm font-medium text-gray-700">
                  Allow Players to Create Events
                </label>
                <p className="text-xs text-gray-500">Players can create their own events</p>
              </div>
              <input
                type="checkbox"
                id="allowPlayerCreation"
                name="allowPlayerCreation"
                checked={formData.allowPlayerCreation}
                onChange={handleInputChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowPlayerReschedule" className="text-sm font-medium text-gray-700">
                  Allow Players to Reschedule
                </label>
                <p className="text-xs text-gray-500">Players can reschedule this event</p>
              </div>
              <input
                type="checkbox"
                id="allowPlayerReschedule"
                name="allowPlayerReschedule"
                checked={formData.allowPlayerReschedule}
                onChange={handleInputChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Players and Staff Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Participants</h3>
          
          {loadingData ? (
            <div className="text-center py-4">Loading players and staff...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Players Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-700">
                    Players ({formData.selectedPlayers.length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllPlayers}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    {formData.selectedPlayers.length === players.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                  {players.map((player) => (
                    <label key={player.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.selectedPlayers.includes(player.id)}
                        onChange={() => handlePlayerToggle(player.id)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
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
                  <h4 className="text-md font-medium text-gray-700">
                    Staff ({formData.selectedStaff.length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    {formData.selectedStaff.length === staff.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                  {staff.map((staffMember) => (
                    <label key={staffMember.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.selectedStaff.includes(staffMember.id)}
                        onChange={() => handleStaffToggle(staffMember.id)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {staffMember.firstName} {staffMember.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
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
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
