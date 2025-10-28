import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'

const getEventColor = (type: string) => {
  switch (type) {
    case 'TRAINING': return '#F59E0B' // Orange
    case 'MATCH': return '#EF4444' // Red
    case 'MEETING': return '#3B82F6' // Blue
    case 'MEDICAL': return '#10B981' // Green
    case 'RECOVERY': return '#8B5CF6' // Purple
    case 'MEAL': return '#F97316' // Orange-red
    case 'REST': return '#6366F1' // Indigo
    case 'LB_GYM': return '#DC2626' // Dark Red
    case 'UB_GYM': return '#B91C1C' // Red
    case 'PRE_ACTIVATION': return '#EA580C' // Orange
    case 'REHAB': return '#059669' // Green
    case 'STAFF_MEETING': return '#1D4ED8' // Blue
    case 'VIDEO_ANALYSIS': return '#7C3AED' // Purple
    case 'DAY_OFF': return '#F59E0B' // Orange
    case 'TRAVEL': return '#06B6D4' // Cyan
    default: return '#6B7280' // Gray
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')

    let events

    if (userId && userRole) {
      // Filter events based on user participation
      if (userRole === 'PLAYER') {
        // First, find the player by userId or by email
        const player = await prisma.player.findFirst({
          where: {
            OR: [
              { userId: userId },
              { user: { id: userId } }
            ]
          }
        })

        if (!player) {
          return NextResponse.json([])
        }

        // Find events where the player is a participant
        events = await prisma.event.findMany({
          where: {
            participants: {
              some: {
                playerId: player.id
              }
            }
          },
          include: {
            participants: {
              include: {
                player: true,
                staff: true,
              },
            },
            media: true,
          },
          orderBy: {
            date: 'asc'
          }
        })
      } else if (userRole === 'STAFF') {
        // Find events where the staff is a participant
        events = await prisma.event.findMany({
          where: {
            participants: {
              some: {
                staff: {
                  userId: userId
                }
              }
            }
          },
          include: {
            participants: {
              include: {
                player: true,
                staff: true,
              },
            },
            media: true,
          },
          orderBy: {
            date: 'asc'
          }
        })
      } else {
        // For coaches and admins, show all events
        events = await prisma.event.findMany({
          include: {
            participants: {
              include: {
                player: true,
                staff: true,
              },
            },
            media: true,
          },
          orderBy: {
            date: 'asc'
          }
        })
      }
    } else {
      // If no user filter, show all events (for admin/coach views)
      events = await prisma.event.findMany({
        include: {
          participants: {
            include: {
              player: true,
              staff: true,
            },
          },
          media: true,
        },
        orderBy: {
          date: 'asc'
        }
      })
    }

    // Transform events to map iconName to icon for frontend compatibility
    const transformedEvents = events.map(event => ({
      ...event,
      icon: event.iconName || 'Calendar' // Map iconName to icon
    }))

    return NextResponse.json(transformedEvents)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 Event update request received')
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const {
      id,
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      location,
      isAllDay,
      isRecurring,
      allowPlayerCreation,
      allowPlayerReschedule,
      icon,
      matchDayTag,
    } = body

    console.log('🔍 Extracted fields:', { id, title, date, type, icon })

    // Validate required fields
    if (!id || !title || !date) {
      console.log('❌ Validation failed: missing required fields')
      console.log('📊 Field status:', { 
        id: id ? '✅' : '❌', 
        title: title ? '✅' : '❌', 
        date: date ? '✅' : '❌' 
      })
      return NextResponse.json(
        { message: 'ID, title and date are required' },
        { status: 400 }
      )
    }

    console.log('🔄 Updating event in database...')
    
    // Use a more reliable validation method
    const upperTypePut = type?.toUpperCase()
    const finalEventType = (upperTypePut && EventType[upperTypePut as keyof typeof EventType]) 
      ? upperTypePut as EventType 
      : EventType.TRAINING
    
    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        type: finalEventType,
        date: new Date(date),
        startTime: startTime || '00:00',
        endTime: endTime || '23:59',
        location: location || null,
        iconName: icon || 'Dumbbell', // Use iconName field from schema
        matchDayTag: matchDayTag || null, // Match Day Tag
      },
      include: {
        participants: {
          include: {
            player: true,
            staff: true,
          },
        },
        media: true,
      },
    })

    console.log('✅ Event updated successfully:', event.id, event.title, event.iconName)

    // Transform event to map iconName to icon for frontend compatibility
    const transformedEvent = {
      ...event,
      icon: event.iconName || 'Calendar'
    }

    return NextResponse.json(
      { message: 'Event updated successfully', event: transformedEvent },
      { status: 200 }
    )
  } catch (error) {
    console.error('💥 Error updating event:', error)
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to update event', 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Event creation request received')
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const {
      title,
      description = '',
      type = 'TRAINING',
      date,
      startTime = '10:00',
      endTime = '11:00',
      location = '',
      icon, // Icon from frontend
      matchDayTag = '', // Match Day Tag
      selectedPlayers = [], // Array of player IDs
      selectedStaff = [], // Array of staff IDs
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    console.log('📅 Creating event with data:', {
      title,
      type,
      date,
      startTime,
      endTime,
      location,
      icon,
      selectedPlayers,
      selectedStaff
    })

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

    // Use a more reliable validation method
    const upperType = type?.toUpperCase()
    const finalEventType = (upperType && EventType[upperType as keyof typeof EventType])
      ? upperType as EventType
      : 'TRAINING'

    // Create event first without participants
    const eventData = {
      title,
      description,
      type: finalEventType,
      date: new Date(date),
      startTime: startTime || '00:00',
      endTime: endTime || '23:59',
      location: location || null,
      iconName: icon || getDefaultIcon(finalEventType), // Use selected icon or appropriate default
      matchDayTag: matchDayTag || null, // Match Day Tag
    }

    const event = await prisma.event.create({
      data: eventData
    })

    console.log('✅ Event created successfully:', event.id)

    // Add participants if any
    if (selectedPlayers.length > 0 || selectedStaff.length > 0) {
      console.log('👥 Adding participants...')
      
      const participantData = [
        // Add selected players
        ...selectedPlayers.map((playerId: string) => ({
          eventId: event.id,
          playerId: playerId,
        })),
        // Add selected staff
        ...selectedStaff.map((staffId: string) => ({
          eventId: event.id,
          staffId: staffId,
        }))
      ]

      if (participantData.length > 0) {
        await prisma.eventParticipant.createMany({
          data: participantData
        })
        console.log('✅ Participants added successfully')
      }
    }

    // Fetch the complete event with participants
    const completeEvent = await prisma.event.findUnique({
      where: { id: event.id },
      include: {
        participants: {
          include: {
            player: true,
            staff: true,
          }
        }
      }
    })

    // Transform event to map iconName to icon for frontend compatibility
    const transformedEvent = {
      ...completeEvent,
      icon: completeEvent?.iconName || 'Calendar'
    }

    // Create notification for new event (async, don't wait)
    try {
      const token = request.headers.get('authorization')?.replace('Bearer ', '')
      if (token) {
        const user = await verifyToken(token)
        if (user) {
          await NotificationService.notifyEventCreated(
            event.id,
            title,
            user.userId
          )
        }
      }
    } catch (notificationError) {
      console.error('Error creating event notification:', notificationError)
      // Don't fail the event creation if notification fails
    }

    return NextResponse.json(
      { message: 'Event created successfully', event: transformedEvent },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating event:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      meta: (error as any)?.meta,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          code: (error as any)?.code,
          meta: (error as any)?.meta
        }
      },
      { status: 500 }
    )
  }
}
