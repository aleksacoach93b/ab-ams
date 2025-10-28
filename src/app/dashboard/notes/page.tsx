'use client'

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import CoachNotes from '@/components/CoachNotes'
import { useState, useEffect } from 'react'

export default function NotesPage() {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [staffPermissions, setStaffPermissions] = useState<any>(null)

  useEffect(() => {
    const fetchStaffPermissions = async () => {
      try {
        if (user?.role === 'STAFF' && user?.staff) {
          setStaffPermissions(user.staff)
        }
      } catch (error) {
        console.error('Error fetching staff permissions:', error)
      }
    }
    fetchStaffPermissions()
  }, [user])

  // Check permissions - only coaches, admins, and staff with permission can access
  const hasAccess = user?.role === 'ADMIN' || 
                   user?.role === 'COACH' || 
                   (user?.role === 'STAFF' && staffPermissions?.canViewReports)

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colorScheme.text }}>Access Denied</h1>
          <p style={{ color: colorScheme.textSecondary }}>You don't have permission to view coach notes.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 px-4 py-2 rounded-lg font-medium"
            style={{ 
              backgroundColor: colorScheme.primary, 
              color: 'white' 
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: colorScheme.text }}>
          Coach Notes
        </h1>
        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
          Create and manage notes for coaches and staff with individual access controls
        </p>
      </div>

      {/* Coach Notes Component */}
      <CoachNotes staffPermissions={staffPermissions} />
    </div>
  )
}
