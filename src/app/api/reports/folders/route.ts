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

    // Only coaches, admins, and staff with permission can view report folders
    if (user.role !== 'ADMIN' && user.role !== 'COACH' && user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const whereClause: any = {
      isActive: true
    }

    if (parentId) {
      whereClause.parentId = parentId
    } else {
      whereClause.parentId = null // Root level folders
    }

    // Get folders
    const folders = await prisma.reportFolder.findMany({
      where: whereClause,
      include: {
        parent: true,
        children: {
          where: {
            isActive: true
          }
        },
        reports: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            createdAt: true
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
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter folders based on user role and individual staff access
    let filteredFolders = folders
    if (user.role === 'STAFF') {
      // Get the staff member for this user
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.userId }
      })
      
      if (staffMember) {
        // Staff can only see folders that they have explicit access to
        filteredFolders = folders.filter(folder => 
          folder.visibleToStaff.some(access => 
            access.staffId === staffMember.id && access.canView
          )
        )
      } else {
        filteredFolders = []
      }
    }

    return NextResponse.json(filteredFolders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Only coaches and admins can create report folders
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, parentId, staffAccess } = body

    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      )
    }

    // Create the folder with staff access controls
    const folderData: any = {
      name,
      description: description || null,
      parentId: parentId || null,
      createdBy: user.userId
    }

    // Only add visibleToStaff if there are staff access entries
    if (staffAccess && staffAccess.length > 0) {
      folderData.visibleToStaff = {
        create: staffAccess.map((access: { staffId: string; canView: boolean }) => ({
          staffId: access.staffId,
          canView: access.canView
        }))
      }
    }

    const folder = await prisma.reportFolder.create({
      data: folderData,
      include: {
        parent: true,
        children: true,
        reports: true,
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
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}