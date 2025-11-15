'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useEffect } from 'react'
import MobileCalendar from '@/components/MobileCalendar'

export default function CalendarPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { colorScheme } = useTheme()
  const [staffPermissions, setStaffPermissions] = useState<any>(null)

  useEffect(() => {
    fetchStaffPermissions()
  }, [])

  const fetchStaffPermissions = async () => {
    try {
      if (user?.role === 'STAFF') {
        const response = await fetch('/api/staff')
        if (response.ok) {
          const staffData = await response.json()
          const currentStaff = staffData.find((staff: any) => staff.userId === user?.id)
          if (currentStaff) {
            setStaffPermissions(currentStaff)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error)
    }
  }

  const handleEventClick = (event: any) => {
    // Handle event click - could open event details modal
    console.log('Event clicked:', event)
  }

  const handleAddEvent = () => {
    router.push('/dashboard/events/new')
  }

  return (
    <div className="w-full p-0 sm:p-4">
      <div className="w-full rounded-3xl shadow-xl p-0 sm:p-4 border-2 transition-all duration-300 hover:shadow-2xl overflow-hidden" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="w-full">
          <MobileCalendar 
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
            user={user}
            staffPermissions={staffPermissions}
          />
        </div>
      </div>
    </div>
  )
}