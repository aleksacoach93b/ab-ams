import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readState, writeState } from '@/lib/localDevStore'
import { EventType } from '@prisma/client'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

const getEventColor = (type: string) => {
  switch (type) {
    case 'TRAINING': return '#F59E0B' // Orange
    case 'MATCH': return '#EF4444' // Red
    case 'MEETING': return '#3B82F6' // Blue
    case 'MEDICAL': return '#10B981' // Green
    case 'RECOVERY': return '#8B5CF6' // Purple
    case 'MEAL': return '#F97316' // Orange-Red (distinct from training)
    case 'REST': return '#6366F1' // Indigo
    case 'LB_GYM': return '#DC2626' // Dark Red
    case 'UB_GYM': return '#B91C1C' // Red
    case 'PRE_ACTIVATION': return '#EA580C' // Orange
    case 'REHAB': return '#059669' // Green
    case 'STAFF_MEETING': return '#1D4ED8' // Blue
    case 'VIDEO_ANALYSIS': return '#7C3AED' // Purple
    case 'DAY_OFF': return '#F59E0B' // Orange
    case 'TRAVEL': return '#06B6D4' // Cyan
    case 'OTHER': return '#6B7280' // Gray
    default: return '#6B7280' // Gray
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    console.log('🗑️ [DELETE EVENT] Request received for event:', eventId)

    if (LOCAL_DEV_MODE) {
      // Local dev mode: delete from localDevStore
      const state = await readState()
      const eventIndex = state.events?.findIndex(e => e.id === eventId)
      
      if (eventIndex === undefined || eventIndex === -1) {
        console.error('❌ [DELETE EVENT] Event not found:', eventId)
        return NextResponse.json(
          { message: 'Event not found' },
          { status: 404 }
        )
      }

      // Remove the event from the array
      state.events.splice(eventIndex, 1)
      await writeState(state)

      console.log('✅ [DELETE EVENT] Event deleted successfully from local state:', eventId)

      return NextResponse.json(
        { message: 'Event deleted successfully' },
        { status: 200 }
      )
    }

    // Database mode: use Prisma
    // Find the event first
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    // Delete the event
    await prisma.events.delete({
      where: { id: eventId }
    })

    return NextResponse.json(
      { message: 'Event deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error deleting event:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const body = await request.json()
    console.log('🔄 [UPDATE EVENT BY ID] Request received:', { eventId, body: { ...body, icon: body.icon } })
    
    const {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      location,
      icon,
      matchDayTag,
      selectedPlayers = [],
      selectedStaff = [],
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ [UPDATE EVENT BY ID] Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    // Local dev mode: update in localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const eventIndex = state.events?.findIndex(e => e.id === eventId)
      
      if (eventIndex === undefined || eventIndex === -1) {
        console.error('❌ [UPDATE EVENT BY ID] Event not found:', eventId)
        return NextResponse.json(
          { message: 'Event not found' },
          { status: 404 }
        )
      }

      const existingEvent = state.events[eventIndex]
      console.log('✅ [UPDATE EVENT BY ID] Found event:', { 
        id: existingEvent.id, 
        title: existingEvent.title,
        currentIcon: existingEvent.icon || existingEvent.iconName,
        newIcon: icon
      })

      // Use provided icon or keep existing, ensure both icon and iconName are set
      const finalIcon = icon !== undefined && icon !== null ? icon : (existingEvent.icon || existingEvent.iconName || 'Calendar')
      
      // Update participants if provided
      let participants = existingEvent.participants || []
      if (selectedPlayers.length > 0 || selectedStaff.length > 0) {
        participants = [
          ...selectedPlayers.map((playerId: string) => ({
            id: `part_${eventId}_player_${playerId}_${Date.now()}`,
            eventId,
            playerId,
            staffId: null,
            role: null,
            player: null,
            staff: null
          })),
          ...selectedStaff.map((staffId: string) => ({
            id: `part_${eventId}_staff_${staffId}_${Date.now()}`,
            eventId,
            playerId: null,
            staffId,
            role: null,
            player: null,
            staff: null
          }))
        ]
      }

      const updatedEvent = {
        ...existingEvent,
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        type: type ? type.toUpperCase() : existingEvent.type,
        date: date ? new Date(date).toISOString() : existingEvent.date,
        startTime: startTime !== undefined ? startTime : existingEvent.startTime,
        endTime: endTime !== undefined ? endTime : existingEvent.endTime,
        location: location !== undefined ? location : existingEvent.location,
        icon: finalIcon,
        iconName: finalIcon, // Keep both fields in sync
        color: type ? getEventColor(type.toUpperCase()) : existingEvent.color,
        matchDayTag: matchDayTag !== undefined ? (matchDayTag || null) : existingEvent.matchDayTag,
        participants,
        updatedAt: new Date().toISOString()
      }

      console.log('✅ [UPDATE EVENT BY ID] Updating event with:', { 
        icon: updatedEvent.icon, 
        iconName: updatedEvent.iconName,
        title: updatedEvent.title
      })

      state.events[eventIndex] = updatedEvent
      await writeState(state)

      console.log('✅ [UPDATE EVENT BY ID] Event updated successfully:', updatedEvent.id)

      return NextResponse.json(
        { 
          message: 'Event updated successfully', 
          event: {
            ...updatedEvent,
            icon: updatedEvent.icon || updatedEvent.iconName,
            iconName: updatedEvent.iconName || updatedEvent.icon
          }
        },
        { status: 200 }
      )
    }

    console.log('🔄 Updating event with participants:', { selectedPlayers, selectedStaff })

    // Combine date with startTime and endTime to create DateTime objects
    const startDateTime = new Date(`${date}T${startTime || '00:00'}:00`)
    const endDateTime = new Date(`${date}T${endTime || '23:59'}:00`)

    // Set appropriate default icon based on event type
    const getDefaultIcon = (eventType: string) => {
      switch (eventType.toUpperCase()) {
        case 'TRAINING': return 'dumbbell-realistic'
        case 'MATCH': return 'football-ball-realistic'
        case 'MEETING': return 'meeting-new'
        case 'MEDICAL': return 'blood-sample-final'
        case 'RECOVERY': return 'recovery-new'
        case 'MEAL': return 'meal-plate'
        case 'REST': return 'bed-time'
        case 'LB_GYM': return 'dumbbell-realistic'
        case 'UB_GYM': return 'dumbbell-realistic'
        case 'PRE_ACTIVATION': return 'dumbbell-realistic'
        case 'REHAB': return 'blood-sample-final'
        case 'STAFF_MEETING': return 'meeting-new'
        case 'VIDEO_ANALYSIS': return 'stopwatch-whistle'
        case 'DAY_OFF': return 'bed-time'
        case 'TRAVEL': return 'bus-new'
        case 'OTHER': return 'stopwatch-whistle'
        default: return 'dumbbell-realistic'
      }
    }

    // Use a more reliable validation method - check if type exists in EventType enum
    const upperTypePut = type?.toUpperCase()
    const finalEventType = (upperTypePut && EventType[upperTypePut as keyof typeof EventType]) 
      ? upperTypePut as EventType 
      : EventType.TRAINING

    // Update event with participants in a transaction
    // Increase timeout to 30 seconds for large participant lists
    // Optimize: only do critical operations in transaction, fetch complete event outside
    await prisma.$transaction(async (tx) => {
      // First, delete existing participants
      await tx.event_participants.deleteMany({
        where: { eventId: eventId }
      })
      console.log('✅ Deleted existing participants')

      // Update the event
      await tx.events.update({
        where: { id: eventId },
        data: {
          title,
          description: description || null,
          type: finalEventType,
          startTime: startDateTime, // DateTime object
          endTime: endDateTime, // DateTime object
          locationId: location || null, // Use locationId instead of location
          icon: icon || getDefaultIcon(finalEventType), // Use icon instead of iconName
          matchDayTag: matchDayTag !== undefined ? (matchDayTag || null) : undefined,
        }
      })
      console.log('✅ Updated event:', eventId)

      // Add new participants with IDs
      const participantData = [
        ...selectedPlayers.map((playerId: string) => ({
          id: `event_participant_${eventId}_${Date.now()}_player_${Math.random().toString(36).substr(2, 9)}`,
          eventId: eventId,
          playerId: playerId,
          staffId: null,
        })),
        ...selectedStaff.map((staffId: string) => ({
          id: `event_participant_${eventId}_${Date.now()}_staff_${Math.random().toString(36).substr(2, 9)}`,
          eventId: eventId,
          playerId: null,
          staffId: staffId,
        }))
      ]

      if (participantData.length > 0) {
        await tx.event_participants.createMany({
          data: participantData
        })
        console.log('✅ Added participants:', participantData.length)
      }
    }, {
      timeout: 30000, // 30 seconds timeout
      maxWait: 10000, // 10 seconds max wait to start transaction
    })

    // Fetch the complete event with participants OUTSIDE transaction (faster)
    const completeEvent = await prisma.events.findUnique({
      where: { id: eventId },
      include: {
        event_participants: {
          include: {
            players: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!completeEvent) {
      return NextResponse.json(
        { message: 'Event not found after update' },
        { status: 404 }
      )
    }

    // Transform event for frontend compatibility
    const transformedEvent = {
      id: completeEvent.id,
      title: completeEvent.title,
      description: completeEvent.description,
      type: completeEvent.type,
      startTime: completeEvent.startTime.toISOString(),
      endTime: completeEvent.endTime.toISOString(),
      date: completeEvent.startTime.toISOString().split('T')[0],
      icon: completeEvent.icon || 'Calendar',
      matchDayTag: (completeEvent as any).matchDayTag || null,
      participants: completeEvent.event_participants?.map(p => ({
        id: p.id,
        playerId: p.playerId,
        staffId: p.staffId,
        role: p.role,
        player: p.players ? {
          id: p.players.id,
          name: `${p.players.firstName} ${p.players.lastName}`.trim(),
          email: p.players.email
        } : null,
        staff: p.staff ? {
          id: p.staff.id,
          name: `${p.staff.firstName} ${p.staff.lastName}`.trim(),
          email: p.staff.email
        } : null
      })) || []
    }

    console.log('✅ Event updated successfully with participants:', transformedEvent.participants.length)

    return NextResponse.json(
      { message: 'Event updated successfully', event: transformedEvent },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error updating event:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return NextResponse.json(
      { 
        message: 'Failed to update event', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
