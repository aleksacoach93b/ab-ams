import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
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

    // Get the message to check ownership and room access
    const message = await prisma.chatMessage.findUnique({
      where: {
        id: messageId
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

    // Check if user is participant in the chat room
    if (message.room.participants.length === 0) {
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Check if user is the sender of the message or admin of the room
    const participant = message.room.participants[0]
    const isMessageSender = message.senderId === user.userId
    const isRoomAdmin = participant.role === 'admin'

    if (!isMessageSender && !isRoomAdmin) {
      return NextResponse.json(
        { message: 'You can only delete your own messages or be an admin to delete any message' },
        { status: 403 }
      )
    }

    console.log('🗑️ Deleting message:', messageId, 'by user:', user.userId)

    // Soft delete the message (set deletedAt timestamp)
    await prisma.chatMessage.update({
      where: {
        id: messageId
      },
      data: {
        deletedAt: new Date()
      }
    })

    console.log('✅ Message deleted successfully:', messageId)

    return NextResponse.json({ 
      message: 'Message deleted successfully',
      messageId 
    })

  } catch (error) {
    console.error('❌ Error deleting message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
