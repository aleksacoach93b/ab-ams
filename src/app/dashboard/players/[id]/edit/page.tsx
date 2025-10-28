'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, User, Mail, Phone, Calendar, MapPin, Hash, Upload, X, Camera } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Player {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  password?: string
  phone: string
  dateOfBirth: string
  position: string
  jerseyNumber: number
  height: number
  weight: number
  status: string
  team: string
  avatar: string | null
}

export default function EditPlayerPage() {
  const router = useRouter()
  const params = useParams()
  const { colorScheme, theme } = useTheme()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const playerId = params.id as string

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}`)
        if (response.ok) {
          const playerData = await response.json()
          
          // Split the name into firstName and lastName
          const nameParts = playerData.name ? playerData.name.split(' ') : ['', '']
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          setPlayer({
            ...playerData,
            firstName,
            lastName,
            password: '' // Initialize password as empty for security
          })
          setAvatarPreview(playerData.imageUrl || playerData.avatar)
        }
      } catch (error) {
        console.error('Error fetching player:', error)
      } finally {
        setLoading(false)
      }
    }

    if (playerId) {
      fetchPlayer()
    }
  }, [playerId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setPlayer(prev => prev ? {
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    } : null)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📸 Starting avatar upload for player:', playerId)
    console.log('📸 File details:', { name: file.name, size: file.size, type: file.type })

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

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      console.log('📸 Sending request to:', `/api/players/${playerId}/avatar`)

      const response = await fetch(`/api/players/${playerId}/avatar`, {
        method: 'POST',
        body: formData,
      })

      console.log('📸 Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Avatar upload successful:', result)
        setPlayer(prev => prev ? { ...prev, avatar: result.avatar } : null)
        setAvatarPreview(result.avatar)
        alert('Avatar uploaded successfully!')
      } else {
        const error = await response.json()
        console.error('❌ Avatar upload failed:', error)
        alert(error.message || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove the avatar?')) return

    try {
      const response = await fetch(`/api/players/${playerId}/avatar`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPlayer(prev => prev ? { ...prev, avatar: null } : null)
        setAvatarPreview(null)
        alert('Avatar removed successfully!')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to remove avatar')
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      alert('Error removing avatar')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!player) return

    setSaving(true)
    try {
      // Combine firstName and lastName into name field for API
      const apiData = {
        ...player,
        name: `${player.firstName} ${player.lastName}`.trim()
      }

      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (response.ok) {
        router.push(`/dashboard/players/${playerId}`)
      } else {
        alert('Failed to update player')
      }
    } catch (error) {
      console.error('Error updating player:', error)
      alert('Error updating player')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading player...
          </p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Player not found
          </p>
          <button
            onClick={() => router.back()}
            className="text-red-600 mt-2"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 border-b px-4 py-3 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
            <h1 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Edit {player.firstName} {player.lastName}
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className={`rounded-lg shadow p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-medium mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Profile Picture</h3>
            
            <div className="flex items-center space-x-6">
              {/* Avatar Display */}
              <div className="relative">
                {avatarPreview ? (
                  <div className="relative group">
                    <img
                      src={avatarPreview}
                      alt={`${player.firstName} ${player.lastName}`}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
                      }`}
                    >
                      {uploadingAvatar ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                        </>
                      )}
                    </button>
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    JPG, PNG, GIF or WebP. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className={`rounded-lg shadow p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-medium mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={player.firstName}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter first name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={player.lastName}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={player.email || ''}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Password (optional)
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={player.password || ''}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Leave blank to keep the current password. Minimum 6 characters.
                </p>
              </div>

              <div>
                <label htmlFor="phone" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={player.phone || ''}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sports Information */}
          <div className={`rounded-lg shadow p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-medium mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Sports Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="position" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={player.position || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="e.g., Forward, Goalkeeper"
                />
              </div>

              <div>
                <label htmlFor="jerseyNumber" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Jersey Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    id="jerseyNumber"
                    name="jerseyNumber"
                    value={player.jerseyNumber || ''}
                    onChange={handleInputChange}
                    min="1"
                    max="99"
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter jersey number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="height" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Height (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={player.height || ''}
                  onChange={handleInputChange}
                  min="100"
                  max="250"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter height in cm"
                />
              </div>

              <div>
                <label htmlFor="weight" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Weight (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={player.weight || ''}
                  onChange={handleInputChange}
                  min="30"
                  max="200"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter weight in kg"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={player.status || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INJURED">Injured</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-6 py-2 border rounded-md shadow-sm text-sm font-medium ${
                theme === 'dark'
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
