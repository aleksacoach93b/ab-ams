'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, UserCheck, UserX, Search, Shield, UserPlus, Settings } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Player {
  id: string
  firstName: string
  lastName: string
  email?: string
  position?: string
  status: string
  teamId?: string
}

interface Staff {
  id: string
  firstName: string
  lastName: string
  email?: string
  role: string
  specialization?: string
  status: string
  teamId?: string
}

interface Team {
  id: string
  name: string
  color: string
  description?: string
  players: Player[]
  staff: Staff[]
}

export default function TeamPlayersPage() {
  const { colorScheme } = useTheme()
  const params = useParams()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'players' | 'staff'>('players')

  useEffect(() => {
    if (params.id) {
      fetchTeamData()
      fetchAllPlayers()
      fetchAllStaff()
    }
  }, [params.id])

  const fetchTeamData = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setTeam(data)
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    }
  }

  const fetchAllPlayers = async () => {
    try {
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        setAllPlayers(data)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchAllStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setAllStaff(data)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    )
  }

  const handleAssignPlayers = async () => {
    if (selectedPlayers.length === 0) return

    setSaving(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerIds: selectedPlayers }),
      })

      if (response.ok) {
        await fetchTeamData()
        await fetchAllPlayers()
        setSelectedPlayers([])
        alert(`${selectedPlayers.length} players assigned to team`)
      } else {
        alert('Failed to assign players')
      }
    } catch (error) {
      console.error('Error assigning players:', error)
      alert('Error assigning players')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignStaff = async () => {
    if (selectedStaff.length === 0) return

    setSaving(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffIds: selectedStaff }),
      })

      if (response.ok) {
        await fetchTeamData()
        await fetchAllStaff()
        setSelectedStaff([])
        alert(`${selectedStaff.length} staff members assigned to team`)
      } else {
        alert('Failed to assign staff')
      }
    } catch (error) {
      console.error('Error assigning staff:', error)
      alert('Error assigning staff')
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the team?')) return

    try {
      const response = await fetch(`/api/teams/${params.id}/players`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerIds: [playerId] }),
      })

      if (response.ok) {
        await fetchTeamData()
        await fetchAllPlayers()
        alert('Player removed from team')
      } else {
        alert('Failed to remove player')
      }
    } catch (error) {
      console.error('Error removing player:', error)
      alert('Error removing player')
    }
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Remove this staff member from the team?')) return

    try {
      const response = await fetch(`/api/teams/${params.id}/staff`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffIds: [staffId] }),
      })

      if (response.ok) {
        await fetchTeamData()
        await fetchAllStaff()
        alert('Staff member removed from team')
      } else {
        alert('Failed to remove staff member')
      }
    } catch (error) {
      console.error('Error removing staff:', error)
      alert('Error removing staff member')
    }
  }

  const filteredPlayers = allPlayers.filter(player =>
    (player.firstName && player.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (player.lastName && player.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (player.position && player.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (player.name && player.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredStaff = allStaff.filter(staff =>
    (staff.firstName && staff.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staff.lastName && staff.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staff.role && staff.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staff.specialization && staff.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staff.name && staff.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const availablePlayers = filteredPlayers.filter(player => 
    !team?.players.some(teamPlayer => teamPlayer.id === player.id)
  )

  const availableStaff = filteredStaff.filter(staff => 
    !team?.staff.some(teamStaff => teamStaff.id === staff.id)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <p style={{ color: colorScheme.textSecondary }}>Team not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
            style={{ backgroundColor: colorScheme.primaryLight }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: colorScheme.primary }} />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
              {team.name} - Team Management
            </h1>
            <p className="text-lg mt-1" style={{ color: colorScheme.textSecondary }}>
              Assign and manage players and staff for this team
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6" style={{ backgroundColor: colorScheme.surface }}>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'players' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'players' ? colorScheme.primary : 'transparent',
              color: activeTab === 'players' ? 'white' : colorScheme.text
            }}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Players ({team.players.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'staff' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'staff' ? colorScheme.primary : 'transparent',
              color: activeTab === 'staff' ? 'white' : colorScheme.text
            }}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Staff ({team.staff.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Team Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center" style={{ color: colorScheme.text }}>
                <UserCheck className="h-5 w-5 mr-2" />
                Current {activeTab === 'players' ? 'Players' : 'Staff'} ({activeTab === 'players' ? team.players.length : team.staff.length})
              </h2>
            </div>

            <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: colorScheme.surface }}>
              {activeTab === 'players' ? (
                team.players.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                    <p style={{ color: colorScheme.textSecondary }}>No players assigned to this team</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {team.players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: colorScheme.background,
                          borderColor: colorScheme.border
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: team.color }}
                          >
                            {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: colorScheme.text }}>
                              {player.firstName} {player.lastName}
                            </p>
                            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                              {player.position || 'Player'} • {player.status}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                          style={{ backgroundColor: colorScheme.errorLight }}
                        >
                          <UserX className="h-4 w-4" style={{ color: colorScheme.error }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                team.staff.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                    <p style={{ color: colorScheme.textSecondary }}>No staff assigned to this team</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {team.staff.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: colorScheme.background,
                          borderColor: colorScheme.border
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: team.color }}
                          >
                            {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: colorScheme.text }}>
                              {staff.firstName} {staff.lastName}
                            </p>
                            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                              {staff.role} {staff.specialization && `• ${staff.specialization}`} • {staff.status}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveStaff(staff.id)}
                          className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                          style={{ backgroundColor: colorScheme.errorLight }}
                        >
                          <UserX className="h-4 w-4" style={{ color: colorScheme.error }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Available Members */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center" style={{ color: colorScheme.text }}>
                {activeTab === 'players' ? <Users className="h-5 w-5 mr-2" /> : <Shield className="h-5 w-5 mr-2" />}
                Available {activeTab === 'players' ? 'Players' : 'Staff'}
              </h2>
              {((activeTab === 'players' && selectedPlayers.length > 0) || (activeTab === 'staff' && selectedStaff.length > 0)) && (
                <button
                  onClick={activeTab === 'players' ? handleAssignPlayers : handleAssignStaff}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : `Add ${activeTab === 'players' ? selectedPlayers.length : selectedStaff.length} ${activeTab === 'players' ? 'Player' : 'Staff'}${(activeTab === 'players' ? selectedPlayers.length : selectedStaff.length) > 1 ? 's' : ''}`}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-3" style={{ color: colorScheme.textSecondary }} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: colorScheme.surface }}>
              {activeTab === 'players' ? (
                availablePlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                    <p style={{ color: colorScheme.textSecondary }}>
                      {searchTerm ? 'No players found matching your search' : 'All players are already assigned to teams'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availablePlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPlayers.includes(player.id) ? 'ring-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: selectedPlayers.includes(player.id) ? colorScheme.primaryLight : colorScheme.background,
                          borderColor: selectedPlayers.includes(player.id) ? colorScheme.primary : colorScheme.border
                        }}
                        onClick={() => handlePlayerToggle(player.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: colorScheme.primary }}
                          >
                            {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: colorScheme.text }}>
                              {player.firstName} {player.lastName}
                            </p>
                            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                              {player.position || 'Player'} • {player.status}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedPlayers.includes(player.id) ? 'bg-red-600 border-red-600' : ''
                        }`}>
                          {selectedPlayers.includes(player.id) && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                availableStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto mb-3" style={{ color: colorScheme.textSecondary }} />
                    <p style={{ color: colorScheme.textSecondary }}>
                      {searchTerm ? 'No staff found matching your search' : 'All staff are already assigned to teams'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStaff.includes(staff.id) ? 'ring-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: selectedStaff.includes(staff.id) ? colorScheme.primaryLight : colorScheme.background,
                          borderColor: selectedStaff.includes(staff.id) ? colorScheme.primary : colorScheme.border
                        }}
                        onClick={() => handleStaffToggle(staff.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: colorScheme.primary }}
                          >
                            {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: colorScheme.text }}>
                              {staff.firstName} {staff.lastName}
                            </p>
                            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                              {staff.role} {staff.specialization && `• ${staff.specialization}`} • {staff.status}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedStaff.includes(staff.id) ? 'bg-red-600 border-red-600' : ''
                        }`}>
                          {selectedStaff.includes(staff.id) && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
