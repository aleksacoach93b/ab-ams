import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notificationService'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (LOCAL_DEV_MODE) {
      const { id } = await params
      const body = await request.json()
      if (!id || !body.status) {
        return NextResponse.json({ message: 'Player ID and status are required' }, { status: 400 })
      }

      console.log(`🔄 [LOCAL_DEV] Updating player ${id} status to: ${body.status}`)

      // Read current state
      const state = await readState()
      
      // Find player
      const playerIndex = state.players.findIndex(p => p.id === id)
      if (playerIndex === -1) {
        return NextResponse.json({ message: 'Player not found' }, { status: 404 })
      }

      // Get player before update for notification
      const playerBefore = { ...state.players[playerIndex] }

      // Update player status in localDevStore
      state.players[playerIndex] = {
        ...state.players[playerIndex],
        status: body.status // Update status field
      }

      // Map status to label for analytics
      const statusMap: { [key: string]: string } = {
        'FULLY_AVAILABLE': 'Fully Available',
        'PARTIAL_TRAINING': 'Partially Available - Training',
        'PARTIAL_TEAM_INDIVIDUAL': 'Partially Available - Team + Individual',
        'REHAB_INDIVIDUAL': 'Rehabilitation - Individual',
        'NOT_AVAILABLE_INJURY': 'Unavailable - Injury',
        'PARTIAL_ILLNESS': 'Partially Available - Illness',
        'NOT_AVAILABLE_ILLNESS': 'Unavailable - Illness',
        'INDIVIDUAL_WORK': 'Individual Work',
        'RECOVERY': 'Recovery',
        'NOT_AVAILABLE_OTHER': 'Unavailable - Other',
        'DAY_OFF': 'Day Off',
        'NATIONAL_TEAM': 'National Team',
        'PHYSIO_THERAPY': 'Physio Therapy',
        'ACTIVE': 'Active',
        'INJURED': 'Injured',
        'SUSPENDED': 'Suspended',
        'INACTIVE': 'Inactive',
        'RETIRED': 'Retired'
      }
      const statusLabel = statusMap[body.status] || body.status || 'Unknown'

      // If status is FULLY_AVAILABLE, automatically clear reason and notes for today
      const isFullyAvailable = body.status === 'FULLY_AVAILABLE' || body.status === 'Fully Available'
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dateStr = today.toISOString().split('T')[0]
      const now = new Date().toISOString()
      
      if (isFullyAvailable) {
        // Find and update today's note if it exists
        const todayNoteIndex = state.dailyPlayerNotes.findIndex(
          note => note.playerId === id && note.date === dateStr
        )
        
        if (todayNoteIndex !== -1) {
          state.dailyPlayerNotes[todayNoteIndex] = {
            ...state.dailyPlayerNotes[todayNoteIndex],
            reason: '',
            notes: null,
            updatedAt: now
          }
          console.log('🧹 [STATUS UPDATE] Automatically cleared reason and notes for FULLY_AVAILABLE status')
        }
      }

      // Also save/update analytics data for today
      if (!state.dailyPlayerAnalytics) {
        state.dailyPlayerAnalytics = []
      }
      
      const existingAnalyticsIndex = state.dailyPlayerAnalytics.findIndex(
        (a: any) => a.playerId === id && a.date === dateStr
      )
      
      if (existingAnalyticsIndex !== -1) {
        // Update existing analytics
        state.dailyPlayerAnalytics[existingAnalyticsIndex] = {
          ...state.dailyPlayerAnalytics[existingAnalyticsIndex],
          activity: statusLabel,
          playerName: state.players[playerIndex].name,
          count: 1,
          updatedAt: now
        }
        console.log('✅ [STATUS UPDATE] Updated existing analytics:', state.dailyPlayerAnalytics[existingAnalyticsIndex].id)
      } else {
        // Create new analytics entry
        const newAnalytics = {
          id: `daily-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: dateStr,
          playerId: id,
          playerName: state.players[playerIndex].name,
          activity: statusLabel,
          count: 1,
          createdAt: now,
          updatedAt: now
        }
        state.dailyPlayerAnalytics.push(newAnalytics)
        console.log('✅ [STATUS UPDATE] Created new analytics entry:', newAnalytics.id)
      }

      // Write updated state
      await writeState(state)

      console.log(`✅ [LOCAL_DEV] Successfully updated player ${id} status to: ${body.status}`)

      return NextResponse.json({
        message: 'Player status updated successfully',
        playerId: id,
        status: body.status,
        player: {
          id,
          name: state.players[playerIndex].name,
          availabilityStatus: body.status,
          status: body.status
        }
      })
    }
    const { id } = await params
    const body = await request.json()

    if (!id || !body.status) {
      return NextResponse.json(
        { message: 'Player ID and status are required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating player ${id} availabilityStatus to: ${body.status}`)
    
    // Get player info before update for notification
    const playerBefore = await prisma.players.findUnique({
      where: { id },
      select: { name: true, availabilityStatus: true }
    })
    
    // Update the availabilityStatus field instead of status
    const updatedPlayer = await prisma.players.update({
      where: { id },
      data: { availabilityStatus: body.status },
      select: {
        id: true,
        name: true,
        availabilityStatus: true,
        status: true
      }
    })

    console.log(`✅ Successfully updated player ${id} availabilityStatus to: ${body.status}`)

    // If status is FULLY_AVAILABLE, automatically clear reason and notes for today
    const isFullyAvailable = body.status === 'FULLY_AVAILABLE' || body.status === 'Fully Available'
    if (isFullyAvailable) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Update today's note if it exists
      try {
        const todayNote = await prisma.dailyPlayerNotes.findUnique({
          where: {
            date_playerId: {
              date: today,
              playerId: id
            }
          }
        })
        
        if (todayNote) {
          await prisma.dailyPlayerNotes.update({
            where: {
              date_playerId: {
                date: today,
                playerId: id
              }
            },
            data: {
              reason: '',
              notes: null,
              updatedAt: new Date()
            }
          })
          console.log('🧹 [STATUS UPDATE] Automatically cleared reason and notes for FULLY_AVAILABLE status')
        }
      } catch (noteError) {
        console.error('Error clearing notes for FULLY_AVAILABLE status:', noteError)
        // Don't fail the status update if note clearing fails
      }
    }

    // Create notification for player status change
    if (playerBefore && playerBefore.availabilityStatus !== body.status) {
      try {
        await NotificationService.notifyPlayerStatusChanged(
          id,
          playerBefore.name || 'Unknown Player',
          body.status
        )
        console.log(`📢 Created notification for player ${id} status change`)
      } catch (notificationError) {
        console.error('Error creating player status notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({
      message: 'Player status updated successfully',
      playerId: id,
      status: body.status,
      player: updatedPlayer
    })

  } catch (error) {
    console.error('Error updating player status:', error)
    return NextResponse.json(
      { message: 'Failed to update player status', error: error.message },
      { status: 500 }
    )
  }
}
