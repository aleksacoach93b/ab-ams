import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action')
    const fileType = searchParams.get('fileType')

    // Build where clause
    const whereClause: any = {}
    if (action) {
      whereClause.action = action
    }
    if (fileType) {
      whereClause.fileType = fileType
    }

    // Fetch file access logs with pagination
    const fileAccessLogs = await prisma.fileAccessLog.findMany({
      where: whereClause,
      include: {
        user: {
          include: {
            player: true,
            staff: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.fileAccessLog.count({
      where: whereClause
    })

    // Transform the data for frontend
    const transformedLogs = fileAccessLogs.map(log => {
      let displayName = log.user.name
      if (!displayName) {
        if (log.user.player) {
          displayName = log.user.player.name
        } else if (log.user.staff) {
          displayName = log.user.staff.name
        } else {
          displayName = log.user.email.split('@')[0]
        }
      }

      return {
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
          id: log.user.id,
          email: log.user.email,
          name: displayName,
          role: log.user.role,
          playerData: log.user.player,
          staffData: log.user.staff
        }
      }
    })

    return NextResponse.json({
      fileAccessLogs: transformedLogs,
      totalCount,
      hasMore: offset + limit < totalCount
    })

  } catch (error) {
    console.error('Error fetching file access logs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, fileType, fileId, fileName, action, ipAddress, userAgent } = body

    // Create file access log entry
    const fileAccessLog = await prisma.fileAccessLog.create({
      data: {
        userId,
        fileType,
        fileId,
        fileName,
        action,
        ipAddress,
        userAgent
      }
    })

    return NextResponse.json({
      message: 'File access logged successfully',
      logId: fileAccessLog.id
    })

  } catch (error) {
    console.error('Error creating file access log:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
