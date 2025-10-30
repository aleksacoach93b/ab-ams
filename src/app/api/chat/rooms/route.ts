export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    console.log('🔍 Chat rooms API - User:', user)

    // Get chat rooms where user is a participant
    const chatRooms = await prisma.chat_rooms.findMany({
      where: {
        isActive: true,
        participants: {
          some: {
            userId: user.userId,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: {
            isActive: true
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
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform the data to match the frontend format
    const transformedRooms = chatRooms.map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      participants: room.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.email,
        role: p.user.role,
        isOnline: Math.random() > 0.5 // TODO: Implement real online status
      })),
      lastMessage: room.messages[0] ? {
        id: room.messages[0].id,
        content: room.messages[0].content,
        senderId: room.messages[0].sender.id,
        senderName: room.messages[0].sender.name || room.messages[0].sender.email,
        senderRole: room.messages[0].sender.role,
        timestamp: room.messages[0].createdAt.toISOString(),
        type: room.messages[0].messageType,
        status: 'delivered' // TODO: Implement real message status
      } : undefined,
      unreadCount: 0 // TODO: Implement unread count
    }))

    return NextResponse.json(transformedRooms)
  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can create chat rooms' },
        { status: 403 }
      )
    }

    const { name, type = 'group', participantIds = [] } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { message: 'Chat room name is required' },
        { status: 400 }
      )
    }

    // Create chat room
    const chatRoom = await prisma.chat_rooms.create({
      data: {
        name: name.trim(),
        type,
        createdBy: user.userId,
        participants: {
          create: [
            // Add creator as admin
            {
              userId: user.userId,
              role: 'admin'
            },
            // Add other participants
            ...participantIds.map((participantId: string) => ({
              userId: participantId,
              role: 'member'
            }))
          ]
        }
      },
      include: {
        participants: {
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
        }
      }
    })

    // Transform the data
    const transformedRoom = {
      id: chatRoom.id,
      name: chatRoom.name,
      type: chatRoom.type,
      participants: chatRoom.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.email,
        role: p.user.role,
        isOnline: Math.random() > 0.5 // TODO: Implement real online status
      })),
      lastMessage: undefined,
      unreadCount: 0
    }

    return NextResponse.json(transformedRoom, { status: 201 })
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
