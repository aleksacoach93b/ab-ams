import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    // Get query parameters for folder navigation
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const folderKey = folderId || 'root'

    // LOCAL_DEV_MODE: Return folders and reports from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find staff member
      const staffMember = state.staff?.find((s: any) => 
        s.user?.id === user.userId || s.id === user.userId
      )

      if (!staffMember) {
        return NextResponse.json(
          { message: 'Staff member not found' },
          { status: 404 }
        )
      }

      const staffId = staffMember.id

      // Get all folders first
      let allFolders: any[] = []
      for (const key of Object.keys(state.reportFolders)) {
        allFolders = [...allFolders, ...(state.reportFolders[key] || [])]
      }

      // Filter folders that are visible to this staff member
      let accessibleFolders = allFolders.filter((folder: any) => {
        if (folder.visibleToStaff && Array.isArray(folder.visibleToStaff)) {
          return folder.visibleToStaff.some((access: any) => 
            access.staffId === staffId && access.canView === true
          )
        }
        return false
      })

      // Filter by parentId if specified
      if (folderId) {
        accessibleFolders = accessibleFolders.filter((f: any) => f.parentId === folderId)
      } else {
        accessibleFolders = accessibleFolders.filter((f: any) => !f.parentId)
      }

      // Calculate counts and add children for each folder
      const foldersWithData = accessibleFolders.map((folder: any) => {
        // Count reports in this folder
        const reportsCount = (state.reports || []).filter(
          (r: any) => r.folderId === folder.id && r.isActive !== false
        ).length

        // Find children folders (recursively - folders that have this folder as parent and are accessible)
        const childrenFolders = allFolders.filter((f: any) => 
          f.parentId === folder.id &&
          f.visibleToStaff?.some((access: any) => 
            access.staffId === staffId && access.canView === true
          )
        )

        // Get reports in this folder
        const folderReports = (state.reports || []).filter(
          (r: any) => r.folderId === folder.id && r.isActive !== false
        )

        return {
          ...folder,
          _count: {
            reports: reportsCount,
            children: childrenFolders.length
          },
          children: childrenFolders.map((child: any) => ({
            ...child,
            _count: {
              reports: (state.reports || []).filter((r: any) => r.folderId === child.id && r.isActive !== false).length,
              children: 0 // Simplified - would need recursive calculation for full count
            }
          })),
          reports: folderReports
        }
      })

      // Get reports for the current folder
      const reports = folderId 
        ? (state.reports || []).filter((r: any) => r.folderId === folderId && r.isActive !== false)
        : []

      return NextResponse.json({ 
        folders: foldersWithData,
        reports,
        currentFolderId: folderId || null
      })
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
    const reports = await prisma.reports.findMany({
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