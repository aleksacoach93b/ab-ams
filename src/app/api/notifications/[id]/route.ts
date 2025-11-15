import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await context.params
    const { isRead } = await request.json()

    // Local dev mode: update in localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Get user's associated player/staff IDs for matching
      // IMPORTANT: For players, user.userId from token is playerUser.id (from login)
      let userPlayerId: string | null = null
      let userPlayerUserId: string | null = null // playerUser.id - this is the actual user account ID
      let userStaffId: string | null = null
      let userStaffUserId: string | null = null // staff.user.id - this is the actual user account ID
      
      // First, check if user.userId is a playerUser.id (most common case for players)
      const playerUser = state.playerUsers.find((u: any) => u.id === user.userId)
      if (playerUser) {
        userPlayerUserId = playerUser.id // This IS user.userId
        userPlayerId = playerUser.playerId
      } else {
        // Check if user.userId is a player.id directly
        const player = state.players.find((p: any) => p.id === user.userId)
        if (player) {
          userPlayerId = player.id
          // Find corresponding playerUser
          const foundPlayerUser = state.playerUsers.find((u: any) => u.playerId === player.id)
          if (foundPlayerUser) {
            userPlayerUserId = foundPlayerUser.id
          }
        }
      }
      
      // Check if user is staff
      const staff = state.staff.find((s: any) => s.id === user.userId || s.user?.id === user.userId)
      if (staff) {
        userStaffId = staff.id
        userStaffUserId = staff.user?.id || staff.id
      }
      
      // Get all possible user IDs for this user
      // CRITICAL: Include playerUser.id and staff.user.id because notifications use these IDs
      const possibleUserIds = [
        user.userId, // This is already playerUser.id for players (from token)
        userPlayerId, // player.id (fallback)
        userPlayerUserId, // playerUser.id (should match user.userId for players)
        userStaffId, // staff.id
        userStaffUserId // staff.user.id
      ].filter((id): id is string => !!id)
      
      // Remove duplicates
      const uniqueUserIds = [...new Set(possibleUserIds)]
      
      // Find notification
      const notificationIndex = state.notifications.findIndex((notif: any) => 
        notif.id === id && uniqueUserIds.includes(notif.userId)
      )
      
      if (notificationIndex === -1) {
        return NextResponse.json(
          { message: 'Notification not found' },
          { status: 404 }
        )
      }
      
      // Update notification
      state.notifications[notificationIndex] = {
        ...state.notifications[notificationIndex],
        isRead,
        updatedAt: new Date().toISOString()
      }
      
      await writeState(state)
      
      return NextResponse.json(state.notifications[notificationIndex])
    }

    // Check if notification belongs to user
    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }

    const updatedNotification = await prisma.notifications.update({
      where: { id },
      data: {
        isRead,
        ...(isRead && { readAt: new Date() })
      }
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await context.params

    // Check if notification belongs to user
    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }

    await prisma.notifications.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
