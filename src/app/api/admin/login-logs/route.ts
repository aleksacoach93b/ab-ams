import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch login logs with user information
    const loginLogs = await prisma.login_logs.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        users: {
          include: {
            players: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                imageUrl: true
              }
            },
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    // Get total count
    const totalCount = await prisma.login_logs.count()

    // Format response
    const formattedLogs = loginLogs.map(log => ({
      id: log.id,
      userId: log.userId,
      email: log.email,
      role: log.role,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      location: log.location,
      success: log.success,
      failureReason: log.failureReason,
      createdAt: log.createdAt.toISOString(),
      user: {
        id: log.users.id,
        name: log.users.firstName && log.users.lastName 
          ? `${log.users.firstName} ${log.users.lastName}` 
          : log.users.email,
        email: log.users.email,
        role: log.users.role,
        player: log.users.players ? {
          id: log.users.players.id,
          name: `${log.users.players.firstName} ${log.users.players.lastName}`,
          imageUrl: log.users.players.imageUrl
        } : null,
        staff: log.users.staff ? {
          id: log.users.staff.id,
          firstName: log.users.staff.firstName,
          lastName: log.users.staff.lastName,
          avatar: log.users.staff.avatar
        } : null
      }
    }))

    return NextResponse.json({
      loginLogs: formattedLogs,
      totalCount
    })
  } catch (error) {
    console.error('Error fetching login logs:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
