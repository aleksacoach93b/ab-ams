export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Notifications fetch request received')
    if (LOCAL_DEV_MODE) {
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

      const state = await readState()
      
      // Filter notifications for this user - simple match by userId
      
      const userNotifications = (state.notifications || []).filter((notif: any) => {
        // Simple match: notification.userId === user.userId
        return String(notif.userId) === String(user.userId)
      }).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      const chatNotificationsForUser = userNotifications.filter((n: any) => n.category === 'CHAT')
      console.log(`🔍 [NOTIFICATIONS GET] Found ${userNotifications.length} total notifications (${chatNotificationsForUser.length} chat) for user ${user.userId}`)
      
      const unreadCount = userNotifications.filter((notif: any) => !notif.isRead).length
      
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const unreadOnly = searchParams.get('unreadOnly') === 'true'
      
      let filteredNotifications = userNotifications
      if (unreadOnly) {
        filteredNotifications = filteredNotifications.filter((notif: any) => !notif.isRead)
      }
      
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit)
      
      return NextResponse.json({
        notifications: paginatedNotifications,
        unreadCount,
        total: filteredNotifications.length
      })
    }
    
    // Prisma handles connection pooling automatically
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

    // Ensure userId is a string
    const userId = String(user.userId || user.id || '')
    
    const where: any = {
      userId: userId,
    }
    
    if (unreadOnly) {
      where.isRead = false
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
        userId: userId,
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
    if (LOCAL_DEV_MODE) {
      return NextResponse.json({ message: 'Notification created (local mode)', notifications: 0 })
    }
    
    // Prisma handles connection pooling automatically
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
