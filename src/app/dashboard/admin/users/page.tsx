'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Edit, Trash2, Eye, Filter, X } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'COACH' | 'PLAYER' | 'STAFF'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  playerData?: any
  coachData?: any
  staffData?: any
}

export default function UsersPage() {
  const { colorScheme } = useTheme()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      
      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isActive: !currentStatus } : user
        ))
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleViewUser = (user: User) => {
    // Navigate to the appropriate profile page based on role
    if (user.role === 'PLAYER' && user.playerData) {
      window.location.href = `/dashboard/players/${user.playerData.id}`
    } else if (user.role === 'STAFF') {
      // For staff, navigate to the staff management page
      window.location.href = `/dashboard/staff`
    } else if (user.role === 'ADMIN' || user.role === 'COACH') {
      // For admins/coaches, show user details in a simple modal
      setSelectedUser(user)
      setShowUserModal(true)
    }
  }

  const handleEditUser = (user: User) => {
    // Navigate to the appropriate edit page based on role
    if (user.role === 'PLAYER' && user.playerData) {
      window.location.href = `/dashboard/players/${user.playerData.id}/edit`
    } else if (user.role === 'STAFF') {
      // For staff, navigate to the staff management page where they can be edited
      window.location.href = `/dashboard/staff`
    } else if (user.role === 'ADMIN' || user.role === 'COACH') {
      // For admins/coaches, show edit modal
      setEditingUser(user)
      setShowEditModal(true)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: colorScheme.background }}>
        <div style={{ color: colorScheme.textSecondary }}>Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/admin" style={{ color: colorScheme.textSecondary }}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: colorScheme.text }}>User Management</h1>
            <p style={{ color: colorScheme.textSecondary }}>Manage system users and their permissions</p>
          </div>
        </div>
        <Link href="/dashboard/players/new" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg shadow p-4" style={{ backgroundColor: colorScheme.surface }}>
          <div className="text-2xl font-semibold" style={{ color: colorScheme.text }}>{users.length}</div>
          <div className="text-sm" style={{ color: colorScheme.textSecondary }}>Total Users</div>
        </div>
        <div className="rounded-lg shadow p-4" style={{ backgroundColor: colorScheme.surface }}>
          <div 
            className="text-2xl font-semibold"
            style={{ color: colorScheme.primary }}
          >
            {users.filter(u => u.role === 'COACH').length}
          </div>
          <div className="text-sm" style={{ color: colorScheme.textSecondary }}>Coaches</div>
        </div>
        <div className="rounded-lg shadow p-4" style={{ backgroundColor: colorScheme.surface }}>
          <div className="text-2xl font-semibold text-green-600">
            {users.filter(u => u.role === 'PLAYER').length}
          </div>
          <div className="text-sm" style={{ color: colorScheme.textSecondary }}>Players</div>
        </div>
        <div className="rounded-lg shadow p-4" style={{ backgroundColor: colorScheme.surface }}>
          <div className="text-2xl font-semibold text-red-600">
            {users.filter(u => u.role === 'ADMIN').length}
          </div>
          <div className="text-sm" style={{ color: colorScheme.textSecondary }}>Admins</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg shadow p-4" style={{ backgroundColor: colorScheme.surface }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colorScheme.textSecondary }} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                style={{ 
                  backgroundColor: colorScheme.background,
                  borderColor: colorScheme.border,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}`
                }}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" style={{ color: colorScheme.textSecondary }} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              style={{ 
                backgroundColor: colorScheme.background,
                borderColor: colorScheme.border,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="COACH">Coach</option>
              <option value="PLAYER">Player</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: colorScheme.surface }}>
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ borderColor: colorScheme.border }}>
            <thead style={{ backgroundColor: colorScheme.background }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colorScheme.textSecondary }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colorScheme.textSecondary }}>
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colorScheme.textSecondary }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colorScheme.textSecondary }}>
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colorScheme.textSecondary }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ borderColor: colorScheme.border }}>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: `1px solid ${colorScheme.border}` }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colorScheme.primary }}>
                          <span className="text-sm font-medium text-white">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium" style={{ color: colorScheme.text }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm" style={{ color: colorScheme.textSecondary }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role === 'COACH' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: colorScheme.textSecondary }}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewUser(user)}
                        className="transition-colors"
                        style={{ 
                          color: colorScheme.primary,
                          backgroundColor: 'transparent'
                        }}
                        title={user.role === 'PLAYER' ? "View Player Profile" : user.role === 'STAFF' ? "View Staff Profile" : "View User Details"}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title={user.role === 'PLAYER' ? "Edit Player" : user.role === 'STAFF' ? "Edit Staff" : "Edit User"}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8" style={{ color: colorScheme.textSecondary }}>
            {searchTerm || filterRole !== 'ALL' 
              ? 'No users found matching your criteria' 
              : 'No users found'}
          </div>
        )}
      </div>

      {/* User Details Modal - Only for Admin/Coach users */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg max-w-md w-full" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>User Details</h2>
              <button
                onClick={() => setShowUserModal(false)}
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colorScheme.primary }}>
                  <span className="text-lg font-medium text-white">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium" style={{ color: colorScheme.text }}>{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p style={{ color: colorScheme.textSecondary }}>{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Role</label>
                  <p className="text-sm" style={{ color: colorScheme.text }}>{selectedUser.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Status</label>
                  <p className="text-sm" style={{ color: colorScheme.text }}>{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Created</label>
                  <p className="text-sm" style={{ color: colorScheme.text }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Last Login</label>
                  <p className="text-sm" style={{ color: colorScheme.text }}>
                    {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t" style={{ borderColor: colorScheme.border }}>
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ 
                  color: colorScheme.text,
                  backgroundColor: colorScheme.background,
                  border: `1px solid ${colorScheme.border}`
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false)
                  handleEditUser(selectedUser)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg max-w-md w-full" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>Edit User</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>First Name</label>
                <input
                  type="text"
                  defaultValue={editingUser.firstName}
                  className="mt-1 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Last Name</label>
                <input
                  type="text"
                  defaultValue={editingUser.lastName}
                  className="mt-1 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Email</label>
                <input
                  type="email"
                  defaultValue={editingUser.email}
                  className="mt-1 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Role</label>
                <select
                  defaultValue={editingUser.role}
                  className="mt-1 block w-full rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="COACH">Coach</option>
                  <option value="STAFF">Staff</option>
                  <option value="PLAYER">Player</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked={editingUser.isActive}
                  className="h-4 w-4 rounded"
                  style={{ 
                    color: colorScheme.primary,
                    borderColor: colorScheme.border
                  }}
                />
                <label className="ml-2 block text-sm" style={{ color: colorScheme.textSecondary }}>
                  Active
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t" style={{ borderColor: colorScheme.border }}>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ 
                  color: colorScheme.text,
                  backgroundColor: colorScheme.background,
                  border: `1px solid ${colorScheme.border}`
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // For now, just toggle active status as a simple example
                  handleUpdateUser(editingUser.id, { isActive: !editingUser.isActive })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
