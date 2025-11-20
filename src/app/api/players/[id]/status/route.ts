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

    console.log(`🔄 Updating player ${id} status to: ${body.status}`)
    
    // Get player info before update for notification
    const playerBefore = await prisma.players.findUnique({
      where: { id },
      select: { 
        id: true,
        firstName: true,
        lastName: true,
        status: true
      }
    })
    
    if (!playerBefore) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }
    
    // Update the status field
    const updatedPlayer = await prisma.players.update({
      where: { id },
      data: { 
        status: body.status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true
      }
    })

    console.log(`✅ Successfully updated player ${id} status to: ${body.status}`)

    // If status is FULLY_AVAILABLE, automatically clear reason and notes for today
    const isFullyAvailable = body.status === 'FULLY_AVAILABLE' || body.status === 'Fully Available'
    if (isFullyAvailable) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Update today's note if it exists
      try {
        const todayNote = await prisma.daily_player_notes.findFirst({
          where: {
            playerId: id,
            date: {
              gte: new Date(today.setHours(0, 0, 0, 0)),
              lt: new Date(today.setHours(23, 59, 59, 999))
            }
          }
        })
        
        if (todayNote) {
          await prisma.daily_player_notes.update({
            where: { id: todayNote.id },
            data: {
              reason: null,
              notes: null
            }
          })
          console.log('🧹 [STATUS UPDATE] Automatically cleared reason and notes for FULLY_AVAILABLE status')
        }
      } catch (noteError) {
        console.error('Error clearing notes for FULLY_AVAILABLE status:', noteError)
        // Don't fail the status update if note clearing fails
      }
    }

    // Automatically save/update analytics data for today when status changes
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    try {
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
      
      // Check if analytics already exists for today
      const existingAnalytics = await prisma.daily_player_analytics.findUnique({
        where: {
          date_playerId: {
            date: today,
            playerId: id
          }
        }
      })
      
      if (existingAnalytics) {
        // Update existing analytics (only if it's today - data from previous days is locked)
        const analyticsDate = new Date(existingAnalytics.date)
        analyticsDate.setHours(0, 0, 0, 0)
        const todayDate = new Date(today)
        todayDate.setHours(0, 0, 0, 0)
        
        if (analyticsDate.getTime() === todayDate.getTime()) {
          // Only update if it's today's data
          await prisma.daily_player_analytics.update({
            where: { id: existingAnalytics.id },
            data: {
              status: statusLabel
            }
          })
          console.log(`✅ [STATUS UPDATE] Updated analytics for today: ${id} -> ${statusLabel}`)
        } else {
          console.log(`⚠️ [STATUS UPDATE] Analytics exists for ${analyticsDate.toISOString().split('T')[0]}, but it's locked (not today)`)
        }
      } else {
        // Create new analytics entry for today
        await prisma.daily_player_analytics.create({
          data: {
            date: today,
            playerId: id,
            status: statusLabel,
            notes: null
          }
        })
        console.log(`✅ [STATUS UPDATE] Created analytics for today: ${id} -> ${statusLabel}`)
      }
    } catch (analyticsError) {
      console.error('Error saving analytics for status update:', analyticsError)
      // Don't fail the status update if analytics save fails
    }

    // Create notification for player status change
    const playerName = `${playerBefore.firstName} ${playerBefore.lastName}`.trim()
    if (playerBefore && playerBefore.status !== body.status) {
      try {
        await NotificationService.notifyPlayerStatusChanged(
          id,
          playerName || 'Unknown Player',
          body.status
        )
        console.log(`📢 Created notification for player ${id} status change`)
      } catch (notificationError) {
        console.error('Error creating player status notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    // Transform response to match frontend expectations
    const fullName = `${updatedPlayer.firstName} ${updatedPlayer.lastName}`.trim()
    const transformedPlayer = {
      id: updatedPlayer.id,
      name: fullName,
      firstName: updatedPlayer.firstName,
      lastName: updatedPlayer.lastName,
      status: updatedPlayer.status,
      availabilityStatus: updatedPlayer.status // Map status to availabilityStatus for frontend compatibility
    }

    return NextResponse.json({
      message: 'Player status updated successfully',
      playerId: id,
      status: body.status,
      player: transformedPlayer
    })

  } catch (error) {
    console.error('Error updating player status:', error)
    return NextResponse.json(
      { message: 'Failed to update player status', error: error.message },
      { status: 500 }
    )
  }
}
