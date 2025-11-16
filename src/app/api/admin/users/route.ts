import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // First, get all users
    const users = await prisma.users.findMany({
      include: {
        players: true,
        staff: true,
        login_logs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Found users:', users.length)

    const formattedUsers = users.map(user => {
      // Get name from player/staff if user doesn't have name
      let displayName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email.split('@')[0]
      if (!displayName) {
        if (user.players) {
          displayName = `${user.players.firstName} ${user.players.lastName}`
        } else if (user.staff) {
          displayName = `${user.staff.firstName} ${user.staff.lastName}`
        } else {
          displayName = user.email.split('@')[0] // Use email prefix as fallback
        }
      }

      // Split the name field into firstName and lastName
      const nameParts = displayName ? displayName.split(' ') : ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      return {
        id: user.id,
        email: user.email,
        name: displayName,
        firstName,
        lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        lastLoginIp: user.loginIp,
        // Add specific role data
        playerData: user.players,
        staffData: user.staff,
        // Add login activity
        lastLoginLog: user.login_logs[0] || null
      }
    })

    console.log('Formatted users:', formattedUsers.length)

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}
