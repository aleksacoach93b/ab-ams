import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No token provided',
        instructions: 'Add ?token=YOUR_TOKEN to the URL or send Authorization header'
      }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const state = await readState()

    // Find playerUser for this user
    const playerUser = state.playerUsers.find((u: any) => u.id === user.userId)
    const player = playerUser ? state.players.find((p: any) => p.id === playerUser.playerId) : null

    // Get all chat notifications
    const allChatNotifications = (state.notifications || []).filter((n: any) => n.category === 'CHAT')
    
    // Check matching
    const userChatNotifications = allChatNotifications.filter((n: any) => 
      String(n.userId) === String(user.userId)
    )
    
    const unreadUserChatNotifications = userChatNotifications.filter((n: any) => !n.isRead)

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        userIdType: typeof user.userId
      },
      playerUser: playerUser ? {
        id: playerUser.id,
        playerId: playerUser.playerId,
        email: playerUser.email
      } : null,
      player: player ? {
        id: player.id,
        name: player.name || `${player.firstName} ${player.lastName}`
      } : null,
      notifications: {
        total: state.notifications?.length || 0,
        totalChat: allChatNotifications.length,
        userChat: userChatNotifications.length,
        unreadUserChat: unreadUserChatNotifications.length,
        allChatDetails: allChatNotifications.slice(0, 10).map((n: any) => ({
          id: n.id,
          userId: n.userId,
          userIdType: typeof n.userId,
          userIdString: String(n.userId),
          userUserIdString: String(user.userId),
          matches: String(n.userId) === String(user.userId),
          title: n.title,
          isRead: n.isRead
        }))
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}


