import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
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

    const result = await prisma.notifications.updateMany({
      where: {
        userId: user.userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'All notifications marked as read',
      updatedCount: result.count
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
