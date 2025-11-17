'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, User, Mail, Phone, Calendar, Shield, Eye, EyeOff, Upload, Camera, X, MessageCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import TeamChat from '@/components/TeamChat'

interface Staff {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  experience?: number
  imageUrl?: string
  createdAt: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    lastLoginAt?: string
    createdAt: string
  }
  // Permissions
  canViewReports: boolean
  canEditReports: boolean
  canDeleteReports: boolean
  canCreateEvents: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canViewAllPlayers: boolean
  canEditPlayers: boolean
  canDeletePlayers: boolean
  canAddPlayerMedia: boolean
  canEditPlayerMedia: boolean
  canDeletePlayerMedia: boolean
  canAddPlayerNotes: boolean
  canEditPlayerNotes: boolean
  canDeletePlayerNotes: boolean
  canViewCalendar: boolean
  canViewDashboard: boolean
  canManageStaff: boolean
}

export default function StaffPage() {
  const { colorScheme } = useTheme()
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showTeamChat, setShowTeamChat] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaff(data)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setStaff(staff.filter(s => s.id !== id))
      } else {
        alert('Failed to delete staff member')
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('Error deleting staff member')
    }
  }

  const getPermissionCount = (staffMember: Staff) => {
    const permissions = [
      staffMember.canCreateEvents,
      staffMember.canEditEvents,
      staffMember.canDeleteEvents,
      staffMember.canViewAllPlayers,
      staffMember.canEditPlayers,
      staffMember.canDeletePlayers,
      staffMember.canAddPlayerMedia,
      staffMember.canEditPlayerMedia,
      staffMember.canDeletePlayerMedia,
      staffMember.canAddPlayerNotes,
      staffMember.canEditPlayerNotes,
      staffMember.canDeletePlayerNotes,
      staffMember.canViewCalendar,
      staffMember.canViewDashboard,
      staffMember.canManageStaff,
      staffMember.canViewReports
    ]
    return permissions.filter(Boolean).length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading staff...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
            Staff Management
          </h1>
          <p className="text-lg mt-2" style={{ color: colorScheme.textSecondary }}>
            Manage your team staff and their permissions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTeamChat(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: colorScheme.primary,
              color: colorScheme.primaryText || 'white'
            }}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Team Chat</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/staff/new')}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((staffMember) => (
          <div
            key={staffMember.id}
            className="rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl"
            style={{ backgroundColor: colorScheme.surface }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {staffMember.imageUrl ? (
                  <img
                    src={staffMember.imageUrl}
                    alt={`${staffMember.firstName} ${staffMember.lastName}`}
                    className="w-12 h-12 rounded-full object-cover border-2"
                    style={{ borderColor: colorScheme.border }}
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: colorScheme.primary }}
                  >
                    {staffMember.firstName.charAt(0)}{staffMember.lastName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold" style={{ color: colorScheme.text }}>
                    {staffMember.firstName} {staffMember.lastName}
                  </h3>
                  <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {staffMember.position || 'Staff Member'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push(`/dashboard/staff/${staffMember.id}`)}
                  className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ backgroundColor: colorScheme.primaryLight }}
                  title="View Profile"
                >
                  <Eye className="h-4 w-4" style={{ color: colorScheme.primary }} />
                </button>
                <button
                  onClick={() => setEditingStaff(staffMember)}
                  className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ backgroundColor: colorScheme.primaryLight }}
                >
                  <Edit className="h-4 w-4" style={{ color: colorScheme.primary }} />
                </button>
                <button
                  onClick={() => handleDeleteStaff(staffMember.id)}
                  className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ backgroundColor: colorScheme.errorLight }}
                >
                  <Trash2 className="h-4 w-4" style={{ color: colorScheme.error }} />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  {staffMember.email}
                </span>
              </div>
              {staffMember.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                  <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {staffMember.phone}
                  </span>
                </div>
              )}
              {staffMember.department && (
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                  <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {staffMember.department}
                  </span>
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  {getPermissionCount(staffMember)} permissions
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {staff.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colorScheme.text }}>
            No staff members yet
          </h3>
          <p className="mb-4" style={{ color: colorScheme.textSecondary }}>
            Add your first staff member to get started
          </p>
          <button
            onClick={() => router.push('/dashboard/staff/new')}
            className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Add Staff Member
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingStaff) && (
        <StaffModal
          staff={editingStaff}
          onClose={() => {
            setShowAddModal(false)
            setEditingStaff(null)
          }}
          onSave={() => {
            fetchStaff()
            setShowAddModal(false)
            setEditingStaff(null)
          }}
        />
      )}
    </div>
  )
}

