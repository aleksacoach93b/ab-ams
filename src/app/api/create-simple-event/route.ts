import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple event creation request received')
    
    // Prisma handles connection pooling automatically
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      location,
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

    console.log('📅 Creating simple event with data:', {
      title,
      type: finalEventType,
      date,
      startTime,
      endTime,
      location
    })

    // Combine date with startTime and endTime to create DateTime objects
    const startDateTime = new Date(`${date}T${startTime || '00:00'}:00`)
    const endDateTime = new Date(`${date}T${endTime || '23:59'}:00`)
    
    const event = await prisma.events.create({
      data: {
        id: eventId,
        title,
        description: description || null,
        type: finalEventType,
        startTime: startDateTime,
        endTime: endDateTime,
        locationId: location || null,
        icon: icon || getDefaultIcon(finalEventType),
      }
    })

    console.log('✅ Simple event created successfully:', event.id)
    return NextResponse.json(
      { message: 'Simple event created successfully', event },
      { status: 201 }
    )
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
