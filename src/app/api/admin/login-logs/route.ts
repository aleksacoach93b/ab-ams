import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const success = searchParams.get('success')

    // Build where clause
    const whereClause: any = {}
    if (success !== null && success !== undefined) {
      whereClause.success = success === 'true'
    }

    // Fetch login logs with pagination
    const loginLogs = await prisma.loginLog.findMany({
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
    const totalCount = await prisma.loginLog.count({
      where: whereClause
    })

    return NextResponse.json({
      loginLogs,
      totalCount,
      hasMore: offset + limit < totalCount
    })

  } catch (error) {
    console.error('Error fetching login logs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const olderThan = searchParams.get('olderThan')

    if (!olderThan) {
      return NextResponse.json(
        { message: 'olderThan parameter is required' },
        { status: 400 }
      )
    }

    const cutoffDate = new Date(olderThan)
    
    // Delete login logs older than the specified date
    const deletedCount = await prisma.loginLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    return NextResponse.json({
      message: `Deleted ${deletedCount.count} login logs older than ${cutoffDate.toISOString()}`,
      deletedCount: deletedCount.count
    })

  } catch (error) {
    console.error('Error deleting login logs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
