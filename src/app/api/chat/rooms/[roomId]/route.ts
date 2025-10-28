import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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

    const { roomId } = params

    // Check if user is admin of this room
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Only admins can delete chat rooms
    if (participant.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only admins can delete chat rooms' },
        { status: 403 }
      )
    }

    console.log('🗑️ Deleting chat room:', roomId)

    // Delete all related data in the correct order
    // 1. Delete read receipts
    await prisma.chatMessageReadReceipt.deleteMany({
      where: {
        message: {
          roomId
        }
      }
    })

    // 2. Delete messages
    await prisma.chatMessage.deleteMany({
      where: {
        roomId
      }
    })

    // 3. Delete participants
    await prisma.chatRoomParticipant.deleteMany({
      where: {
        roomId
      }
    })

    // 4. Delete the chat room
    await prisma.chatRoom.delete({
      where: {
        id: roomId
      }
    })

    console.log('✅ Chat room deleted successfully:', roomId)

    return NextResponse.json({ 
      message: 'Chat room deleted successfully',
      roomId 
    })

  } catch (error) {
    console.error('❌ Error deleting chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
