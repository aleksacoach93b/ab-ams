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

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    const { messageId } = params

    // Check if user has access to this message (is participant in the room)
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        deletedAt: null
      },
      include: {
        room: {
          include: {
            participants: {
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

    if (message.room.participants.length === 0) {
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

    // Create or update read receipt
    const readReceipt = await prisma.chatMessageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        messageId,
        userId: user.userId,
        readAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      messageId: readReceipt.messageId,
      userId: readReceipt.user.id,
      userName: readReceipt.user.name || readReceipt.user.email,
      readAt: readReceipt.readAt.toISOString()
    })
  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
