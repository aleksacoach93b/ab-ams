import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: playerId } = await context.params
    
    // Local dev mode: get chat rooms from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      console.log('🔍 [LOCAL_DEV] Loading chat rooms for player:', playerId)
      console.log('🔍 [LOCAL_DEV] All chat rooms in state:', (state.chatRooms || []).length)
      
      // Get player user ID if player has associated user account
      const playerUser = state.playerUsers.find((u: any) => u.playerId === playerId)
      const playerUserId = playerUser?.id || playerId // Use player user ID if exists, otherwise use player ID
      
      console.log(`🔍 [LOCAL_DEV] Player ID: ${playerId}, Player User ID: ${playerUserId}`)
      console.log(`🔍 [LOCAL_DEV] All players in state:`, (state.players || []).map((p: any) => ({ id: p.id, name: p.name })))
      console.log(`🔍 [LOCAL_DEV] All player users:`, (state.playerUsers || []).map((u: any) => ({ id: u.id, playerId: u.playerId, email: u.email })))
      
      const chatRooms = (state.chatRooms || []).filter((room: any) => {
        // Only return rooms where player is a participant
        const participants = room.participants || []
        console.log(`🔍 Checking room "${room.name}" with ${participants.length} participants`)
        
        const isParticipant = participants.some((p: any) => {
          // Check multiple possible ID matches:
          // 1. userId matches playerId (direct player ID match)
          // 2. userId matches playerUserId (player user account ID match)
          // 3. user.id matches playerId
          // 4. user.id matches playerUserId
          // 5. id matches playerId (participant ID match - unlikely but check anyway)
          const userIdMatchPlayer = p.userId === playerId
          const userIdMatchUser = p.userId === playerUserId
          const userMatchPlayer = p.user?.id === playerId
          const userMatchUser = p.user?.id === playerUserId
          const idMatch = p.id === playerId
          
          const matches = (userIdMatchPlayer || userIdMatchUser || userMatchPlayer || userMatchUser || idMatch) && p.isActive !== false
          
          if (matches) {
            console.log(`✅ Player ${playerId} (user ${playerUserId}) IS participant in room "${room.name}"`, {
              participantUserId: p.userId,
              participantUser: p.user?.id,
              participantId: p.id,
              playerId: playerId,
              playerUserId: playerUserId,
              isActive: p.isActive
            })
          }
          
          return matches
        })
        
        if (!isParticipant) {
          console.log(`❌ Player ${playerId} (user ${playerUserId}) is NOT participant in room "${room.name}"`)
          console.log(`   Participants in room:`, participants.map((p: any) => ({
            userId: p.userId,
            user: p.user?.id,
            id: p.id,
            name: p.user?.name || p.name
          })))
        }
        
        return isParticipant
      })
      
      console.log(`📋 [LOCAL_DEV] Found ${chatRooms.length} chat rooms for player ${playerId}`)
      
      // Transform to match frontend format
      const transformedRooms = chatRooms.map((room: any) => {
        // Get last message from room.lastMessage or from messages array
        let lastMessage = room.lastMessage
        if (!lastMessage && room.messages && room.messages.length > 0) {
          // Get the most recent non-deleted message
          const nonDeletedMessages = room.messages.filter((msg: any) => !msg.deletedAt)
          if (nonDeletedMessages.length > 0) {
            lastMessage = nonDeletedMessages[nonDeletedMessages.length - 1]
          }
        }
        
        return {
          id: room.id,
          name: room.name,
          type: room.type || 'group',
          participants: (room.participants || []).filter((p: any) => p.isActive !== false).map((p: any) => ({
            id: p.userId || p.user?.id || p.id,
            name: p.user?.name || p.name || 'Unknown',
            role: p.user?.role || 'PLAYER',
            isOnline: false
          })),
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId || lastMessage.sender?.id,
            senderName: lastMessage.senderName || lastMessage.sender?.name || 'Unknown',
            senderRole: lastMessage.senderRole || lastMessage.sender?.role || 'PLAYER',
            timestamp: lastMessage.timestamp || lastMessage.createdAt || new Date().toISOString(),
            type: lastMessage.type || lastMessage.messageType || 'text',
            status: 'delivered'
          } : undefined,
          unreadCount: 0
        }
      })
      
      console.log(`✅ [LOCAL_DEV] Returning ${transformedRooms.length} transformed chat rooms`)
      
      return NextResponse.json(transformedRooms)
    }

    // Get real chat rooms where this player is a participant
    const chatRooms = await prisma.chat_rooms.findMany({
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
