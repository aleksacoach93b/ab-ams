'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload, X, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function NewPlayerPage() {
  const router = useRouter()
  const { colorScheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    position: '',
    jerseyNumber: '',
    height: '',
    weight: '',
    preferredFoot: '',
    nationality: '',
    currentAddress: '',
    birthCity: '',
    birthCountry: '',
    bloodType: '',
    medicalNotes: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    // Save file to state
    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Please enter both first and last name')
      return
    }
    
    if (!formData.email.trim()) {
      alert('Please enter an email address')
      return
    }
    
    if (!formData.password.trim()) {
      alert('Please enter a password')
      return
    }

    setIsLoading(true)

    try {
      // Combine firstName and lastName into name field for API
      const apiData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim()
      }

      console.log('📝 Sending data to API:', apiData)

      // First create the player
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (response.ok) {
        const playerData = await response.json()
        
        // If there's a photo, upload it
        if (selectedFile) {
          const photoFormData = new FormData()
          photoFormData.append('avatar', selectedFile)

          try {
            const photoResponse = await fetch(`/api/players/${playerData.id}/avatar`, {
              method: 'POST',
              body: photoFormData,
            })

            if (photoResponse.ok) {
              console.log('✅ Photo uploaded successfully')
            } else {
              const errorData = await photoResponse.json()
              console.warn('⚠️ Photo upload failed:', errorData.message)
              // Show user-friendly message but don't block navigation
              alert(`Player created successfully, but photo upload failed: ${errorData.message}. You can add the photo later from the player's profile.`)
            }
          } catch (photoError) {
            console.warn('⚠️ Photo upload error:', photoError)
            // Show user-friendly message but don't block navigation
            alert('Player created successfully, but photo upload failed. You can add the photo later from the player\'s profile.')
          }
        }

        router.push('/dashboard/players')
      } else {
        let errorMessage = 'Failed to create player'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error('Failed to create player:', errorData)
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            console.error('Failed to create player (non-JSON response):', errorText)
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error('Failed to create player (no response body):', response.status, response.statusText)
            errorMessage = `Failed to create player: ${response.status} ${response.statusText}`
          }
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error creating player:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the player. Please try again.'
      alert(`An error occurred while creating the player: ${errorMessage}`)
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
          <h1 style={{ color: colorScheme.text }} className="text-2xl font-semibold">Add New Player</h1>
          <p style={{ color: colorScheme.textSecondary }}>Create a new player profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Section */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Profile</h3>
          
          {/* Photo Upload */}
          <div className="mb-6">
            <h4 style={{ color: colorScheme.text }} className="text-sm font-medium mb-2">Photo</h4>
            <div className="flex items-center space-x-4">
              {/* Photo Display */}
              <div className="relative">
                {photoPreview ? (
                  <div className="relative group">
                    <img
                      src={photoPreview}
                      alt="Player preview"
                      className="w-32 h-32 rounded-lg object-cover"
                      style={{ border: `2px solid ${colorScheme.border}` }}
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: colorScheme.error, color: '#FFFFFF' }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center"
                    style={{ 
                      borderColor: colorScheme.border,
                      backgroundColor: colorScheme.background
                    }}
                  >
                    <User className="h-8 w-8" style={{ color: colorScheme.textSecondary }} />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    backgroundColor: colorScheme.error,
                    color: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadingPhoto) {
                      e.currentTarget.style.backgroundColor = colorScheme.error
                      e.currentTarget.style.filter = 'brightness(0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploadingPhoto) {
                      e.currentTarget.style.backgroundColor = colorScheme.error
                      e.currentTarget.style.filter = 'none'
                    }
                  }}
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                </button>
                <p style={{ color: colorScheme.textSecondary }} className="text-xs mt-2">
                  JPG, PNG, GIF or WebP. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`,
                  focusRingColor: colorScheme.primary
                }}
              />
            </div>

            <div>
              <label htmlFor="lastName" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="email" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                placeholder="athlete@example.com"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                placeholder="Enter login password"
                minLength={6}
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
              <p style={{ color: colorScheme.textSecondary }} className="text-xs mt-1">
                Minimum 6 characters. This will be used for athlete login.
              </p>
            </div>

            <div>
              <label htmlFor="phone" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="nationality" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Nationality
              </label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>
          </div>
        </div>

        {/* Sports Details */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Sports Details</h3>
          <p style={{ color: colorScheme.textSecondary }} className="text-sm mb-6">Information regarding the sport player is involved in</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="position" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Position
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              >
                <option value="">Select position</option>
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Defender">Defender</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Forward">Forward</option>
              </select>
            </div>

            <div>
              <label htmlFor="jerseyNumber" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Jersey Number
              </label>
              <input
                type="number"
                id="jerseyNumber"
                name="jerseyNumber"
                value={formData.jerseyNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="height" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                placeholder="e.g. 180"
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="weight" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="e.g. 80"
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>

            <div>
              <label htmlFor="preferredFoot" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Preferred Foot/Arm
              </label>
              <select
                id="preferredFoot"
                name="preferredFoot"
                value={formData.preferredFoot}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              >
                <option value="">Select preference</option>
                <option value="Left">Left</option>
                <option value="Right">Right</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthCity" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Birth City and Country
              </label>
              <input
                type="text"
                id="birthCity"
                name="birthCity"
                value={formData.birthCity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}>
          <h3 style={{ color: colorScheme.text }} className="text-lg font-medium mb-6">Medical Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="bloodType" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Blood Type
              </label>
              <select
                id="bloodType"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              >
                <option value="">Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label htmlFor="currentAddress" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                Current Address
              </label>
              <input
                type="text"
                id="currentAddress"
                name="currentAddress"
                value={formData.currentAddress}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="medicalNotes" style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
              Medical Notes
            </label>
            <textarea
              id="medicalNotes"
              name="medicalNotes"
              value={formData.medicalNotes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
              placeholder="Any medical conditions, allergies, or important notes..."
              style={{ 
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
              borderColor: colorScheme.border
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
            {isLoading ? 'Creating...' : 'Save Player'}
          </button>
        </div>
      </form>
    </div>
  )
}
