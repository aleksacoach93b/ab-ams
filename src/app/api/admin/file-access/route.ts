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

    // Fetch file access logs with user information
    const fileAccessLogs = await prisma.file_access_logs.findMany({
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
                lastName: true
              }
            },
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Format response
    const formattedLogs = fileAccessLogs.map(log => ({
      id: log.id,
      userId: log.userId,
      fileType: log.fileType,
      fileId: log.fileId,
      fileName: log.fileName,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: {
        id: log.users.id,
        name: log.users.firstName && log.users.lastName 
          ? `${log.users.firstName} ${log.users.lastName}` 
          : log.users.email,
        email: log.users.email,
        role: log.users.role,
        playerData: log.users.players,
        staffData: log.users.staff
      }
    }))

    return NextResponse.json({
      fileAccessLogs: formattedLogs,
      totalCount: fileAccessLogs.length
    })
  } catch (error) {
    console.error('Error fetching file access logs:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
