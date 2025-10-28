'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, Calendar, Trophy, Edit, Trash2, UserPlus, CheckCircle, Upload, X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Team {
  id: string
  name: string
  logo?: string | null
  color: string
  description: string
  playerCount: number
  coachCount: number
  availablePlayers: number
  unavailablePlayers: number
  wins: number
  losses: number
  draws: number
  players: Array<{
    id: string
    firstName: string
    lastName: string
    status: string
  }>
  coaches: Array<{
    coach: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

export default function TeamsPage() {
  const { colorScheme } = useTheme()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team? This will remove all players and coaches from the team.')) {
      return
    }

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTeams(teams.filter(team => team.id !== id))
      } else {
        alert('Failed to delete team')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Error deleting team')
    }
  }

  const handleLogoUpload = async (teamId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch(`/api/teams/${teamId}/logo`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        // Update the team in the state
        setTeams(teams.map(team => 
          team.id === teamId 
            ? { ...team, logo: result.logoUrl }
            : team
        ))
      } else {
        alert('Failed to upload logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo')
    }
  }

  const handleLogoRemove = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/logo`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Update the team in the state
        setTeams(teams.map(team => 
          team.id === teamId 
            ? { ...team, logo: null }
            : team
        ))
      } else {
        alert('Failed to remove logo')
      }
    } catch (error) {
      console.error('Error removing logo:', error)
      alert('Error removing logo')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading teams...
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
              Teams
            </h1>
            <p className="text-lg mt-2" style={{ color: colorScheme.textSecondary }}>
              Manage your teams and their performance
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </button>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: colorScheme.surface }}>
              <div className="p-6">
                {/* Team Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.logo ? (
                          <img 
                            src={team.logo} 
                            alt={`${team.name} logo`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          team.name.charAt(0)
                        )}
                      </div>
                      
                      {/* Logo upload/remove buttons */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                        <label className="cursor-pointer">
                          <Upload className="h-4 w-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleLogoUpload(team.id, file)
                            }}
                          />
                        </label>
                        {team.logo && (
                          <button
                            onClick={() => handleLogoRemove(team.id)}
                            className="cursor-pointer"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                        {team.name}
                      </h3>
                      <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                        {team.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingTeam(team)}
                      className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ backgroundColor: colorScheme.primaryLight }}
                    >
                      <Edit className="h-4 w-4" style={{ color: colorScheme.primary }} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ backgroundColor: colorScheme.errorLight }}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: colorScheme.error }} />
                    </button>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-4 w-4 mr-1" style={{ color: colorScheme.textSecondary }} />
                      <span className="text-2xl font-bold" style={{ color: colorScheme.text }}>{team.playerCount}</span>
                    </div>
                    <p className="text-xs" style={{ color: colorScheme.textSecondary }}>Players</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="h-4 w-4 mr-1" style={{ color: colorScheme.textSecondary }} />
                      <span className="text-2xl font-bold" style={{ color: colorScheme.text }}>{team.upcomingMatches}</span>
                    </div>
                    <p className="text-xs" style={{ color: colorScheme.textSecondary }}>Upcoming</p>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="pt-4 mb-4" style={{ borderTop: `1px solid ${colorScheme.border}` }}>
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium" style={{ color: colorScheme.text }}>Season Record</span>
                  </div>
                  <div className="flex justify-center space-x-4 text-sm">
                    <div className="text-center">
                      <span className="font-semibold text-green-600">{team.wins}</span>
                      <p className="text-xs" style={{ color: colorScheme.textSecondary }}>W</p>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold" style={{ color: colorScheme.textSecondary }}>{team.draws}</span>
                      <p className="text-xs" style={{ color: colorScheme.textSecondary }}>D</p>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-red-600">{team.losses}</span>
                      <p className="text-xs" style={{ color: colorScheme.textSecondary }}>L</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/dashboard/teams/${team.id}`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/teams/${team.id}/players`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium border rounded-md transition-colors"
                    style={{ 
                      borderColor: colorScheme.border,
                      color: colorScheme.text,
                      backgroundColor: colorScheme.background
                    }}
                  >
                    Assign Players
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8" style={{ color: colorScheme.primary }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Players</p>
                <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>
                  {teams.reduce((sum, team) => sum + team.playerCount, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Upcoming Matches</p>
                <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>
                  {teams.reduce((sum, team) => sum + team.upcomingMatches, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Wins</p>
                <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>
                  {teams.reduce((sum, team) => sum + team.wins, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg shadow p-6" style={{ backgroundColor: colorScheme.surface }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Active Teams</p>
                <p className="text-2xl font-semibold" style={{ color: colorScheme.text }}>{teams.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: colorScheme.text }}>
              No teams yet
            </h3>
            <p className="mb-4" style={{ color: colorScheme.textSecondary }}>
              Create your first team to get started
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Add Team
            </button>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || editingTeam) && (
          <TeamModal
            team={editingTeam}
            onClose={() => {
              setShowAddModal(false)
              setEditingTeam(null)
            }}
            onSave={() => {
              fetchTeams()
              setShowAddModal(false)
              setEditingTeam(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Team Modal Component
function TeamModal({ 
  team, 
  onClose, 
  onSave 
}: { 
  team: Team | null
  onClose: () => void
  onSave: () => void
}) {
  const { colorScheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    color: team?.color || '#dc2626'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = team ? `/api/teams/${team.id}` : '/api/teams'
      const method = team ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to save team')
      }
    } catch (error) {
      console.error('Error saving team:', error)
      alert('Error saving team')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="rounded-xl shadow-xl max-w-md w-full"
        style={{ backgroundColor: colorScheme.surface }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: colorScheme.text }}>
              {team ? 'Edit Team' : 'Add New Team'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ backgroundColor: colorScheme.errorLight }}
            >
              <Trash2 className="h-5 w-5" style={{ color: colorScheme.error }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Team Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
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
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
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
                Team Color
              </label>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full h-10 border rounded-lg focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: colorScheme.border
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6" style={{ borderTop: `1px solid ${colorScheme.border}` }}>
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
                {loading ? 'Saving...' : (team ? 'Update Team' : 'Add Team')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
