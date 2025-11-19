import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Local dev mode: update notifications in localDevStore
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
      
      console.log(`📝 Marking all notifications as read for user ${user.userId}`, {
        possibleUserIds: uniqueUserIds,
        userRole: user.role
      })
      
      // Find all unread notifications for this user (using all possible IDs)
      const userNotifications = (state.notifications || []).filter((notif: any) => 
        uniqueUserIds.includes(notif.userId) && !notif.isRead
      )
      
      console.log(`📝 Found ${userNotifications.length} unread notifications to mark as read`)
      
      // Update all unread notifications to read
      let updatedCount = 0
      if (state.notifications) {
        state.notifications = state.notifications.map((notif: any) => {
          if (uniqueUserIds.includes(notif.userId) && !notif.isRead) {
            updatedCount++
            return {
              ...notif,
              isRead: true,
              readAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
          return notif
        })
      }
      
      await writeState(state)
      
      console.log(`✅ Marked ${updatedCount} notifications as read`)
      
      return NextResponse.json({
        message: 'All notifications marked as read',
        updatedCount
      })
    }

    // Production mode: use Prisma
    const result = await prisma.notifications.updateMany({
      where: {
        userId: user.userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      message: 'All notifications marked as read',
      updatedCount: result.count
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
