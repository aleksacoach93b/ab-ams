import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple event creation request received')
    
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
      icon,
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    // Generate unique ID for event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Use a more reliable validation method
    const upperType = type?.toUpperCase()
    const finalEventType = (upperType && EventType[upperType as keyof typeof EventType])
      ? upperType as EventType
      : 'TRAINING'

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

    // Combine date with startTime and endTime to create DateTime objects
    const startDateTime = new Date(`${date}T${startTime || '00:00'}:00`)
    const endDateTime = new Date(`${date}T${endTime || '23:59'}:00`)

    console.log('📅 Creating simple event...')
    
    // Create event without participants first
    const event = await prisma.events.create({
      data: {
        id: eventId,
        title,
        description: description || null,
        type: finalEventType,
        startTime: startDateTime, // DateTime object
        endTime: endDateTime, // DateTime object
        locationId: location || null, // Use locationId instead of location
        icon: icon || getDefaultIcon(finalEventType), // Use icon instead of iconName
      }
    })

    console.log('✅ Simple event created successfully:', event.id)
    
    return NextResponse.json({
      message: 'Event created successfully',
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        date: event.startTime.toISOString().split('T')[0], // Extract date for frontend
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.locationId,
        icon: event.icon || 'Calendar',
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error creating simple event:', error)
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
