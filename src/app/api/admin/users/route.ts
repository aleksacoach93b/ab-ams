import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // First, get all users
    const users = await prisma.user.findMany({
      include: {
        player: true,
        staff: true,
        loginLogs: {
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
      let displayName = user.name
      if (!displayName) {
        if (user.player) {
          displayName = user.player.name
        } else if (user.staff) {
          displayName = user.staff.name
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
        playerData: user.player,
        staffData: user.staff,
        // Add login activity
        lastLoginLog: user.loginLogs[0] || null
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
