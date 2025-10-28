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

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Only staff members can access this endpoint
    if (user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Find the staff member
    const staffMember = await prisma.staff.findFirst({
      where: { userId: user.userId }
    })

    if (!staffMember) {
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Get query parameters for folder navigation
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    // Build where clause for folder filtering
    const whereClause: any = {
      isActive: true
    }
    
    if (folderId) {
      whereClause.parentId = folderId
    } else {
      whereClause.parentId = null // Root level folders
    }

    // Get folders that are visible to this staff member
    const folders = await prisma.reportFolder.findMany({
      where: {
        ...whereClause,
        visibleToStaff: {
          some: {
            staffId: staffMember.id,
            canView: true
          }
        }
      },
      include: {
        parent: true,
        children: {
          where: {
            isActive: true,
            visibleToStaff: {
              some: {
                staffId: staffMember.id,
                canView: true
              }
            }
          }
        },
        reports: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            description: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
            thumbnailUrl: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true
          }
        },
        visibleToStaff: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            reports: {
              where: {
                isActive: true
              }
            },
            children: {
              where: {
                isActive: true,
                visibleToStaff: {
                  some: {
                    staffId: staffMember.id,
                    canView: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get reports in the current folder (if any)
    const reports = await prisma.report.findMany({
      where: {
        isActive: true,
        folderId: folderId || null,
        folder: {
          visibleToStaff: {
            some: {
              staffId: staffMember.id,
              canView: true
            }
          }
        }
      },
      include: {
        folder: {
          include: {
            visibleToStaff: {
              include: {
                staff: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      folders,
      reports,
      currentFolderId: folderId || null
    })
  } catch (error) {
    console.error('Error fetching staff reports:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}