// Staff Modal Component
function StaffModal({ 
  staff, 
  onClose, 
  onSave 
}: { 
  staff: Staff | null
  onClose: () => void
  onSave: () => void
}) {
  const { colorScheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)
  const [showTeamChat, setShowTeamChat] = useState(false)
  const [formData, setFormData] = useState({
    firstName: staff?.firstName || '',
    lastName: staff?.lastName || '',
    email: staff?.email || '',
    password: '',
    phone: staff?.phone || '',
    dateOfBirth: staff?.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
    position: staff?.position || '',
    department: staff?.department || '',
    experience: staff?.experience?.toString() || '',
    certifications: staff?.certifications ? JSON.parse(staff.certifications) : [],
    permissions: {
      // Reports permissions
      canViewReports: staff?.canViewReports || false,
      canEditReports: staff?.canEditReports || false,
      canDeleteReports: staff?.canDeleteReports || false,
      // Events permissions
      canCreateEvents: staff?.canCreateEvents || false,
      canEditEvents: staff?.canEditEvents || false,
      canDeleteEvents: staff?.canDeleteEvents || false,
      // Players permissions
      canViewAllPlayers: staff?.canViewAllPlayers !== undefined ? staff.canViewAllPlayers : true,
      canEditPlayers: staff?.canEditPlayers || false,
      canDeletePlayers: staff?.canDeletePlayers || false,
      canAddPlayerMedia: staff?.canAddPlayerMedia || false,
      canEditPlayerMedia: staff?.canEditPlayerMedia || false,
      canDeletePlayerMedia: staff?.canDeletePlayerMedia || false,
      canAddPlayerNotes: staff?.canAddPlayerNotes || false,
      canEditPlayerNotes: staff?.canEditPlayerNotes || false,
      canDeletePlayerNotes: staff?.canDeletePlayerNotes || false,
      // System permissions
      canViewCalendar: staff?.canViewCalendar !== undefined ? staff.canViewCalendar : true,
      canViewDashboard: staff?.canViewDashboard !== undefined ? staff.canViewDashboard : true,
      canManageStaff: staff?.canManageStaff || false
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = staff ? `/api/staff/${staff.id}` : '/api/staff'
      const method = staff ? 'PUT' : 'POST'

      // Flatten the permissions for the API
      const apiData = {
        ...formData,
        ...formData.permissions,
        name: `${formData.firstName} ${formData.lastName}`.trim()
      }
      delete apiData.permissions // Remove the nested permissions object

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to save staff member')
      }
    } catch (error) {
      console.error('Error saving staff:', error)
      alert('Error saving staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [name]: checked
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!staff || !e.target.files?.[0]) return

    const file = e.target.files[0]
    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      console.log('📸 Uploading staff avatar:', { staffId: staff.id, fileName: file.name })

      const response = await fetch(`/api/staff/${staff.id}/avatar`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Staff avatar uploaded successfully:', result)
        // Update the staff object with new imageUrl
        if (staff) {
          staff.imageUrl = result.imageUrl
        }
        onSave() // Refresh the staff list
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to upload staff avatar:', errorData)
        alert(`Failed to upload avatar: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error uploading staff avatar:', error)
      alert('Error uploading avatar')
    } finally {
      setUploadingAvatar(false)
      // Reset the file input
      e.target.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    if (!staff || !staff.imageUrl) return

    if (!confirm('Are you sure you want to remove this avatar?')) return

    setRemovingAvatar(true)

    try {
      console.log('🗑️ Removing staff avatar:', staff.id)

      const response = await fetch(`/api/staff/${staff.id}/avatar`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Staff avatar removed successfully:', result)
        // Update the staff object
        if (staff) {
          staff.imageUrl = null
        }
        onSave() // Refresh the staff list
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to remove staff avatar:', errorData)
        alert(`Failed to remove avatar: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error removing staff avatar:', error)
      alert('Error removing avatar')
    } finally {
      setRemovingAvatar(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: colorScheme.surface }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: colorScheme.text }}>
              {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ backgroundColor: colorScheme.errorLight }}
            >
              <EyeOff className="h-5 w-5" style={{ color: colorScheme.error }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload Section - Only for existing staff */}
            {staff && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
                  Profile Picture
                </h3>
                <div className="flex items-center space-x-6">
                  {/* Current Avatar */}
                  <div className="relative">
                    {staff.imageUrl ? (
                      <div className="relative">
                        <img
                          src={staff.imageUrl}
                          alt={`${staff.firstName} ${staff.lastName}`}
                          className="w-20 h-20 rounded-full object-cover border-2"
                          style={{ borderColor: colorScheme.border }}
                        />
                        <button
                          type="button"
                          onClick={handleAvatarRemove}
                          disabled={removingAvatar}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                        style={{ 
                          backgroundColor: colorScheme.surface,
                          borderColor: colorScheme.border 
                        }}
                      >
                        <User className="h-8 w-8" style={{ color: colorScheme.textSecondary }} />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col space-y-2">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: colorScheme.primary,
                        color: 'white'
                      }}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                    <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                      JPG, PNG up to 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Password {staff ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!staff}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="e.g., Physiotherapist, Nutritionist"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  >
                    <option value="">Select Department</option>
                    <option value="Medical">Medical</option>
                    <option value="Performance">Performance</option>
                    <option value="Administration">Administration</option>
                    <option value="Coaching">Coaching</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                    Experience (years)
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colorScheme.background,
                      borderColor: colorScheme.border,
                      color: colorScheme.text
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: colorScheme.text }}>
                Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reports Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: colorScheme.text }}>
                    Reports
                  </h4>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canViewReports"
                      checked={formData.permissions.canViewReports}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      View Reports
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canEditReports"
                      checked={formData.permissions.canEditReports}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Edit Reports
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canDeleteReports"
                      checked={formData.permissions.canDeleteReports}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Delete Reports
                    </span>
                  </label>
                </div>

                {/* Event Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: colorScheme.text }}>
                    Events
                  </h4>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canCreateEvents"
                      checked={formData.permissions.canCreateEvents}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Create Events
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canEditEvents"
                      checked={formData.permissions.canEditEvents}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Edit Events
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canDeleteEvents"
                      checked={formData.permissions.canDeleteEvents}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Delete Events
                    </span>
                  </label>
                </div>

                {/* Player Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: colorScheme.text }}>
                    Players
                  </h4>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canViewAllPlayers"
                      checked={formData.permissions.canViewAllPlayers}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      View All Players
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canEditPlayers"
                      checked={formData.permissions.canEditPlayers}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Edit Players
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canAddPlayerMedia"
                      checked={formData.permissions.canAddPlayerMedia}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Add Player Media
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canAddPlayerNotes"
                      checked={formData.permissions.canAddPlayerNotes}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Add Player Notes
                    </span>
                  </label>
                </div>

                {/* System Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium" style={{ color: colorScheme.text }}>
                    System
                  </h4>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canViewCalendar"
                      checked={formData.permissions.canViewCalendar}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      View Calendar
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canViewDashboard"
                      checked={formData.permissions.canViewDashboard}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      View Dashboard
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canManageStaff"
                      checked={formData.permissions.canManageStaff}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      Manage Staff
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="canViewReports"
                      checked={formData.permissions.canViewReports}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colorScheme.text }}>
                      View Reports
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t" style={{ borderColor: colorScheme.border }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border transition-colors"
                style={{ 
                  backgroundColor: colorScheme.background,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : (staff ? 'Update Staff' : 'Add Staff')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Team Chat Modal */}
      <TeamChat 
        isOpen={showTeamChat} 
        onClose={() => setShowTeamChat(false)} 
      />
    </div>
  )
}
