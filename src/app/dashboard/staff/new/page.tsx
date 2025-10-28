'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Mail, Phone, Shield } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function NewStaffPage() {
  const router = useRouter()
  const { colorScheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    password: '',
    // Reports permissions
    canViewReports: false,
    canEditReports: false,
    canDeleteReports: false,
    // Events permissions
    canCreateEvents: false,
    canEditEvents: false,
    canDeleteEvents: false,
    // Players permissions
    canViewAllPlayers: false,
    canEditPlayers: false,
    canDeletePlayers: false,
    canAddPlayerMedia: false,
    canEditPlayerMedia: false,
    canDeletePlayerMedia: false,
    canAddPlayerNotes: false,
    canEditPlayerNotes: false,
    canDeletePlayerNotes: false,
    // System permissions
    canViewCalendar: false,
    canViewDashboard: false,
    canManageStaff: false
  })

  // Debug: Log form data changes
  useEffect(() => {
    console.log('📝 Form data updated:', formData)
  }, [formData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    console.log('🔍 Form data before validation:', formData)
    console.log('🔍 Field validation:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password ? '***' : 'empty',
      firstNameLength: formData.firstName.length,
      lastNameLength: formData.lastName.length,
      emailLength: formData.email.length,
      passwordLength: formData.password.length
    })

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim()) {
      console.log('❌ Client-side validation failed:', {
        firstNameValid: !!formData.firstName.trim(),
        lastNameValid: !!formData.lastName.trim(),
        emailValid: !!formData.email.trim(),
        passwordValid: !!formData.password.trim()
      })
      alert(`Please fill in all required fields:\n- First Name: ${formData.firstName.trim() ? '✅' : '❌ Missing'}\n- Last Name: ${formData.lastName.trim() ? '✅' : '❌ Missing'}\n- Email: ${formData.email.trim() ? '✅' : '❌ Missing'}\n- Password: ${formData.password.trim() ? '✅' : '❌ Missing'}`)
      return
    }

    console.log('✅ Client-side validation passed, proceeding with API call...')

    setIsLoading(true)

    try {
      // Combine firstName and lastName into name for API
      const apiData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim()
      }
      
      console.log('📝 Sending staff data:', apiData)
      console.log('📝 JSON stringified data:', JSON.stringify(apiData))
      
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      console.log('📊 Response status:', response.status)
      console.log('📊 Response headers:', response.headers)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Staff created successfully:', result)
        alert('Staff member created successfully!')
        router.push('/dashboard/staff')
      } else {
        const responseText = await response.text()
        console.error('❌ Error response text:', responseText)
        
        let errorData = {}
        try {
          errorData = JSON.parse(responseText)
          console.error('❌ Parsed error data:', errorData)
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
          errorData = { message: 'Failed to parse error response' }
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status} error`
        console.error('❌ Final error message:', errorMessage)
        alert(`Failed to create staff member: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Network error creating staff member:', error)
      alert(`Network error: Failed to create staff member - ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md transition-colors"
            style={{ 
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
              Add New Staff Member
            </h1>
            <p className="text-lg mt-2" style={{ color: colorScheme.textSecondary }}>
              Create a new staff account with specific permissions
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: colorScheme.surface, 
              borderColor: colorScheme.border 
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
              Personal Information
            </h3>

            {/* First Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter last name"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter email address"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter phone number"
              />
            </div>

            {/* Position */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter position (e.g., Assistant Coach, Physiotherapist)"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Temporary Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter temporary password (user should change this)"
              />
            </div>
          </div>

                  {/* Permissions */}
                  <div 
                    className="rounded-lg border p-6"
                    style={{ 
                      backgroundColor: colorScheme.surface, 
                      borderColor: colorScheme.border 
                    }}
                  >
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
                      Permissions
                    </h3>
                    <p className="text-sm mb-4" style={{ color: colorScheme.textSecondary }}>
                      Note: Staff members can always view the dashboard, players list, and calendar. 
                      These permissions control additional features.
                    </p>

                    <div className="space-y-6">
                      {/* Reports Permissions */}
                      <div className="space-y-3">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          Reports
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canViewReports"
                              checked={formData.canViewReports}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              View Reports
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canEditReports"
                              checked={formData.canEditReports}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Edit Reports
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canDeleteReports"
                              checked={formData.canDeleteReports}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Delete Reports
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Events Permissions */}
                      <div className="space-y-3">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          Events
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canCreateEvents"
                              checked={formData.canCreateEvents}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Create Events
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canEditEvents"
                              checked={formData.canEditEvents}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Edit Events
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canDeleteEvents"
                              checked={formData.canDeleteEvents}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Delete Events
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Players Permissions */}
                      <div className="space-y-3">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          Players
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canViewAllPlayers"
                              checked={formData.canViewAllPlayers}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              View All Players
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canEditPlayers"
                              checked={formData.canEditPlayers}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Edit Players
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canDeletePlayers"
                              checked={formData.canDeletePlayers}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Delete Players
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canAddPlayerMedia"
                              checked={formData.canAddPlayerMedia}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Add Player Media
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canEditPlayerMedia"
                              checked={formData.canEditPlayerMedia}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Edit Player Media
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canDeletePlayerMedia"
                              checked={formData.canDeletePlayerMedia}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Delete Player Media
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canAddPlayerNotes"
                              checked={formData.canAddPlayerNotes}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Add Player Notes
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canEditPlayerNotes"
                              checked={formData.canEditPlayerNotes}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Edit Player Notes
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canDeletePlayerNotes"
                              checked={formData.canDeletePlayerNotes}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Delete Player Notes
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* System Permissions */}
                      <div className="space-y-3">
                        <h4 className="font-medium" style={{ color: colorScheme.text }}>
                          System
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canViewCalendar"
                              checked={formData.canViewCalendar}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              View Calendar
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canViewDashboard"
                              checked={formData.canViewDashboard}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              View Dashboard
                            </span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              name="canManageStaff"
                              checked={formData.canManageStaff}
                              onChange={handleInputChange}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="text-sm" style={{ color: colorScheme.text }}>
                              Manage Staff
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-md font-medium transition-colors"
              style={{ 
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-md font-medium text-white transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: colorScheme.primary,
              }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Create Staff Member</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
