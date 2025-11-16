export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, status, reason, notes, createdBy } = body

    console.log('📝 [PLAYER NOTES] Saving notes:', { playerId, status, reason, notes, createdBy })

    // Validate required fields
    if (!playerId || !status || !reason || !createdBy) {
      console.error('❌ [PLAYER NOTES] Missing required fields:', { playerId, status, reason, createdBy })
      return NextResponse.json(
        { message: 'Player ID, status, reason, and createdBy are required' },
        { status: 400 }
      )
    }

    // Local dev mode: save to localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Get player info
      const player = state.players.find(p => p.id === playerId)
      if (!player) {
        console.error('❌ [PLAYER NOTES] Player not found:', playerId)
        return NextResponse.json(
          { message: 'Player not found' },
          { status: 404 }
        )
      }

      // Get today's date (YYYY-MM-DD format)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dateStr = today.toISOString().split('T')[0]

      // Find existing daily note for today
      const existingNoteIndex = state.dailyPlayerNotes.findIndex(
        note => note.playerId === playerId && note.date === dateStr
      )

      const now = new Date().toISOString()
      
      // If status is FULLY_AVAILABLE, automatically clear reason and notes
      const isFullyAvailable = status === 'FULLY_AVAILABLE' || status === 'Fully Available'
      const finalReason = isFullyAvailable ? '' : reason
      const finalNotes = isFullyAvailable ? null : (notes || null)
      
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
      const statusLabel = statusMap[status] || status || 'Unknown'
      
      if (existingNoteIndex !== -1) {
        // Update existing note
        state.dailyPlayerNotes[existingNoteIndex] = {
          ...state.dailyPlayerNotes[existingNoteIndex],
          status,
          reason: finalReason,
          notes: finalNotes,
          updatedAt: now
        }
        console.log('✅ [PLAYER NOTES] Updated existing daily note:', state.dailyPlayerNotes[existingNoteIndex].id)
        if (isFullyAvailable) {
          console.log('🧹 [PLAYER NOTES] Automatically cleared reason and notes for FULLY_AVAILABLE status')
        }
      } else {
        // Create new note
        const newNote = {
          id: `daily-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: dateStr,
          playerId,
          playerName: player.name,
          status,
          reason: finalReason,
          notes: finalNotes,
          createdBy,
          createdAt: now,
          updatedAt: now
        }
        state.dailyPlayerNotes.push(newNote)
        console.log('✅ [PLAYER NOTES] Created new daily note:', newNote.id)
        if (isFullyAvailable) {
          console.log('🧹 [PLAYER NOTES] Automatically cleared reason and notes for FULLY_AVAILABLE status')
        }
      }

      // Also save/update analytics data for this date
      if (!state.dailyPlayerAnalytics) {
        state.dailyPlayerAnalytics = []
      }
      
      const existingAnalyticsIndex = state.dailyPlayerAnalytics.findIndex(
        (a: any) => a.playerId === playerId && a.date === dateStr
      )
      
      if (existingAnalyticsIndex !== -1) {
        // Update existing analytics
        state.dailyPlayerAnalytics[existingAnalyticsIndex] = {
          ...state.dailyPlayerAnalytics[existingAnalyticsIndex],
          activity: statusLabel,
          playerName: player.name,
          count: 1,
          updatedAt: now
        }
        console.log('✅ [PLAYER ANALYTICS] Updated existing analytics:', state.dailyPlayerAnalytics[existingAnalyticsIndex].id)
      } else {
        // Create new analytics entry
        const newAnalytics = {
          id: `daily-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: dateStr,
          playerId,
          playerName: player.name,
          activity: statusLabel,
          count: 1,
          createdAt: now,
          updatedAt: now
        }
        state.dailyPlayerAnalytics.push(newAnalytics)
        console.log('✅ [PLAYER ANALYTICS] Created new analytics entry:', newAnalytics.id)
      }

      await writeState(state)

      const savedNote = state.dailyPlayerNotes.find(
        note => note.playerId === playerId && note.date === dateStr
      )

      return NextResponse.json({
        message: 'Daily notes saved successfully',
        data: savedNote
      })
    }

    // Production mode: use database
    // Get player info
    const player = await prisma.players.findUnique({
      where: { id: playerId },
      select: { 
        id: true,
        firstName: true,
        lastName: true
      }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }
    
    const playerName = `${player.firstName} ${player.lastName}`.trim()

    // Get today's date (YYYY-MM-DD format)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If status is FULLY_AVAILABLE, automatically clear reason and notes
    const isFullyAvailable = status === 'FULLY_AVAILABLE' || status === 'Fully Available'
    const finalReason = isFullyAvailable ? '' : reason
    const finalNotes = isFullyAvailable ? null : (notes || null)
    
    // Check if note exists for today
    const existingNote = await prisma.daily_player_notes.findFirst({
      where: {
        playerId: playerId,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    })
    
    let dailyNote
    if (existingNote) {
      // Update existing note
      dailyNote = await prisma.daily_player_notes.update({
        where: { id: existingNote.id },
        data: {
          reason: finalReason || null,
          notes: finalNotes || null
        }
      })
    } else {
      // Create new note
      const noteId = `daily_note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      dailyNote = await prisma.daily_player_notes.create({
        data: {
          id: noteId,
          date: today,
          playerId,
          reason: finalReason || null,
          notes: finalNotes || null
        }
      })
    }
    
    if (isFullyAvailable) {
      console.log('🧹 [PLAYER NOTES] Automatically cleared reason and notes for FULLY_AVAILABLE status')
    }

    console.log('✅ Daily player notes saved:', dailyNote.id)

    return NextResponse.json({
      message: 'Daily notes saved successfully',
      data: dailyNote
    })

  } catch (error) {
    console.error('❌ Error saving daily player notes:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const date = searchParams.get('date')

    // Local dev mode: read from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      let notes = [...state.dailyPlayerNotes]
      
      // Filter by playerId if provided
      if (playerId) {
        notes = notes.filter(note => note.playerId === playerId)
      }
      
      // Filter by date if provided
      if (date) {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
        const dateStr = targetDate.toISOString().split('T')[0]
        notes = notes.filter(note => note.date === dateStr)
      }
      
      // Sort by date descending
      notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      // Transform to match Prisma format
      const transformedNotes = notes.map(note => ({
        ...note,
        player: {
          id: note.playerId,
          name: note.playerName,
          availabilityStatus: state.players.find(p => p.id === note.playerId)?.status || null
        }
      }))
      
      return NextResponse.json(transformedNotes)
    }

    // Production mode: use database
    let whereClause: any = {}

    if (playerId) {
      whereClause.playerId = playerId
    }

    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      whereClause.date = targetDate
    }

    const notes = await prisma.daily_player_notes.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      },
      include: {
        players: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      }
    })
    
    // Transform notes to match frontend expectations
    const transformedNotes = notes.map(note => ({
      id: note.id,
      date: note.date,
      playerId: note.playerId,
      reason: note.reason,
      notes: note.notes,
      createdAt: note.createdAt,
      player: note.players ? {
        id: note.players.id,
        name: `${note.players.firstName} ${note.players.lastName}`.trim(),
        availabilityStatus: note.players.status
      } : null
    }))

    return NextResponse.json(transformedNotes)

  } catch (error) {
    console.error('❌ Error fetching daily player notes:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
