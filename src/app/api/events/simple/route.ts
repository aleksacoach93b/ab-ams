import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    } = body

    // Validate required fields
    if (!title || !date) {
      console.log('❌ Validation failed: missing title or date')
      return NextResponse.json(
        { message: 'Title and date are required' },
        { status: 400 }
      )
    }

    console.log('📅 Creating simple event...')
    
    // Create event without participants first
    const event = await prisma.event.create({
      data: {
        title,
        description,
        type: type.toUpperCase(),
        date: new Date(date),
        startTime,
        endTime,
        location,
        iconName: type || 'Calendar',
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
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
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
