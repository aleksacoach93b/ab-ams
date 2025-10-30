import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Notifications fetch request received')
    
    // Ensure database connection with retry
    let retries = 3
    while (retries > 0) {
      try {
        await prisma.$connect()
        console.log('✅ Database connected for notifications fetch')
        break
      } catch (error) {
        retries--
        console.log(`❌ Database connection failed, retries left: ${retries}`)
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where = {
      userId: user.userId,
      ...(unreadOnly && { isRead: false })
    }

    const notifications = await prisma.notifications.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const unreadCount = await prisma.notifications.count({
      where: {
        userId: user.userId,
        isRead: false
      }
    })

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Notification creation request received')
    
    // Ensure database connection with retry
    let retries = 3
    while (retries > 0) {
      try {
        await prisma.$connect()
        console.log('✅ Database connected for notification creation')
        break
      } catch (error) {
        retries--
        console.log(`❌ Database connection failed, retries left: ${retries}`)
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Only admins and coaches can create notifications
    if (!['ADMIN', 'COACH'].includes(user.role)) {
      return NextResponse.json(
        { message: 'You don\'t have permission to create notifications' },
        { status: 403 }
      )
    }

    const { 
      title, 
      message, 
      type = 'INFO', 
      priority = 'MEDIUM', 
      category = 'GENERAL',
      userIds, // Array of user IDs to send notification to
      relatedId,
      relatedType
    } = await request.json()

    if (!title || !message) {
      return NextResponse.json(
        { message: 'Title and message are required' },
        { status: 400 }
      )
    }

    // If userIds is provided, send to specific users, otherwise send to all users
    let targetUserIds: string[] = []
    
    if (userIds && userIds.length > 0) {
      targetUserIds = userIds
    } else {
      // Send to all active users
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      })
      targetUserIds = allUsers.map(u => u.id)
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      targetUserIds.map(userId =>
        prisma.notifications.create({
          data: {
            title,
            message,
            type,
            priority,
            category,
            userId,
            relatedId,
            relatedType
          }
        })
      )
    )

    return NextResponse.json({
      message: 'Notifications created successfully',
      notifications: notifications.length
    })
  } catch (error) {
    console.error('Error creating notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
