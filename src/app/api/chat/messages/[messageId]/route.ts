import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await context.params

    // Local dev mode: delete from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const chatRooms = state.chatRooms || []
      
      // Find the message in any chat room
      let messageFound = false
      for (const chatRoom of chatRooms) {
        const messageIndex = (chatRoom.messages || []).findIndex((msg: any) => msg.id === messageId)
        
        if (messageIndex !== -1) {
          const message = chatRoom.messages[messageIndex]
          
          // Check if user is participant
          const isParticipant = chatRoom.participants?.some((p: any) => 
            p.userId === user.userId && p.isActive !== false
          )
          
          if (!isParticipant) {
            return NextResponse.json(
              { message: 'Access denied to this chat room' },
              { status: 403 }
            )
          }
          
          // Prevent players from deleting messages
          if (user.role === 'PLAYER') {
            return NextResponse.json(
              { message: 'Players cannot delete messages' },
              { status: 403 }
            )
          }
          
          // Check if user is the sender or admin
          const isMessageSender = message.senderId === user.userId
          const isSystemAdmin = user.role === 'ADMIN'
          
          if (!isMessageSender && !isSystemAdmin) {
            return NextResponse.json(
              { message: 'You can only delete your own messages or be an admin to delete any message' },
              { status: 403 }
            )
          }
          
          // Soft delete the message (set deletedAt)
          chatRoom.messages[messageIndex] = {
            ...message,
            deletedAt: new Date().toISOString()
          }
          
          // Update chat room's last message if needed
          if (chatRoom.lastMessage?.id === messageId) {
            const remainingMessages = (chatRoom.messages || []).filter((m: any) => !m.deletedAt)
            chatRoom.lastMessage = remainingMessages.length > 0 
              ? remainingMessages[remainingMessages.length - 1]
              : null
          }
          
          chatRoom.updatedAt = new Date().toISOString()
          messageFound = true
          break
        }
      }
      
      if (!messageFound) {
        return NextResponse.json(
          { message: 'Message not found' },
          { status: 404 }
        )
      }
      
      await writeState(state)
      
      console.log('✅ Message deleted successfully from local storage:', messageId)
      
      return NextResponse.json({ 
        message: 'Message deleted successfully',
        messageId 
      })
    }

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

    // Prevent players from deleting messages
    if (user.role === 'PLAYER') {
      return NextResponse.json(
        { message: 'Players cannot delete messages' },
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
