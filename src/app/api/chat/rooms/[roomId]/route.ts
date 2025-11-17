import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function PUT(
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

    const { roomId } = await context.params
    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Chat room name is required' },
        { status: 400 }
      )
    }

    // Local dev mode: update in localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const chatRooms = state.chatRooms || []
      const chatRoom = chatRooms.find((room: any) => room.id === roomId)
      
      if (!chatRoom) {
        return NextResponse.json(
          { message: 'Chat room not found' },
          { status: 404 }
        )
      }

      // Check if user is admin of this room
      const isAdmin = chatRoom.participants?.some((p: any) => 
        (p.userId === user.userId || p.id === user.userId) && p.role === 'admin' && p.isActive !== false
      )

      if (!isAdmin) {
        return NextResponse.json(
          { message: 'Only admins can edit chat rooms' },
          { status: 403 }
        )
      }

      chatRoom.name = name.trim()
      if (description !== undefined) {
        chatRoom.description = description?.trim() || null
      }
      chatRoom.updatedAt = new Date().toISOString()
      await writeState(state)

      console.log('✅ Chat room updated successfully in local storage:', roomId)

      return NextResponse.json({
        id: chatRoom.id,
        name: chatRoom.name,
        description: chatRoom.description,
        message: 'Chat room updated successfully'
      })
    }

    // Check if user is admin of this room
    const participant = await prisma.chat_room_participants.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true,
        role: 'admin'
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: 'Only admins can edit chat rooms' },
        { status: 403 }
      )
    }

    // Update chat room
    const updatedRoom = await prisma.chat_rooms.update({
      where: { id: roomId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date()
      },
      include: {
        chat_room_participants: {
          where: {
            isActive: true
          },
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    console.log('✅ Chat room updated successfully:', roomId)

    return NextResponse.json({
      id: updatedRoom.id,
      name: updatedRoom.name,
      description: updatedRoom.description,
      message: 'Chat room updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating chat room:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

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
    const participant = await prisma.chat_room_participants.findFirst({
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
    // 1. Delete messages (cascade will handle participants)
    await prisma.chat_messages.deleteMany({
      where: {
        roomId
      }
    })

    // 2. Delete participants
    await prisma.chat_room_participants.deleteMany({
      where: {
        roomId
      }
    })

    // 3. Delete the chat room
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
