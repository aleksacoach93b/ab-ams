import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
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

    // Only system admins can delete chat rooms
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can delete chat rooms' },
        { status: 403 }
      )
    }

    const { roomId } = await context.params

    // Local dev mode: delete from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const chatRooms = state.chatRooms || []
      
      const roomIndex = chatRooms.findIndex((room: any) => room.id === roomId)
      
      if (roomIndex === -1) {
        return NextResponse.json(
          { message: 'Chat room not found' },
          { status: 404 }
        )
      }

      // Remove chat room from state
      chatRooms.splice(roomIndex, 1)
      state.chatRooms = chatRooms
      
      await writeState(state)

      console.log('✅ Chat room deleted successfully from local storage:', roomId)

      return NextResponse.json({ 
        message: 'Chat room deleted successfully',
        roomId 
      })
    }

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
    await prisma.chat_rooms.delete({
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
