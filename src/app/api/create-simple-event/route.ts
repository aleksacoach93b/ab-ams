import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple event creation request received')
    
    // Ensure database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
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
    const event = await prisma.events.create({
      data: {
        title,
        description: description || '',
        type: type || 'TRAINING',
        date: new Date(date),
        startTime: startTime || '00:00',
        endTime: endTime || '23:59',
        location: location || null,
        iconName: type || 'Calendar',
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
  } finally {
    await prisma.$disconnect()
  }
}
