import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    console.error('Error deleting event:', error)
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
    console.log('🔄 Event update request:', { eventId, body })
    
    const {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      location,
      icon,
      selectedPlayers = [],
      selectedStaff = [],
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    console.log('🔄 Updating event with participants:', { selectedPlayers, selectedStaff })

    // Update event with participants in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // First, delete existing participants
      await tx.eventParticipant.deleteMany({
        where: { eventId: eventId }
      })
      console.log('✅ Deleted existing participants')

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

      const finalEventType = (type && ['TRAINING', 'MATCH', 'MEETING', 'RECOVERY', 'MEAL', 'REST', 'LB_GYM', 'UB_GYM', 'PRE_ACTIVATION', 'REHAB', 'STAFF_MEETING', 'VIDEO_ANALYSIS', 'DAY_OFF', 'TRAVEL', 'OTHER'].includes(type.toUpperCase())) 
        ? type.toUpperCase() 
        : 'TRAINING'

      // Update the event
      const event = await tx.events.update({
        where: { id: eventId },
        data: {
          title,
          description,
          type: finalEventType,
          date: new Date(date),
          startTime: startTime || '00:00',
          endTime: endTime || '23:59',
          location: location || null,
          iconName: icon || getDefaultIcon(finalEventType),
        }
      })
      console.log('✅ Updated event:', event.id)

      // Add new participants
      const participants = []
      
      // Add players
      for (const playerId of selectedPlayers) {
        const participant = await tx.eventParticipant.create({
          data: {
            eventId: eventId,
            playerId: playerId,
            staffId: null,
          }
        })
        participants.push(participant)
      }
      console.log('✅ Added players:', selectedPlayers.length)

      // Add staff
      for (const staffId of selectedStaff) {
        const participant = await tx.eventParticipant.create({
          data: {
            eventId: eventId,
            playerId: null,
            staffId: staffId,
          }
        })
        participants.push(participant)
      }
      console.log('✅ Added staff:', selectedStaff.length)

      // Fetch the complete event with participants
      const completeEvent = await tx.events.findUnique({
        where: { id: eventId },
        include: {
          participants: {
            include: {
              player: true,
              staff: true,
            }
          }
        }
      })

      return completeEvent
    })

    // Transform event to map iconName to icon for frontend compatibility
    const transformedEvent = {
      ...result,
      icon: result.iconName || 'Calendar'
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
