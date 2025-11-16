import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Users fetch request received')
    
    // Prisma handles connection pooling automatically
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

    // Check if user has permission to view users (ADMIN, COACH, STAFF)
    if (!['ADMIN', 'COACH', 'STAFF'].includes(user.role)) {
      return NextResponse.json(
        { message: 'You don\'t have permission to view users' },
        { status: 403 }
      )
    }

    // Fetch all users with their roles
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        // Include player info if exists
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            jerseyNumber: true,
            status: true
          }
        },
        // Include staff info if exists
        staff: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      },
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data to include role-specific information
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      // Add role-specific info
      ...(user.player && {
        playerInfo: {
          position: user.player.position,
          jerseyNumber: user.player.jerseyNumber,
          status: user.player.status
        }
      }),
      ...(user.staff && {
        staffInfo: {
          position: user.staff.position
        }
      })
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
