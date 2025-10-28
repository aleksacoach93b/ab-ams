import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const playerId = params.id

    // Get real chat rooms where this player is a participant
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        isActive: true,
        participants: {
          some: {
            userId: playerId,
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
        isOnline: false // Real online status would need to be implemented
      })),
      lastMessage: room.messages[0] ? {
        id: room.messages[0].id,
        content: room.messages[0].content,
        senderId: room.messages[0].sender.id,
        senderName: room.messages[0].sender.name || room.messages[0].sender.email,
        senderRole: room.messages[0].sender.role,
        timestamp: room.messages[0].createdAt.toISOString(),
        type: room.messages[0].messageType,
        status: 'delivered'
      } : undefined,
      unreadCount: 0 // Real unread count would need to be implemented
    }))

    return NextResponse.json(transformedRooms)
  } catch (error) {
    console.error('Error fetching player chat rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
