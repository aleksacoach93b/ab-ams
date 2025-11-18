import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
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

    const { roomId } = await context.params

    // Local dev mode: get messages from localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const chatRoom = (state.chatRooms || []).find((room: any) => room.id === roomId)
      
      if (!chatRoom) {
        return NextResponse.json(
          { message: 'Chat room not found' },
          { status: 404 }
        )
      }

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
      
      console.log(`🔍 [GET MESSAGES] User ${user.userId} (role: ${user.role}) - Player ID: ${userPlayerId}, Staff ID: ${userStaffId}`)

      // Check if user is participant - check multiple ID matches
      const isParticipant = chatRoom.participants?.some((p: any) => {
        // Check multiple possible ID fields
        const userIdMatch = p.userId === user.userId
        const userMatch = p.user?.id === user.userId
        const idMatch = p.id === user.userId
        
        // Also check player/staff IDs if user is associated with player/staff
        const playerIdMatch = userPlayerId && (p.userId === userPlayerId || p.user?.id === userPlayerId)
        const staffIdMatch = userStaffId && (p.userId === userStaffId || p.user?.id === userStaffId)
        
        const matches = (userIdMatch || userMatch || idMatch || playerIdMatch || staffIdMatch) && p.isActive !== false
        
        if (matches) {
          console.log(`✅ User ${user.userId} IS participant in room "${chatRoom.name}"`, {
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
        console.log(`❌ User ${user.userId} is NOT participant in room "${chatRoom.name}"`)
        console.log(`   Room participants:`, chatRoom.participants?.map((p: any) => ({
          userId: p.userId,
          id: p.id,
          user: p.user?.id,
          name: p.user?.name || p.name,
          isActive: p.isActive
        })))
        return NextResponse.json(
          { message: 'Access denied to this chat room' },
          { status: 403 }
        )
      }

      // Get messages for this room
      const messages = (chatRoom.messages || []).filter((msg: any) => !msg.deletedAt)

      // Transform messages
      const transformedMessages = messages.map((message: any) => ({
        id: message.id,
        content: message.content,
        senderId: message.senderId || message.sender?.id,
        senderName: message.senderName || message.sender?.name || 'Unknown',
        senderRole: message.senderRole || message.sender?.role || 'PLAYER',
        timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
        type: message.type || message.messageType || 'text',
        status: message.status || 'delivered',
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        fileSize: message.fileSize,
        editedAt: message.editedAt,
        readBy: message.readBy || []
      }))

      return NextResponse.json(transformedMessages)
    }

    // Check if user is participant in this room
    const participant = await prisma.chat_room_participants.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true
      }
    })

    if (!participant) {
      console.error('❌ Messages GET forbidden: user is not a participant', { roomId, userId: user.userId })
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Get messages for the room
    const messages = await prisma.chat_messages.findMany({
      where: {
        roomId,
        deletedAt: null
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Transform the data
    const transformedMessages = messages.map(message => {
      const sender = message.users
      return {
        id: message.id,
        content: message.content,
        senderId: sender.id,
        senderName: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'Unknown',
        senderRole: sender.role,
        timestamp: message.createdAt.toISOString(),
        type: message.messageType,
        status: 'delivered', // TODO: Implement real message status
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        fileSize: message.fileSize,
        editedAt: message.editedAt?.toISOString(),
        readBy: [] // TODO: Implement read receipts if needed
      }
    })

    return NextResponse.json(transformedMessages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
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

    const { roomId } = await context.params
    const { content, messageType = 'text', fileUrl, fileName, fileType, fileSize } = await request.json()

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      )
    }

    // Local dev mode: save message to localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const chatRoom = (state.chatRooms || []).find((room: any) => room.id === roomId)
      
      if (!chatRoom) {
        return NextResponse.json(
          { message: 'Chat room not found' },
          { status: 404 }
        )
      }

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

      // Check if user is participant - check multiple ID matches
      const isParticipant = chatRoom.participants?.some((p: any) => {
        // Check multiple possible ID fields
        const userIdMatch = p.userId === user.userId
        const userMatch = p.user?.id === user.userId
        const idMatch = p.id === user.userId
        
        // Also check player/staff IDs if user is associated with player/staff
        const playerIdMatch = userPlayerId && (p.userId === userPlayerId || p.user?.id === userPlayerId)
        const staffIdMatch = userStaffId && (p.userId === userStaffId || p.user?.id === userStaffId)
        
        return (userIdMatch || userMatch || idMatch || playerIdMatch || staffIdMatch) && p.isActive !== false
      })

      if (!isParticipant) {
        return NextResponse.json(
          { message: 'Access denied to this chat room' },
          { status: 403 }
        )
      }

      // Create new message
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId: roomId,
        senderId: user.userId,
        senderName: user.name || user.email || 'Unknown',
        senderRole: user.role || 'ADMIN',
        content: content.trim(),
        type: messageType || 'text',
        messageType: messageType || 'text',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        editedAt: null,
        deletedAt: null,
        readBy: []
      }

      // Add message to room
      if (!chatRoom.messages) {
        chatRoom.messages = []
      }
      chatRoom.messages.push(newMessage)
      chatRoom.updatedAt = new Date().toISOString()
      chatRoom.lastMessage = newMessage

      // Update state
      await writeState(state)

      // Send notifications to all participants except sender
      try {
        const { createNotification } = await import('@/lib/localDevStore')
        
        // Get participant user IDs (excluding sender)
        // CRITICAL: participant.userId in chat room can be either:
        // - player.id (for players)
        // - staff.user?.id or staff.id (for staff)
        // But notifications need playerUser.id for players!
        const participantUserIds: string[] = []
        
        for (const participant of chatRoom.participants) {
          // Skip sender and inactive participants
          if (participant.userId === user.userId || !participant.isActive) {
            continue
          }
          
          console.log(`🔍 Processing participant for notification:`, {
            participantUserId: participant.userId,
            participantId: participant.id,
            participantUser: participant.user?.id,
            senderUserId: user.userId
          })
          
          // Check if participant is a player (userId matches player ID)
          const player = state.players.find((p: any) => p.id === participant.userId)
          if (player) {
            console.log(`✅ Found player:`, { playerId: player.id, playerName: player.name })
            // Find player user account
            const playerUser = state.playerUsers.find((u: any) => u.playerId === player.id)
            if (playerUser) {
              console.log(`✅ Found playerUser for notification:`, { playerUserId: playerUser.id })
              participantUserIds.push(playerUser.id)
            } else {
              console.log(`⚠️ No playerUser found for player ${player.id}, using player.id as fallback`)
              // Also try to find by email match
              const playerUserByEmail = state.playerUsers.find((u: any) => 
                u.email === player.email || u.playerId === player.id
              )
              if (playerUserByEmail) {
                console.log(`✅ Found playerUser by email match:`, { playerUserId: playerUserByEmail.id })
                participantUserIds.push(playerUserByEmail.id)
              } else {
                participantUserIds.push(participant.userId)
              }
            }
            continue
          }
          
          // Check if participant is staff (userId matches staff user ID)
          const staff = state.staff.find((s: any) => 
            s.id === participant.userId || 
            s.user?.id === participant.userId
          )
          if (staff) {
            console.log(`✅ Found staff:`, { staffId: staff.id, staffName: staff.name })
            const staffUserId = staff.user?.id || staff.id
            console.log(`✅ Using staffUserId for notification:`, { staffUserId })
            participantUserIds.push(staffUserId)
            continue
          }
          
          // Fallback: use participant userId directly
          if (participant.userId) {
            console.log(`⚠️ Using participant.userId as fallback:`, { userId: participant.userId })
            participantUserIds.push(participant.userId)
          }
        }
        
        console.log(`📱 Final participantUserIds for notifications:`, participantUserIds)
        
        if (participantUserIds.length > 0) {
          const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content
          console.log(`📱 Creating notifications for ${participantUserIds.length} participants`)
          await createNotification({
            title: `New message in ${chatRoom.name}`,
            message: `${user.name || 'Someone'}: ${messagePreview}`,
            type: 'INFO',
            category: 'CHAT',
            userIds: participantUserIds,
            relatedId: roomId,
            relatedType: 'chat'
          })
          console.log(`✅ Chat notifications created successfully`)
        } else {
          console.log(`⚠️ No participantUserIds found, skipping notification creation`)
        }
      } catch (notificationError) {
        console.error('❌ Error creating chat notifications:', notificationError)
        // Don't fail message send if notification fails
      }

      // Transform message for response
      const transformedMessage = {
        id: newMessage.id,
        content: newMessage.content,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        senderRole: newMessage.senderRole,
        timestamp: newMessage.timestamp,
        type: newMessage.type,
        status: newMessage.status,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileType: newMessage.fileType,
        fileSize: newMessage.fileSize,
        editedAt: newMessage.editedAt,
        readBy: newMessage.readBy
      }

      return NextResponse.json(transformedMessage, { status: 201 })
    }

    // Check if user is participant in this room
    const participant = await prisma.chat_room_participants.findFirst({
      where: {
        roomId,
        userId: user.userId,
        isActive: true
      }
    })

    if (!participant) {
      console.error('❌ Messages POST forbidden: user is not a participant', { roomId, userId: user.userId })
      return NextResponse.json(
        { message: 'Access denied to this chat room' },
        { status: 403 }
      )
    }

    // Generate unique ID for message
    const messageId = `chat_msg_${roomId}_${user.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create message
    const message = await prisma.chat_messages.create({
      data: {
        id: messageId,
        roomId,
        senderId: user.userId,
        content: content.trim(),
        messageType: messageType || 'text',
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null
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

    // Update room's updatedAt timestamp
    await prisma.chat_rooms.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    })

    // Transform the data
    const sender = message.users
    const transformedMessage = {
      id: message.id,
      content: message.content,
      senderId: sender.id,
      senderName: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'Unknown',
      senderRole: sender.role,
      timestamp: message.createdAt.toISOString(),
      type: message.messageType,
      status: 'delivered',
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      editedAt: message.editedAt?.toISOString(),
      readBy: []
    }

    // Create notification for new message (don't wait, but don't use setTimeout to ensure it runs)
    // Execute immediately but don't block response
    Promise.resolve().then(async () => {
      try {
        const room = await prisma.chat_rooms.findUnique({
          where: { id: roomId },
          select: { name: true }
        })
        
        if (room) {
          const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content
          const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'Unknown'
          
          console.log('📱 [CHAT MESSAGE] Creating notification for:', {
            roomId,
            roomName: room.name,
            senderName,
            senderId: sender.id
          })
          
          const result = await NotificationService.notifyNewChatMessage(
            roomId,
            room.name,
            senderName,
            messagePreview,
            sender.id // Pass sender ID to exclude from notifications
          )
          
          console.log('✅ [CHAT MESSAGE] Notification result:', result?.length || 0, 'notifications created')
        } else {
          console.warn('⚠️ [CHAT MESSAGE] Room not found:', roomId)
        }
      } catch (notificationError) {
        console.error('❌ [CHAT MESSAGE] Error creating chat notification:', notificationError)
        console.error('❌ [CHAT MESSAGE] Error details:', {
          message: notificationError instanceof Error ? notificationError.message : 'Unknown',
          stack: notificationError instanceof Error ? notificationError.stack : undefined
        })
        // Don't fail the message send if notification fails
      }
    }).catch(err => {
      console.error('❌ [CHAT MESSAGE] Promise error:', err)
    })

    return NextResponse.json(transformedMessage, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
