import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const state = await readState()

    return NextResponse.json({
      userFromToken: {
        userId: user.userId,
        email: user.email,
        role: user.role
      },
      playerUsers: state.playerUsers.map((u: any) => ({
        id: u.id,
        playerId: u.playerId,
        email: u.email
      })),
      allChatNotifications: (state.notifications || []).filter((n: any) => n.category === 'CHAT').map((n: any) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        isRead: n.isRead
      })),
      totalNotifications: state.notifications?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}


