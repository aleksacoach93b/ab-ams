export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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
    console.log('🔍 Events fetch request received')
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      // Return events from state, transform to match frontend expectations
      const events = (state.events || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        iconName: event.iconName || event.icon,
        icon: event.icon || event.iconName || 'Calendar',
        color: event.color || getEventColor(event.type),
        matchDayTag: event.matchDayTag,
        isAllDay: event.isAllDay,
        isRecurring: event.isRecurring,
        allowPlayerCreation: event.allowPlayerCreation,
        allowPlayerReschedule: event.allowPlayerReschedule,
        participants: event.participants || [],
        media: event.media || []
      }))
      return NextResponse.json(events)
    }
    
    // Prisma handles connection pooling automatically
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')

    let events

    if (userId && userRole) {
      // Filter events based on user participation
      if (userRole === 'PLAYER') {
        // First, find the player by userId or by email
        const player = await prisma.players.findFirst({
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
        events = await prisma.events.findMany({
          where: {
            event_participants: {
              some: {
                playerId: player.id
              }
            }
          },
          include: {
            event_participants: {
              include: {
                players: true,
                staff: true,
              },
            },
            event_media: true,
          },
          orderBy: {
            startTime: 'asc'
          }
        })
      } else if (userRole === 'STAFF') {
        // Find events where the staff is a participant
        events = await prisma.events.findMany({
          where: {
            event_participants: {
              some: {
                staff: {
                  userId: userId
                }
              }
            }
          },
          include: {
            event_participants: {
              include: {
                players: true,
                staff: true,
              },
            },
            event_media: true,
          },
          orderBy: {
            startTime: 'asc'
          }
        })
      } else {
        // For coaches and admins, show all events
        events = await prisma.events.findMany({
          include: {
            event_participants: {
              include: {
                players: true,
                staff: true,
              },
            },
            event_media: true,
          },
          orderBy: {
            startTime: 'asc'
          }
        })
      }
    } else {
      // If no user filter, show all events (for admin/coach views)
      events = await prisma.events.findMany({
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
          startTime: 'asc'
        }
      })
    }

    // Transform events for frontend compatibility
    const transformedEvents = events.map(event => {
      // Transform participants and media to match frontend expectations
      const participants = event.event_participants?.map(p => ({
        id: p.id,
        playerId: p.playerId,
        staffId: p.staffId,
        role: p.role,
        player: p.players,
        staff: p.staff
      })) || []
      
      const media = event.event_media?.map(m => ({
        id: m.id,
        name: m.fileName,
        type: m.fileType,
        url: m.fileUrl,
        size: m.fileSize
      })) || []
      
      // Extract date from startTime for frontend compatibility
      const eventDate = event.startTime ? event.startTime.toISOString().split('T')[0] : null
      
      return {
        ...event,
        date: eventDate, // Add date field for frontend
        startTime: event.startTime ? event.startTime.toISOString() : null,
        endTime: event.endTime ? event.endTime.toISOString() : null,
        participants,
        media,
        icon: event.icon || 'Calendar',
        // Remove the Prisma relation fields
        event_participants: undefined,
        event_media: undefined
      }
    })

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
    console.log('📝 [UPDATE EVENT] Request received')
    
    if (LOCAL_DEV_MODE) {
      const body = await request.json()
      console.log('📝 [UPDATE EVENT] Body received:', { 
        id: body.id, 
        title: body.title, 
        icon: body.icon,
        type: body.type
      })
      
      const {
        id,
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
        isAllDay,
        isRecurring,
        allowPlayerCreation,
        allowPlayerReschedule
      } = body

      if (!id) {
        console.error('❌ [UPDATE EVENT] Event ID is required')
        return NextResponse.json(
          { message: 'Event ID is required' },
          { status: 400 }
        )
      }

      const state = await readState()
      const eventIndex = state.events?.findIndex(e => e.id === id)
      
      if (eventIndex === undefined || eventIndex === -1) {
        console.error('❌ [UPDATE EVENT] Event not found:', id)
        return NextResponse.json(
          { message: 'Event not found' },
          { status: 404 }
        )
      }

      const existingEvent = state.events[eventIndex]
      console.log('✅ [UPDATE EVENT] Found event:', { 
        id: existingEvent.id, 
        title: existingEvent.title,
        currentIcon: existingEvent.icon || existingEvent.iconName,
        newIcon: icon
      })

      // Update participants if provided
      let participants = existingEvent.participants || []
      if (selectedPlayers.length > 0 || selectedStaff.length > 0) {
        participants = [
          ...selectedPlayers.map((playerId: string) => ({
            id: `part_${id}_player_${playerId}_${Date.now()}`,
            eventId: id,
            playerId,
            staffId: null,
            role: null,
            player: null,
            staff: null
          })),
          ...selectedStaff.map((staffId: string) => ({
            id: `part_${id}_staff_${staffId}_${Date.now()}`,
            eventId: id,
            playerId: null,
            staffId,
            role: null,
            player: null,
            staff: null
          }))
        ]
      }

      // Use provided icon or keep existing, ensure both icon and iconName are set
      const finalIcon = icon !== undefined && icon !== null ? icon : (existingEvent.icon || existingEvent.iconName || 'Calendar')

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
        matchDayTag: matchDayTag !== undefined ? matchDayTag : existingEvent.matchDayTag,
        isAllDay: isAllDay !== undefined ? isAllDay : existingEvent.isAllDay,
        isRecurring: isRecurring !== undefined ? isRecurring : existingEvent.isRecurring,
        allowPlayerCreation: allowPlayerCreation !== undefined ? allowPlayerCreation : existingEvent.allowPlayerCreation,
        allowPlayerReschedule: allowPlayerReschedule !== undefined ? allowPlayerReschedule : existingEvent.allowPlayerReschedule,
        participants,
        updatedAt: new Date().toISOString()
      }

      console.log('✅ [UPDATE EVENT] Updating event with:', { 
        icon: updatedEvent.icon, 
        iconName: updatedEvent.iconName,
        title: updatedEvent.title
      })

      state.events[eventIndex] = updatedEvent
      await writeState(state)

      console.log('✅ [UPDATE EVENT] Event updated successfully:', updatedEvent.id)

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
    
    // Combine date with startTime and endTime to create DateTime objects
    const startDateTime = new Date(`${date}T${startTime || '00:00'}:00`)
    const endDateTime = new Date(`${date}T${endTime || '23:59'}:00`)
    
    const event = await prisma.events.update({
      where: { id },
      data: {
        title,
        description: description || null,
        type: finalEventType,
        startTime: startDateTime, // DateTime object
        endTime: endDateTime, // DateTime object
        locationId: location || null, // Use locationId instead of location
        icon: icon || 'Dumbbell', // Use icon instead of iconName
        isRecurring: body.isRecurring !== undefined ? body.isRecurring : undefined,
        isAllDay: body.isAllDay !== undefined ? body.isAllDay : undefined,
        allowPlayerCreation: body.allowPlayerCreation !== undefined ? body.allowPlayerCreation : undefined,
        allowPlayerReschedule: body.allowPlayerReschedule !== undefined ? body.allowPlayerReschedule : undefined,
        updatedAt: new Date(), // Update timestamp
      },
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
        },
        event_media: true
      },
    })

    console.log('✅ Event updated successfully:', event.id, event.title, event.icon)

    // Transform event for frontend compatibility
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      date: event.startTime.toISOString().split('T')[0], // Extract date for frontend
      icon: event.icon || 'Calendar',
      isRecurring: event.isRecurring,
      isAllDay: event.isAllDay,
      allowPlayerCreation: event.allowPlayerCreation,
      allowPlayerReschedule: event.allowPlayerReschedule,
      participants: event.event_participants.map(p => ({
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
      })),
      media: event.event_media || []
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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        message: 'Failed to update event',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Event creation request received')
    if (LOCAL_DEV_MODE) {
      const body = await request.json()
      const {
        title,
        description = '',
        type = 'TRAINING',
        date,
        startTime = '10:00',
        endTime = '11:00',
        location = '',
        icon,
        matchDayTag = '',
        selectedPlayers = [],
        selectedStaff = [],
        isAllDay = false,
        isRecurring = false,
        allowPlayerCreation = false,
        allowPlayerReschedule = false
      } = body

      // Validate required fields
      if (!title || !date) {
        return NextResponse.json(
          { message: 'Title and date are required' },
          { status: 400 }
        )
      }

      // Set appropriate default icon based on event type
      // IMPORTANT: Use exact icon names that match CustomIcon.tsx customIcons map
      const getDefaultIcon = (eventType: string) => {
        switch (eventType.toUpperCase()) {
          case 'TRAINING': return 'Dumbbell'
          case 'MATCH': return 'FootballBall'
          case 'MEETING': return 'Meeting' // CRITICAL: Use 'Meeting' not 'meeting-new'
          case 'MEDICAL': return 'BloodSample'
          case 'RECOVERY': return 'Recovery'
          case 'MEAL': return 'MealPlate'
          case 'REST': return 'BedTime'
          case 'LB_GYM': return 'Dumbbell'
          case 'UB_GYM': return 'Dumbbell'
          case 'PRE_ACTIVATION': return 'Activity'
          case 'REHAB': return 'BloodSample'
          case 'STAFF_MEETING': return 'Meeting' // CRITICAL: Use 'Meeting' not 'meeting-new'
          case 'VIDEO_ANALYSIS': return 'Video'
          case 'DAY_OFF': return 'BedTime'
          case 'TRAVEL': return 'Bus'
          case 'OTHER': return 'Calendar'
          default: return 'Dumbbell'
        }
      }

      // Use provided icon or default based on type
      // IMPORTANT: Ensure icon name matches CustomIcon.tsx keys exactly
      const finalIcon = icon || getDefaultIcon(type)
      console.log('🎨 [CREATE EVENT] Icon selected:', { 
        providedIcon: icon, 
        finalIcon, 
        eventType: type,
        defaultIcon: getDefaultIcon(type)
      })
      const eventId = `local-evt-${Date.now()}`
      const now = new Date().toISOString()
      
      // Create participants array
      const participants = [
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

      const newEvent = {
        id: eventId,
        title,
        description: description || null,
        type: type.toUpperCase(),
        date: new Date(date).toISOString(),
        startTime,
        endTime,
        location: location || null,
        icon: finalIcon,
        iconName: finalIcon,
        color: getEventColor(type.toUpperCase()),
        matchDayTag: matchDayTag || null,
        isAllDay: !!isAllDay,
        isRecurring: !!isRecurring,
        allowPlayerCreation: !!allowPlayerCreation,
        allowPlayerReschedule: !!allowPlayerReschedule,
        participants,
        media: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to state
      const state = await readState()
      if (!state.events) {
        state.events = []
      }
      state.events.push(newEvent)
      await writeState(state)

      // Send notifications to player participants only
      try {
        const { createNotification } = await import('@/lib/localDevStore')
        const playerParticipantIds = selectedPlayers || []
        
        if (playerParticipantIds.length > 0) {
          // Get player user IDs for participants
          const playerUserIds = playerParticipantIds
            .map(pid => {
              const playerUser = state.playerUsers.find((u: any) => u.playerId === pid)
              return playerUser?.id
            })
            .filter((id): id is string => !!id)
          
          if (playerUserIds.length > 0) {
            await createNotification({
              title: 'New Event Created',
              message: `"${title}" has been scheduled`,
              type: 'INFO',
              category: 'EVENT',
              userIds: playerUserIds,
              relatedId: eventId,
              relatedType: 'event'
            })
            console.log(`📱 Sent ${playerUserIds.length} event notifications to players`)
          }
        }
      } catch (notificationError) {
        console.error('❌ Error creating event notifications:', notificationError)
        // Don't fail event creation if notification fails
      }

      return NextResponse.json(
        { 
          message: 'Event created successfully', 
          event: {
            ...newEvent,
            icon: finalIcon,
            iconName: finalIcon
          }
        },
        { status: 201 }
      )
    }
    
    // Prisma handles connection pooling automatically
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

    // Generate unique ID for event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Combine date with startTime and endTime to create DateTime objects
    const startDateTime = new Date(`${date}T${startTime || '00:00'}:00`)
    const endDateTime = new Date(`${date}T${endTime || '23:59'}:00`)
    
    // Create event first without participants
    const eventData = {
      id: eventId,
      title,
      description: description || null,
      type: finalEventType,
      startTime: startDateTime, // DateTime object
      endTime: endDateTime, // DateTime object
      locationId: location || null, // Use locationId instead of location
      icon: icon || getDefaultIcon(finalEventType), // Use icon instead of iconName
      isRecurring: body.isRecurring || false,
      isAllDay: body.isAllDay || false,
      allowPlayerCreation: body.allowPlayerCreation || false,
      allowPlayerReschedule: body.allowPlayerReschedule || false,
      updatedAt: new Date(), // Add updatedAt field for Prisma
    }

    console.log('📅 Creating event with data:', {
      id: eventId,
      title,
      type: finalEventType,
      startTime: startDateTime,
      endTime: endDateTime,
      icon: eventData.icon
    })

    const event = await prisma.events.create({
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
        // Generate unique IDs for each participant
        const participantsWithIds = participantData.map((p, index) => ({
          id: `event_participant_${event.id}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          ...p
        }))
        
        await prisma.event_participants.createMany({
          data: participantsWithIds
        })
        console.log('✅ Participants added successfully')
      }
    }

    // Fetch the complete event with participants
    const completeEvent = await prisma.events.findUnique({
      where: { id: event.id },
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
        },
        event_media: true
      }
    })

    // Transform event for frontend compatibility
    const transformedEvent = {
      id: completeEvent!.id,
      title: completeEvent!.title,
      description: completeEvent!.description,
      type: completeEvent!.type,
      startTime: completeEvent!.startTime.toISOString(),
      endTime: completeEvent!.endTime.toISOString(),
      date: completeEvent!.startTime.toISOString().split('T')[0], // Extract date for frontend
      icon: completeEvent!.icon || 'Calendar',
      isRecurring: completeEvent!.isRecurring,
      isAllDay: completeEvent!.isAllDay,
      allowPlayerCreation: completeEvent!.allowPlayerCreation,
      allowPlayerReschedule: completeEvent!.allowPlayerReschedule,
      participants: completeEvent!.event_participants.map(p => ({
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
      })),
      media: completeEvent!.event_media || []
    }

    // Create notifications for player participants only
    try {
      if (selectedPlayers && selectedPlayers.length > 0) {
        // Get player user IDs for participants
        const playerUsers = await prisma.users.findMany({
          where: {
            role: 'PLAYER',
            players: {
              id: {
                in: selectedPlayers
              }
            },
            isActive: true
          },
          select: { id: true }
        })
        
        const playerUserIds = playerUsers.map(u => u.id)
        
        if (playerUserIds.length > 0) {
          await NotificationService.createNotification({
            title: 'New Event Created',
            message: `"${title}" has been scheduled`,
            type: 'INFO',
            category: 'EVENT',
            userIds: playerUserIds,
            relatedId: event.id,
            relatedType: 'event'
          })
          console.log(`✅ Sent ${playerUserIds.length} event notifications to players`)
        }
      }
    } catch (notificationError) {
      console.error('❌ Error creating event notifications:', notificationError)
      // Don't fail event creation if notification fails
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
