import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function POST(
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
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: 'User IDs are required' },
        { status: 400 }
      )
    }

    // Local dev mode: add participants to localDevStore
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
          { message: 'Only admins can add members to chat room' },
          { status: 403 }
        )
      }

      // Get all users (players and staff) from state
      const allPlayers = state.players || []
      const allStaff = state.staff || []
      const allPlayerUsers = state.playerUsers || []
      
      // Find users to add
      const usersToAdd = userIds.map((userId: string) => {
        // Check players
        const player = allPlayers.find((p: any) => p.id === userId)
        if (player) {
          return {
            id: player.id,
            name: player.name,
            email: player.email || '',
            role: 'PLAYER'
          }
        }
        
        // Check player users
        const playerUser = allPlayerUsers.find((pu: any) => pu.id === userId)
        if (playerUser) {
          return {
            id: playerUser.id,
            name: playerUser.name || playerUser.email || 'Player',
            email: playerUser.email || '',
            role: 'PLAYER'
          }
        }
        
        // Check staff
        const staff = allStaff.find((s: any) => s.userId === userId || s.id === userId)
        if (staff) {
          return {
            id: staff.userId || staff.id,
            name: staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Staff',
            email: staff.email || '',
            role: 'STAFF'
          }
        }
        
        return null
      }).filter(Boolean)

      // Add new participants to chat room
      const newParticipants = usersToAdd.map((userToAdd: any) => {
        // Check if already a participant
        const existingParticipant = chatRoom.participants?.find((p: any) => 
          (p.userId === userToAdd.id || p.id === userToAdd.id)
        )

        if (existingParticipant) {
          // Reactivate if they left
          if (existingParticipant.isActive === false) {
            existingParticipant.isActive = true
            existingParticipant.leftAt = null
          }
          return existingParticipant
        }

        // Create new participant
        const newParticipant = {
          id: `participant-${Date.now()}-${Math.random()}`,
          userId: userToAdd.id,
          role: 'member',
          isActive: true,
          avatar: userToAdd.avatar
        }

        if (!chatRoom.participants) {
          chatRoom.participants = []
        }
        chatRoom.participants.push(newParticipant)

        return {
          ...newParticipant,
          name: userToAdd.name,
          email: userToAdd.email,
          role: userToAdd.role,
          isOnline: Math.random() > 0.5
        }
      })

      chatRoom.updatedAt = new Date().toISOString()
      await writeState(state)

      console.log('✅ Added participants to chat room in local storage:', newParticipants.length)

      // Transform participants for response
      const transformedParticipants = newParticipants.map((p: any) => ({
        id: p.userId || p.id,
        name: p.name || 'Unknown',
        role: p.role || 'PLAYER',
        isOnline: p.isOnline || false
      }))

      return NextResponse.json(transformedParticipants)
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
        { message: 'Only admins can add members to chat room' },
        { status: 403 }
      )
    }

    // Map participantIds to user IDs
    // userIds can be player.id or staff.id, but we need users.id for chat_room_participants
    const mappedUserIds: string[] = []
    
    for (const participantId of userIds) {
      // Try to find as player first
      const player = await prisma.players.findUnique({
        where: { id: participantId },
        select: { userId: true }
      })
      
      if (player) {
        mappedUserIds.push(player.userId)
        continue
      }
      
      // Try to find as staff
      const staff = await prisma.staff.findUnique({
        where: { id: participantId },
        select: { userId: true }
      })
      
      if (staff) {
        mappedUserIds.push(staff.userId)
        continue
      }
      
      // If not found as player or staff, assume it's already a user ID
      // But verify it exists in users table
      const userExists = await prisma.users.findUnique({
        where: { id: participantId },
        select: { id: true, isActive: true }
      })
      
      if (userExists && userExists.isActive) {
        mappedUserIds.push(participantId)
      } else {
        console.warn(`⚠️ Participant ID ${participantId} not found as player, staff, or active user`)
      }
    }

    if (mappedUserIds.length === 0) {
      return NextResponse.json(
        { message: 'No valid participants to add' },
        { status: 400 }
      )
    }

    // Add participants to the room
    const newParticipants = await Promise.all(
      mappedUserIds.map(async (userId: string) => {
        // Check if user is already a participant
        const existingParticipant = await prisma.chat_room_participants.findFirst({
          where: {
            roomId,
            userId
          }
        })

        if (existingParticipant) {
          // Reactivate if they left
          if (!existingParticipant.isActive) {
            return await prisma.chat_room_participants.update({
              where: { id: existingParticipant.id },
              data: {
                isActive: true,
                leftAt: null
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
            })
          }
          // Return existing participant with user data
          return await prisma.chat_room_participants.findUnique({
            where: { id: existingParticipant.id },
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
          })
        }

        // Generate unique ID for participant
        const participantId = `chat_participant_${roomId}_${userId}_${Date.now()}`

        // Create new participant
        return await prisma.chat_room_participants.create({
          data: {
            id: participantId,
            roomId,
            userId,
            role: 'member'
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
        })
      })
    )

    // Transform the data
    const transformedParticipants = newParticipants.map(p => {
      // Handle case where participant might be existing (not created)
      if (p.users) {
        const user = p.users
        return {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          role: user.role,
          isOnline: Math.random() > 0.5 // TODO: Implement real online status
        }
      } else {
        // Existing participant case
        return {
          id: p.userId,
          name: 'Existing User',
          role: 'PLAYER',
          isOnline: Math.random() > 0.5
        }
      }
    })

    return NextResponse.json(transformedParticipants)
  } catch (error) {
    console.error('Error adding participants to chat room:', error)
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

    const { roomId } = await context.params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Local dev mode: remove participant from localDevStore
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

      // Check if user is participant
      const isParticipant = chatRoom.participants?.some((p: any) => 
        (p.userId === user.userId || p.id === user.userId) && p.isActive !== false
      )

      if (!isParticipant) {
        return NextResponse.json(
          { message: 'Access denied to this chat room' },
          { status: 403 }
        )
      }

      // Prevent players from leaving chat rooms
      if (user.role === 'PLAYER' && userId === user.userId) {
        return NextResponse.json(
          { message: 'Players cannot leave chat rooms they were added to by admin' },
          { status: 403 }
        )
      }

      // Check if user is admin or removing themselves
      const userParticipant = chatRoom.participants?.find((p: any) => 
        (p.userId === user.userId || p.id === user.userId) && p.isActive !== false
      )

      if (userParticipant?.role !== 'admin' && userId !== user.userId) {
        return NextResponse.json(
          { message: 'Only admins can remove other members' },
          { status: 403 }
        )
      }

      // Remove participant
      if (chatRoom.participants) {
        chatRoom.participants = chatRoom.participants.map((p: any) => {
          if ((p.userId === userId || p.id === userId)) {
            return {
              ...p,
              isActive: false,
              leftAt: new Date().toISOString()
            }
          }
          return p
        })
      }

      chatRoom.updatedAt = new Date().toISOString()
      await writeState(state)

      console.log('✅ Removed participant from chat room in local storage')

      return NextResponse.json({ message: 'Participant removed successfully' })
    }

    // Map userId to actual user ID if it's a player or staff ID
    let actualUserId = userId
    
    // Try to find as player first
    const player = await prisma.players.findUnique({
      where: { id: userId },
      select: { userId: true }
    })
    
    if (player) {
      actualUserId = player.userId
    } else {
      // Try to find as staff
      const staff = await prisma.staff.findUnique({
        where: { id: userId },
        select: { userId: true }
      })
      
      if (staff) {
        actualUserId = staff.userId
      }
      // If not found, assume it's already a user ID
    }

    // Check if user is admin of this room or removing themselves
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

    // Prevent players from leaving chat rooms
    if (user.role === 'PLAYER' && actualUserId === user.userId) {
      return NextResponse.json(
        { message: 'Players cannot leave chat rooms they were added to by admin' },
        { status: 403 }
      )
    }

    // Allow removal if user is admin or removing themselves (but not if player)
    if (participant.role !== 'admin' && actualUserId !== user.userId) {
      return NextResponse.json(
        { message: 'Only admins can remove other members' },
        { status: 403 }
      )
    }

    // Remove participant
    await prisma.chat_room_participants.updateMany({
      where: {
        roomId,
        userId: actualUserId
      },
      data: {
        isActive: false,
        leftAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Participant removed successfully' })
  } catch (error) {
    console.error('Error removing participant from chat room:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
