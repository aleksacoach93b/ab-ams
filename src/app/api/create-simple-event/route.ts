import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    console.log('📅 Creating simple event with data:', {
      title,
      type,
      date,
      startTime,
      endTime,
      location
    })

    // Create simple event without participants
    // Parse date and time into DateTime objects
    const eventDate = new Date(date)
    const [startHours, startMinutes] = (startTime || '00:00').split(':').map(Number)
    const [endHours, endMinutes] = (endTime || '23:59').split(':').map(Number)
    
    const startDateTime = new Date(eventDate)
    startDateTime.setHours(startHours, startMinutes, 0, 0)
    
    const endDateTime = new Date(eventDate)
    endDateTime.setHours(endHours, endMinutes, 0, 0)
    
    const event = await prisma.events.create({
      data: {
        title,
        description: description || '',
        type: type || 'TRAINING',
        startTime: startDateTime,
        endTime: endDateTime,
        icon: type || 'Calendar',
        updatedAt: new Date(),
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
