import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    // Check authentication - try both header and cookies
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('token')?.value
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

    const { roomId } = await context.params

    // Check if user is participant in this room
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true
      }
    })

    if (!participant) {
      console.error('❌ Messages GET forbidden: user is not a participant', { roomId, userId: user.userId })
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Get messages for the room
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        deletedAt: null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Transform the data
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      senderName: message.sender.name || message.sender.email,
      senderRole: message.sender.role,
      timestamp: message.createdAt.toISOString(),
      type: message.messageType,
      status: 'delivered', // TODO: Implement real message status
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      editedAt: message.editedAt?.toISOString(),
      readBy: message.readReceipts.map(receipt => ({
        userId: receipt.user.id,
        userName: receipt.user.name || receipt.user.email,
        readAt: receipt.readAt.toISOString()
      }))
    }))

    return NextResponse.json(transformedMessages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    // Check authentication - try both header and cookies
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('token')?.value
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

    const { roomId } = await context.params
    const { content, messageType = 'text', fileUrl, fileName, fileType, fileSize } = await request.json()

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      )
    }

    // Check if user is participant in this room
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true
      }
    })

    if (!participant) {
      console.error('❌ Messages POST forbidden: user is not a participant', { roomId, userId: user.userId })
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: user.userId,
        content: content.trim(),
        messageType,
        fileUrl,
        fileName,
        fileType,
        fileSize
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Update room's updatedAt timestamp
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    })

    // Transform the data
    const transformedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      senderName: message.sender.name || message.sender.email,
      senderRole: message.sender.role,
      timestamp: message.createdAt.toISOString(),
      type: message.messageType,
      status: 'delivered',
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      editedAt: message.editedAt?.toISOString(),
      readBy: []
    }

    // Create notification for new message (async, don't wait)
    try {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { name: true }
      })
      
      if (room) {
        const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content
        await NotificationService.notifyNewChatMessage(
          roomId,
          room.name,
          message.sender.name || message.sender.email,
          messagePreview,
          message.sender.id // Pass sender ID to exclude from notifications
        )
      }
    } catch (notificationError) {
      console.error('Error creating chat notification:', notificationError)
      // Don't fail the message send if notification fails
    }

    return NextResponse.json(transformedMessage, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
