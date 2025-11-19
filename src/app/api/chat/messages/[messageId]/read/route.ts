import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    const { messageId } = params

    // Check if user has access to this message (is participant in the room)
    const message = await prisma.chat_messages.findFirst({
      where: {
        id: messageId,
        deletedAt: null
      },
      include: {
        chat_rooms: {
          include: {
            chat_room_participants: {
              where: {
                userId: user.userId,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.chat_rooms.chat_room_participants.length === 0) {
      return NextResponse.json(
        { message: 'Access denied to this message' },
        { status: 403 }
      )
    }

    // Don't mark own messages as read
    if (message.senderId === user.userId) {
      return NextResponse.json(
        { message: 'Cannot mark own message as read' },
        { status: 400 }
      )
    }

    // Read receipts are not implemented in the current schema
    // Just return success for now
    return NextResponse.json({
      messageId: message.id,
      userId: user.userId,
      readAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
