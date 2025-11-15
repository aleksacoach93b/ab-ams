export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    // Local dev mode: return chat rooms from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      console.log('🔍 Loading chat rooms for user:', user.userId, 'Role:', user.role)
      console.log('📦 Available chat rooms:', (state.chatRooms || []).length)
      
      console.log('📋 [GET CHAT ROOMS] All rooms in state:', (state.chatRooms || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        participantsCount: (r.participants || []).length,
        participants: (r.participants || []).map((p: any) => ({
          userId: p.userId,
          id: p.id,
          user: p.user?.id,
          name: p.user?.name || p.name
        }))
      })))
      
      // Get user's associated player/staff IDs for matching
      let userPlayerId: string | null = null
      let userStaffId: string | null = null
      
      // Check if user is a player
      const player = state.players.find((p: any) => p.id === user.userId)
      if (player) {
        userPlayerId = player.id
      } else {
        // Check if user has player user account
        const playerUser = state.playerUsers.find((u: any) => u.id === user.userId)
        if (playerUser) {
          userPlayerId = playerUser.playerId
        }
      }
      
      // Check if user is staff
      const staff = state.staff.find((s: any) => s.id === user.userId || s.user?.id === user.userId)
      if (staff) {
        userStaffId = staff.id
      }
      
      console.log(`🔍 [GET CHAT ROOMS] User ${user.userId} (role: ${user.role}) - Player ID: ${userPlayerId}, Staff ID: ${userStaffId}`)
      
      const chatRooms = (state.chatRooms || []).filter((room: any) => {
        // Only return rooms where user is a participant
        const participants = room.participants || []
        const isParticipant = participants.some((p: any) => {
          // Check multiple possible ID fields
          const userIdMatch = p.userId === user.userId
          const userMatch = p.user?.id === user.userId
          const idMatch = p.id === user.userId
          
          // Also check player/staff IDs if user is associated with player/staff
          const playerIdMatch = userPlayerId && (p.userId === userPlayerId || p.user?.id === userPlayerId)
          const staffIdMatch = userStaffId && (p.userId === userStaffId || p.user?.id === userStaffId)
          
          const matches = (userIdMatch || userMatch || idMatch || playerIdMatch || staffIdMatch) && p.isActive !== false
          
          if (matches) {
            console.log(`✅ User ${user.userId} IS participant in room "${room.name}"`, {
              participantUserId: p.userId,
              participantUser: p.user?.id,
              participantId: p.id,
              userPlayerId,
              userStaffId,
              isActive: p.isActive
            })
          }
          
          return matches
        })
        
        if (!isParticipant) {
          console.log(`❌ User ${user.userId} is NOT participant in room "${room.name}"`)
          console.log(`   Room participants:`, participants.map((p: any) => ({
            userId: p.userId,
            id: p.id,
            user: p.user?.id,
            name: p.user?.name || p.name,
            isActive: p.isActive
          })))
        }
        
        return isParticipant
      })
      
      console.log('📋 Filtered chat rooms:', chatRooms.length)

      // Transform to match frontend format
      const transformedRooms = chatRooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        type: room.type || 'group',
        participants: (room.participants || []).filter((p: any) => p.isActive !== false).map((p: any) => ({
          id: p.userId,
          name: p.user?.name || p.name || 'Unknown',
          role: p.user?.role || 'PLAYER',
          isOnline: Math.random() > 0.5 // TODO: Implement real online status
        })),
        lastMessage: room.lastMessage ? {
          id: room.lastMessage.id,
          content: room.lastMessage.content,
          senderId: room.lastMessage.senderId,
          senderName: room.lastMessage.senderName || 'Unknown',
          senderRole: room.lastMessage.senderRole || 'PLAYER',
          timestamp: room.lastMessage.timestamp || new Date().toISOString(),
          type: room.lastMessage.type || 'text',
          status: 'delivered'
        } : undefined,
        unreadCount: 0
      }))

      return NextResponse.json(transformedRooms)
    }

    // Get chat rooms where user is a participant (DB path)
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

    // Local dev mode: create chat room in localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Get users for participants - ensure consistent ID mapping
      // IMPORTANT: For players, the player.id is the userId used in chat participants
      // For staff, the staff.user?.id or staff.id is the userId used in chat participants
      const allUsers = [
        ...(state.players || []).map((p: any) => {
          // Player ID is used as userId in chat participants
          const userId = p.id
          return {
            id: p.id, 
            name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email, 
            email: p.email, 
            role: 'PLAYER',
            userId: userId, // CRITICAL: player.id == userId for chat participants
            originalPlayer: p // Keep reference to original player data
          }
        }),
        ...(state.staff || []).map((s: any) => {
          // Staff user ID is used as userId in chat participants
          const userId = s.user?.id || s.id
          return {
            id: userId, 
            name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email, 
            email: s.email || s.user?.email, 
            role: 'STAFF',
            userId: userId, // CRITICAL: staff.user?.id == userId for chat participants
            originalStaff: s // Keep reference to original staff data
          }
        })
      ]
      
      console.log('📋 [CREATE CHAT] Mapped users for chat:', allUsers.map((u: any) => ({
        id: u.id,
        userId: u.userId,
        name: u.name,
        role: u.role,
        playerId: u.originalPlayer?.id,
        staffId: u.originalStaff?.id,
        staffUserId: u.originalStaff?.user?.id
      })))
      
      console.log('👥 All available users for chat:', allUsers.map((u: any) => ({ id: u.id, userId: u.userId, name: u.name, role: u.role })))
      console.log('📝 Participant IDs from request:', participantIds)

      const newRoomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      // Create participants array - include creator and selected participants
      const participants = [
        {
          id: `part_${Date.now()}_creator`,
          userId: user.userId,
          role: 'admin',
          isActive: true,
          user: allUsers.find((u: any) => u.userId === user.userId) || {
            id: user.userId,
            name: user.name || 'Admin',
            email: user.email || '',
            role: 'ADMIN'
          }
        },
        ...participantIds.map((pid: string, index: number) => {
          // Try to find participant by ID (multiple possible fields)
          // IMPORTANT: participantIds from frontend are player/staff IDs, need to match them correctly
          const participantUser = allUsers.find((u: any) => {
            // Match by userId first (this is what we use for participants)
            if (u.userId === pid) return true
            // Match by id
            if (u.id === pid) return true
            // Match by originalPlayer.id (for players)
            if (u.originalPlayer && u.originalPlayer.id === pid) return true
            // Match by originalStaff.id or originalStaff.user?.id (for staff)
            if (u.originalStaff) {
              if (u.originalStaff.id === pid || u.originalStaff.user?.id === pid) return true
            }
            return false
          })
          
          console.log(`🔍 [CREATE CHAT] Looking for participant ${pid} in allUsers`)
          if (participantUser) {
            console.log(`✅ [CREATE CHAT] Found participant:`, { 
              id: participantUser.id, 
              userId: participantUser.userId, 
              name: participantUser.name,
              role: participantUser.role
            })
          } else {
            console.warn(`⚠️ [CREATE CHAT] Participant ${pid} NOT FOUND in allUsers!`)
            console.warn(`   Available user IDs:`, allUsers.map((u: any) => ({ 
              id: u.id, 
              userId: u.userId,
              originalPlayerId: u.originalPlayer?.id,
              originalStaffId: u.originalStaff?.id,
              originalStaffUserId: u.originalStaff?.user?.id
            })))
          }
          
          // CRITICAL: Use the participantUser.userId if found, which should match the player/staff ID
          const finalUserId = participantUser?.userId || participantUser?.id || pid
          
          console.log(`📌 [CREATE CHAT] Creating participant with userId: ${finalUserId} for participantId: ${pid}`)
          
          return {
            id: `part_${Date.now()}_${index}_${pid}`,
            userId: finalUserId, // This MUST match the player/staff ID that will be used for filtering
            role: 'member',
            isActive: true,
            user: participantUser ? {
              id: participantUser.userId || participantUser.id,
              name: participantUser.name,
              email: participantUser.email,
              role: participantUser.role
            } : {
              id: pid,
              name: 'Unknown',
              email: '',
              role: 'PLAYER'
            }
          }
        })
      ]
      
      console.log('✅ [CREATE CHAT] Final participants:', participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        name: p.user?.name,
        user: p.user
      })))

      const newRoom = {
        id: newRoomId,
        name: name.trim(),
        type: type || 'group',
        createdBy: user.userId,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        participants: participants,
        messages: [],
        lastMessage: undefined
      }

      // Add to state
      if (!state.chatRooms) {
        state.chatRooms = []
      }
      state.chatRooms.push(newRoom)
      await writeState(state)

      // Transform the data
      const transformedRoom = {
        id: newRoom.id,
        name: newRoom.name,
        type: newRoom.type,
        participants: newRoom.participants.map((p: any) => ({
          id: p.user?.id || p.userId,
          name: p.user?.name || 'Unknown',
          role: p.user?.role || 'PLAYER',
          isOnline: Math.random() > 0.5
        })),
        lastMessage: undefined,
        unreadCount: 0
      }

      return NextResponse.json(transformedRoom, { status: 201 })
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
