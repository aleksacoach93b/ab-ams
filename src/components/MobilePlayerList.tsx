'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Phone, Mail, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { PlayerSkeleton } from '@/components/skeletons'
import PullToRefresh from '@/components/PullToRefresh'

interface Player {
  id: string
  name: string
  position: string
  dateOfBirth: string
  team: string
  status: string
  username: string
  accountSetup: string
  mobileUsed: string
  lastUsed: string
  avatar: string | null
  age: number
  height: string
  weight: string
}

interface MobilePlayerListProps {
  onAddPlayer?: () => void
}

export default function MobilePlayerList({ onAddPlayer }: MobilePlayerListProps) {
  const { colorScheme } = useTheme()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch players from API
  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        const transformedPlayers = data.map((player: any) => ({
          id: player.id,
          name: player.name || 'Unknown Player',
          position: player.position || 'Not specified',
          dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : 'Not specified',
          team: player.team?.name || 'No team',
          status: player.availabilityStatus || player.status || 'Unknown',
          username: player.email || player.user?.email || 'No email',
          accountSetup: 'Complete',
          mobileUsed: 'Unknown',
          lastUsed: 'Unknown',
          avatar: player.imageUrl || player.avatar || null,
          age: player.dateOfBirth ? new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear() : 0,
          height: player.height ? `${player.height} cm` : 'Not specified',
          weight: player.weight ? `${player.weight} kg` : 'Not specified'
        }))
        setPlayers(transformedPlayers)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
    
    // Listen for player status updates to refresh the list
    const handleStatusUpdate = () => {
      console.log('🔄 Refreshing players list after status update...')
      fetchPlayers()
    }
    
    window.addEventListener('playerStatusUpdated', handleStatusUpdate)
    
    return () => {
      window.removeEventListener('playerStatusUpdated', handleStatusUpdate)
    }
  }, [])

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return
    }

    console.log('🗑️ Frontend: Starting delete for player:', playerId)
    setDeleting(playerId)
    try {
      console.log('🗑️ Frontend: Sending DELETE request to:', `/api/players/${playerId}`)
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE'
      })
      
      console.log('🗑️ Frontend: Received response:', response.status, response.statusText)
      
      if (response.ok) {
        setPlayers(players.filter((player: Player) => player.id !== playerId))
        alert('Player deleted successfully')
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('Failed to delete player:', errorData)
        console.error('Response status:', response.status)
        const errorMessage = errorData?.message || errorData?.error || 'Unknown error'
        alert(`Failed to delete player: ${typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}`)
      }
    } catch (error) {
      console.error('Error deleting player:', error)
      alert('Error deleting player. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const formatStatus = (status: string) => {
    // Convert enum values to readable format
    const statusMap: { [key: string]: string } = {
      'FULLY_AVAILABLE': 'Fully Available',
      'PARTIAL_TRAINING': 'Partial Training',
      'PARTIAL_TEAM_INDIVIDUAL': 'Partial Team Individual',
      'REHAB_INDIVIDUAL': 'Rehab Individual',
      'NOT_AVAILABLE_INJURY': 'Not Available - Injury',
      'PARTIAL_ILLNESS': 'Partial Illness',
      'NOT_AVAILABLE_ILLNESS': 'Not Available - Illness',
      'INDIVIDUAL_WORK': 'Individual Work',
      'RECOVERY': 'Recovery',
      'NOT_AVAILABLE_OTHER': 'Not Available - Other',
      'DAY_OFF': 'Day Off',
      'NATIONAL_TEAM': 'National Team',
      'PHYSIO_THERAPY': 'Physio Therapy',
      'ACTIVE': 'Active',
      'INJURED': 'Injured',
      'SUSPENDED': 'Suspended',
      'INACTIVE': 'Inactive',
      'RETIRED': 'Retired'
    }
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'FULLY_AVAILABLE' || statusUpper === 'ACTIVE' || statusUpper === 'HEALTHY') {
      return 'text-green-400'
    }
    if (statusUpper === 'INJURED' || statusUpper === 'PHYSIO_THERAPY' || statusUpper === 'REHAB_INDIVIDUAL' || statusUpper === 'RECOVERY') {
      return 'text-yellow-400'
    }
    if (statusUpper === 'SUSPENDED' || statusUpper === 'NOT_AVAILABLE_INJURY' || statusUpper === 'NOT_AVAILABLE_ILLNESS' || statusUpper === 'NOT_AVAILABLE_OTHER') {
      return 'text-red-400'
    }
    if (statusUpper === 'INACTIVE' || statusUpper === 'RETIRED') {
      return 'text-gray-400'
    }
    return colorScheme.primary
  }

  const getStatusDot = (status: string) => {
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'FULLY_AVAILABLE' || statusUpper === 'ACTIVE' || statusUpper === 'HEALTHY') {
      return 'bg-green-400'
    }
    if (statusUpper === 'INJURED' || statusUpper === 'PHYSIO_THERAPY' || statusUpper === 'REHAB_INDIVIDUAL' || statusUpper === 'RECOVERY') {
      return 'bg-yellow-400'
    }
    if (statusUpper === 'SUSPENDED' || statusUpper === 'NOT_AVAILABLE_INJURY' || statusUpper === 'NOT_AVAILABLE_ILLNESS' || statusUpper === 'NOT_AVAILABLE_OTHER') {
      return 'bg-red-400'
    }
    if (statusUpper === 'INACTIVE' || statusUpper === 'RETIRED') {
      return 'bg-gray-400'
    }
    return colorScheme.primary
  }

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <PullToRefresh onRefresh={fetchPlayers}>
      <div className="min-h-screen" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div 
        className="sticky top-0 border-b px-2 sm:px-4 py-3"
        style={{ 
          backgroundColor: colorScheme.surface,
          borderColor: colorScheme.border
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colorScheme.primary }}
            >
              <span 
                className="text-sm font-bold"
                style={{ color: colorScheme.primaryText || 'white' }}
              >
                AB
              </span>
            </div>
            <h1 
              className="text-xl font-bold"
              style={{ color: colorScheme.text }}
            >
              Players
            </h1>
          </div>
          <button
            onClick={onAddPlayer}
            className="font-medium text-sm transition-colors"
            style={{ 
              color: colorScheme.text,
              backgroundColor: 'transparent'
            }}
          >
            + Add Player
          </button>
        </div>
      </div>

      {/* Players List */}
      <div className="px-2 sm:px-4 py-4 pb-20">
        {loading ? (
          <PlayerSkeleton count={6} />
        ) : players.length === 0 ? (
          <div className="text-center py-8">
            <User 
              className="h-12 w-12 mx-auto mb-4" 
              style={{ color: colorScheme.textSecondary }}
            />
            <p style={{ color: colorScheme.textSecondary }}>No players found</p>
            <button 
              onClick={onAddPlayer}
              className="font-medium mt-2 transition-colors"
              style={{ 
                color: colorScheme.primary,
                backgroundColor: 'transparent'
              }}
            >
              Add your first player
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {players.map((player) => (
              <div 
                key={player.id} 
                className="card-fade-in hover-scale rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderWidth: '4px',
                  borderStyle: 'solid',
                  borderColor: `${colorScheme.border}FF`,
                  boxShadow: `0 4px 6px -1px ${colorScheme.border}20, 0 2px 4px -1px ${colorScheme.border}10`,
                  position: 'relative'
                }}
              >
                {/* Card Header */}
                  {/* Subtle gradient overlay on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${colorScheme.border}08 0%, transparent 100%)`
                    }}
                  />
                  <div className="p-3 sm:p-4 relative z-10">
                    <div className="flex items-start justify-between">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      {player.avatar ? (
                        <div className="relative">
                          <img
                            src={player.avatar}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border-2 transition-transform duration-300 group-hover:scale-110"
                            style={{ borderColor: `${colorScheme.border}FF` }}
                          />
                          <div 
                            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              boxShadow: `0 0 0 2px ${colorScheme.border}40, 0 0 8px ${colorScheme.border}60`
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform duration-300 group-hover:scale-110"
                          style={{ 
                            backgroundColor: colorScheme.primary,
                            borderColor: `${colorScheme.border}FF`
                          }}
                        >
                          <span 
                            className="font-semibold text-lg"
                            style={{ color: colorScheme.primaryText || 'white' }}
                          >
                            {getPlayerInitials(player.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link
                        href={`/dashboard/players/${player.id}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        style={{ 
                          backgroundColor: colorScheme.primary,
                          color: colorScheme.primaryText || 'white',
                          boxShadow: `0 2px 4px ${colorScheme.primary}40`
                        }}
                        title="View Profile"
                      >
                        <User className="h-4 w-4" style={{ color: colorScheme.primaryText || 'white' }} />
                      </Link>
                      <Link
                        href={`/dashboard/players/${player.id}/edit`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        style={{ 
                          backgroundColor: colorScheme.primary,
                          color: colorScheme.primaryText || 'white',
                          boxShadow: `0 2px 4px ${colorScheme.primary}40`
                        }}
                        title="Edit Player"
                      >
                        <Edit className="h-4 w-4" style={{ color: colorScheme.primaryText || 'white' }} />
                      </Link>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        disabled={deleting === player.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ 
                          backgroundColor: '#ef4444',
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
                        }}
                        title="Delete Player"
                      >
                        {deleting === player.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Trash2 className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-3 sm:px-4 pb-4">
                  {/* Player Name */}
                  <h3 
                    className="text-lg font-bold mb-1 transition-all duration-300 group-hover:translate-x-1"
                    style={{ color: colorScheme.text }}
                  >
                    {player.name}
                  </h3>
                  
                  {/* Position */}
                  <p 
                    className="text-sm mb-3 transition-all duration-300 group-hover:translate-x-1"
                    style={{ color: colorScheme.textSecondary }}
                  >
                    {player.position}
                  </p>
                  
                  {/* Player Details */}
                  <div className="space-y-2 text-sm">
                    {/* Age */}
                    <div 
                      className="flex items-center"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      <span 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: colorScheme.border }}
                      ></span>
                      <span>{player.age} years old</span>
                    </div>
                    
                    {/* Height & Weight */}
                    <div 
                      className="flex items-center"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      <span 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: colorScheme.border }}
                      ></span>
                      <span>{player.height} • {player.weight}</span>
                    </div>
                    
                    {/* Team */}
                    <div 
                      className="flex items-center"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      <span 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: colorScheme.border }}
                      ></span>
                      <span>{player.team}</span>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center mt-3">
                      <div 
                        className={`w-2.5 h-2.5 rounded-full mr-2 ${getStatusDot(player.status)} transition-all duration-300 group-hover:scale-125 group-hover:shadow-lg`}
                        style={{
                          boxShadow: `0 0 6px ${getStatusDot(player.status).includes('green') ? 'rgba(74, 222, 128, 0.6)' : getStatusDot(player.status).includes('yellow') ? 'rgba(250, 204, 21, 0.6)' : getStatusDot(player.status).includes('red') ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.6)'}`
                        }}
                      />
                      <span className={`text-sm font-medium transition-all duration-300 ${getStatusColor(player.status)}`}>
                        {formatStatus(player.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  )
}
