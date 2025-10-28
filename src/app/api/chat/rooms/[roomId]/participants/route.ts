import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
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
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: 'User IDs are required' },
        { status: 400 }
      )
    }

    // Check if user is admin of this room
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true,
        role: 'admin'
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: 'Only admins can add members to chat room' },
        { status: 403 }
      )
    }

    // Add participants to the room
    const newParticipants = await Promise.all(
      userIds.map(async (userId: string) => {
        // Check if user exists and is active
        const targetUser = await prisma.user.findFirst({
          where: {
            id: userId,
            isActive: true
          }
        })

        if (!targetUser) {
          throw new Error(`User ${userId} not found or inactive`)
        }

        // Check if user is already a participant
        const existingParticipant = await prisma.chatRoomParticipant.findFirst({
          where: {
            roomId,
            userId
          }
        })

        if (existingParticipant) {
          // Reactivate if they left
          if (!existingParticipant.isActive) {
            return await prisma.chatRoomParticipant.update({
              where: { id: existingParticipant.id },
              data: {
                isActive: true,
                leftAt: null
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                  }
                }
              }
            })
          }
          return existingParticipant
        }

        // Create new participant
        return await prisma.chatRoomParticipant.create({
          data: {
            roomId,
            userId,
            role: 'member'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        })
      })
    )

    // Transform the data
    const transformedParticipants = newParticipants.map(p => ({
      id: p.user.id,
      name: p.user.name || p.user.email,
      role: p.user.role,
      isOnline: Math.random() > 0.5 // TODO: Implement real online status
    }))

    return NextResponse.json(transformedParticipants)
  } catch (error) {
    console.error('Error adding participants to chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user is admin of this room or removing themselves
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

    // Allow removal if user is admin or removing themselves
    if (participant.role !== 'admin' && userId !== user.userId) {
      return NextResponse.json(
        { message: 'Only admins can remove other members' },
        { status: 403 }
      )
    }

    // Remove participant
    await prisma.chatRoomParticipant.updateMany({
      where: {
        roomId,
        userId
      },
      data: {
        isActive: false,
        leftAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Participant removed successfully' })
  } catch (error) {
    console.error('Error removing participant from chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
