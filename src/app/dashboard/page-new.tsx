'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Users, TrendingUp, Clock, User, Activity, AlertTriangle, FileText, FolderOpen, Percent, StickyNote } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import MobileCalendar from '@/components/MobileCalendar'
import EventAnalytics from '@/components/EventAnalytics'

interface Player {
  id: string
  name: string
  email?: string
  position?: string
  status?: string
  availabilityStatus?: string
  imageUrl?: string
  dateOfBirth?: string
  height?: number
  weight?: number
}

interface Event {
  id: string
  title: string
  description?: string
  type: string
  startTime: string
  endTime: string
  location?: string
  participants: Player[]
}

export default function Dashboard() {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [staffPermissions, setStaffPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers()
    fetchEvents()
    fetchStaffPermissions()
  }, [user])

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffPermissions = async () => {
    try {
      if (user?.role === 'STAFF' && user?.staff) {
        setStaffPermissions(user.staff)
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error)
    }
  }

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

  // Calculate stats
  const totalPlayers = players.length
  const activePlayers = players.filter(p => p.status === 'ACTIVE').length
  const totalEvents = events.length
  const todayEvents = events.filter(e => {
    if (!e.startTime) return false
    const eventDate = new Date(e.startTime).toDateString()
    const today = new Date().toDateString()
    return eventDate === today
  }).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: colorScheme.background }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
            Dashboard
          </h1>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Welcome back, {user?.name || user?.email}!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="p-6 rounded-lg border" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" style={{ color: '#3B82F6' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Players</p>
                <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{totalPlayers}</p>
              </div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg border" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
          >
            <div className="flex items-center">
              <Activity className="h-8 w-8 mr-3" style={{ color: '#10B981' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Active Players</p>
                <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{activePlayers}</p>
                <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                  {activePlayers} of {totalPlayers} players fully available
                </p>
              </div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg border" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
          >
            <div className="flex items-center">
              <Calendar className="h-8 w-8 mr-3" style={{ color: '#F59E0B' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Total Events</p>
                <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{totalEvents}</p>
              </div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg border" 
            style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
          >
            <div className="flex items-center">
              <Clock className="h-8 w-8 mr-3" style={{ color: '#EF4444' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Today's Events</p>
                <p className="text-2xl font-bold" style={{ color: colorScheme.text }}>{todayEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Reports Card - Only visible to Coaches, Admins, and Staff with permission (NEVER to players) */}
          {user?.role !== 'PLAYER' && ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) && (
            <div 
              className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow" 
              style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
              onClick={() => {
                // For all users (staff, coaches, admins), go to the full reports page
                window.location.href = '/dashboard/reports'
              }}
            >
              <div className="flex items-center">
                <FolderOpen className="h-8 w-8 mr-3" style={{ color: '#7C3AED' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Reports</p>
                  <p className="text-2xl font-bold" style={{ color: '#7C3AED' }}>&nbsp;</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Card - Only visible to Coaches, Admins, and Staff with permission (NEVER to players) */}
          {user?.role !== 'PLAYER' && ((user?.role === 'COACH' || user?.role === 'ADMIN') || (user?.role === 'STAFF' && staffPermissions?.canViewReports)) && (
            <div 
              className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow" 
              style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}
              onClick={() => {
                // For all users (staff, coaches, admins), go to the full notes page
                window.location.href = '/dashboard/notes'
              }}
            >
              <div className="flex items-center">
                <StickyNote className="h-8 w-8 mr-3" style={{ color: '#F59E0B' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>Notes</p>
                  <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>&nbsp;</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Players Section */}
        <div className="px-0 sm:px-6">
          <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: colorScheme.text }}>
              Players
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.slice(0, 8).map((player) => (
                <div
                  key={player.id}
                  className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                  style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {player.imageUrl ? (
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5" style={{ color: colorScheme.textSecondary }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: colorScheme.text }}>
                        {player.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: colorScheme.textSecondary }}>
                        {player.position || 'No position'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {players.length > 8 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.href = '/dashboard/players'}
                  className="text-sm font-medium hover:underline"
                  style={{ color: colorScheme.primary }}
                >
                  View all {players.length} players
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Event Analytics - Only for Admin and Staff */}
        {user && ['ADMIN', 'COACH', 'STAFF'].includes(user.role) && (
          <div className="px-0 sm:px-6">
            <EventAnalytics userId={user.id} userRole={user.role} />
          </div>
        )}

        {/* Calendar - Read Only */}
        <div className="px-0 sm:px-6">
          <div className="w-full rounded-3xl shadow-xl p-4 border-2 transition-all duration-300 hover:shadow-2xl" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: colorScheme.text }}>
              Calendar
            </h2>
            <div className="w-full">
              <MobileCalendar 
                user={user} 
                staffPermissions={staffPermissions}
                showAddButtons={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
