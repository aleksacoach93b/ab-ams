import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Track file access (view or download)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, userId, action } = body

    if (!reportId || !userId || !action) {
      return NextResponse.json(
        { message: 'Report ID, User ID, and action are required' },
        { status: 400 }
      )
    }

    if (!['view', 'download'].includes(action)) {
      return NextResponse.json(
        { message: 'Action must be either "view" or "download"' },
        { status: 400 }
      )
    }

    // Get IP address and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.connection?.remoteAddress || 
                     'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create analytics record
    const analytics = await prisma.fileAnalytics.create({
      data: {
        reportId,
        userId,
        action,
        ipAddress,
        userAgent
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        report: {
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Analytics recorded successfully',
      analytics
    })
  } catch (error) {
    console.error('Error recording analytics:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get analytics data (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action') // Filter by action (view/download)
    const reportId = searchParams.get('reportId') // Filter by specific report
    const userId = searchParams.get('userId') // Filter by specific user

    const whereClause: any = {}

    if (action) {
      whereClause.action = action
    }

    if (reportId) {
      whereClause.reportId = reportId
    }

    if (userId) {
      whereClause.userId = userId
    }

    // Get analytics data with pagination
    const [analytics, totalCount] = await Promise.all([
      prisma.fileAnalytics.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          report: {
            select: {
              id: true,
              title: true,
              fileName: true,
              fileType: true,
              folder: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.fileAnalytics.count({
        where: whereClause
      })
    ])

    // Get summary statistics
    const [totalViews, totalDownloads, uniqueUsers, uniqueReports] = await Promise.all([
      prisma.fileAnalytics.count({
        where: { action: 'view' }
      }),
      prisma.fileAnalytics.count({
        where: { action: 'download' }
      }),
      prisma.fileAnalytics.groupBy({
        by: ['userId'],
        _count: {
          userId: true
        }
      }).then(result => result.length),
      prisma.fileAnalytics.groupBy({
        by: ['reportId'],
        _count: {
          reportId: true
        }
      }).then(result => result.length)
    ])

    // Get recent activity (last 24 hours)
    const last24Hours = new Date()
    last24Hours.setHours(last24Hours.getHours() - 24)

    const recentActivity = await prisma.fileAnalytics.count({
      where: {
        createdAt: {
          gte: last24Hours
        }
      }
    })

    // Get most accessed reports
    const mostAccessedReports = await prisma.fileAnalytics.groupBy({
      by: ['reportId'],
      _count: {
        reportId: true
      },
      orderBy: {
        _count: {
          reportId: 'desc'
        }
      },
      take: 10
    })

    // Get most active users
    const mostActiveUsers = await prisma.fileAnalytics.groupBy({
      by: ['userId'],
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    })

    return NextResponse.json({
      analytics,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      summary: {
        totalViews,
        totalDownloads,
        uniqueUsers,
        uniqueReports,
        recentActivity
      },
      mostAccessedReports,
      mostActiveUsers
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
