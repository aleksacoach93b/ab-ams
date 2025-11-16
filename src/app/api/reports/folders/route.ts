import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const requestedParentId = url.searchParams.get('parentId')
    const folderKey = requestedParentId || 'root'
    
    if (LOCAL_DEV_MODE) {
      // Check authentication even in LOCAL_DEV_MODE
      const token = request.headers.get('authorization')?.replace('Bearer ', '')
      let user = null
      
      if (token) {
        try {
          const { verifyToken } = await import('@/lib/auth')
          user = await verifyToken(token)
        } catch (e) {
          // Ignore auth errors in LOCAL_DEV_MODE for now
        }
      }
      
      const state = await readState()
      let folders = state.reportFolders[folderKey] || []
      
      // Calculate actual counts for each folder
      folders = folders.map((folder: any) => {
        // Count reports in this folder
        const reportsCount = (state.reports || []).filter(
          (r: any) => r.folderId === folder.id && r.isActive !== false
        ).length
        
        // Count children folders
        const childrenCount = Object.keys(state.reportFolders).reduce((count, key) => {
          const children = state.reportFolders[key].filter(
            (f: any) => f.parentId === folder.id
          )
          return count + children.length
        }, 0)
        
        return {
          ...folder,
          _count: {
            reports: reportsCount,
            children: childrenCount
          }
        }
      })
      
      // Filter folders based on user role and permissions
      if (user) {
        if (user.role === 'ADMIN') {
          // ADMIN sees all folders
          console.log(`✅ LOCAL_DEV_MODE: Admin user, returning all ${folders.length} folders`)
        } else if (user.role === 'STAFF') {
          // Staff can only see folders they have access to via visibleToStaff
          // Find staff member by user.userId (which is staff.user.id from login)
          console.log(`🔍 [LOCAL_DEV_MODE] Looking for staff with user.userId: ${user.userId}`)
          console.log(`🔍 [LOCAL_DEV_MODE] Available staff:`, state.staff?.map((s: any) => ({ 
            id: s.id, 
            user_id: s.user?.id,
            name: s.name 
          })))
          
          const staffMember = state.staff?.find((s: any) => {
            const matches = s.user?.id === user.userId || s.id === user.userId
            if (matches) {
              console.log(`✅ Found staff member:`, { id: s.id, name: s.name, user_id: s.user?.id })
            }
            return matches
          })
          
          if (staffMember) {
            const staffId = staffMember.id
            console.log(`🔍 [LOCAL_DEV_MODE] Filtering folders for staffId: ${staffId}, user.userId: ${user.userId}`)
            
            folders = folders.filter((folder: any) => {
              // Check if folder has visibleToStaff array and if this staff is in it with canView: true
              if (folder.visibleToStaff && Array.isArray(folder.visibleToStaff)) {
                console.log(`🔍 [LOCAL_DEV_MODE] Checking folder "${folder.name}" with visibleToStaff:`, folder.visibleToStaff.map((a: any) => ({ staffId: a.staffId, userId: a.userId, canView: a.canView })))
                
                const hasAccess = folder.visibleToStaff.some((access: any) => {
                  // Match by staffId (primary) or userId (fallback)
                  // visibleToStaff uses staffId from folder visibility settings
                  const matchesStaffId = access.staffId === staffId
                  const matchesUserId = access.userId === user.userId || access.userId === staffMember.user?.id
                  const canView = access.canView === true
                  const matches = (matchesStaffId || matchesUserId) && canView
                  
                  if (matches) {
                    console.log(`✅ Access granted to folder "${folder.name}" - staffId match: ${matchesStaffId}, userId match: ${matchesUserId}, canView: ${canView}`)
                  }
                  
                  return matches
                })
                
                if (!hasAccess) {
                  console.log(`❌ Folder "${folder.name}" not accessible - staffId: ${staffId}, visibleToStaff:`, folder.visibleToStaff.map((a: any) => ({ staffId: a.staffId, userId: a.userId, canView: a.canView })))
                }
                return hasAccess
              }
              // If no visibleToStaff defined, staff can't see it (only admin can)
              console.log(`❌ Folder "${folder.name}" has no visibleToStaff array`)
              return false
            })
            console.log(`✅ LOCAL_DEV_MODE: Staff user ${user.userId} (staffId: ${staffId}), filtered to ${folders.length} accessible folders`)
          } else {
            console.warn(`⚠️ LOCAL_DEV_MODE: Staff user ${user.userId} not found in state.staff`)
            console.warn(`   Available staff user IDs:`, state.staff?.map((s: any) => s.user?.id))
            folders = []
          }
        } else {
          // Players can't see report folders
          folders = []
        }
      } else {
        // No user - return all folders (for backward compatibility)
        console.log(`⚠️ LOCAL_DEV_MODE: No user token, returning all ${folders.length} folders`)
      }
      
      console.log(`✅ LOCAL_DEV_MODE: Returning ${folders.length} folders`)
      return NextResponse.json(folders)
    }
    
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

    // Only ADMIN can view all report folders, staff only if admin gave them access
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const whereClause: any = {
      isActive: true
    }

    if (requestedParentId) {
      whereClause.parentId = requestedParentId
    } else {
      whereClause.parentId = null // Root level folders
    }

    // Get folders
    const folders = await prisma.report_folders.findMany({
      where: whereClause,
      include: {
        report_folders: true, // parent
        other_report_folders: {
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
            title: true,
            createdAt: true
          }
        },
        report_visibility: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
            other_report_folders: {
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

    // Filter folders based on user role
    let filteredFolders = folders
    if (user.role === 'ADMIN') {
      // ADMIN sees all folders
      filteredFolders = folders
    } else if (user.role === 'STAFF') {
      // Staff can only see folders that have explicit access in report_visibility
      filteredFolders = folders.filter(folder => 
        folder.report_visibility.some(visibility => 
          visibility.userId === user.userId && visibility.canView
        )
      )
    } else {
      filteredFolders = []
    }

    // Transform folders for frontend
    const transformedFolders = filteredFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      createdBy: folder.createdBy,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
      parent: folder.report_folders,
      children: folder.other_report_folders,
      reports: folder.reports,
      visibleToStaff: folder.report_visibility.map(v => ({
        id: v.id,
        userId: v.userId,
        canView: v.canView,
        staff: v.users ? {
          id: v.users.id,
          name: `${v.users.firstName} ${v.users.lastName}`.trim() || v.users.email,
          email: v.users.email
        } : null
      })),
      _count: folder._count
    }))

    return NextResponse.json(transformedFolders)
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
    if (LOCAL_DEV_MODE) {
      const body = await request.json()
      const { name, description, parentId } = body
      const folderId = `local-folder-${Date.now()}`
      const folderKey = parentId || 'root'
      
      const newFolder = {
        id: folderId,
        name: name || 'Folder',
        description: description || null,
        parentId: parentId || null,
        createdBy: 'local-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parent: null,
        children: [],
        reports: [],
        visibleToStaff: [],
        _count: { reports: 0, children: 0 }
      }
      
      // Save folder to state
      const state = await readState()
      if (!state.reportFolders[folderKey]) {
        state.reportFolders[folderKey] = []
      }
      state.reportFolders[folderKey].push(newFolder)
      await writeState(state)
      
      return NextResponse.json(newFolder, { status: 201 })
    }
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

    // Only ADMIN can create report folders
    if (user.role !== 'ADMIN') {
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

    // Create the folder
    const folder = await prisma.report_folders.create({
      data: {
        id: `folder_${Date.now()}`,
        name,
        description: description || null,
        parentId: parentId || null,
        createdBy: user.userId,
        updatedAt: new Date()
      }
    })

    // Create report_visibility entries if staff access is provided
    if (staffAccess && Array.isArray(staffAccess) && staffAccess.length > 0) {
      await prisma.report_visibility.createMany({
        data: staffAccess.map((access: { userId: string; canView?: boolean }) => ({
          id: `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          folderId: folder.id,
          userId: access.userId,
          canView: access.canView !== undefined ? access.canView : true,
          canEdit: false,
          canDelete: false,
          updatedAt: new Date()
        }))
      })
    }

    // Fetch the created folder with relations
    const createdFolder = await prisma.report_folders.findUnique({
      where: { id: folder.id },
      include: {
        report_folders: true,
        other_report_folders: {
          where: { isActive: true }
        },
        reports: {
          where: { isActive: true }
        },
        report_visibility: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            reports: { where: { isActive: true } },
            other_report_folders: { where: { isActive: true } }
          }
        }
      }
    })

    // Transform for frontend
    const transformedFolder = {
      id: createdFolder!.id,
      name: createdFolder!.name,
      description: createdFolder!.description,
      parentId: createdFolder!.parentId,
      createdBy: createdFolder!.createdBy,
      createdAt: createdFolder!.createdAt.toISOString(),
      updatedAt: createdFolder!.updatedAt.toISOString(),
      parent: createdFolder!.report_folders,
      children: createdFolder!.other_report_folders,
      reports: createdFolder!.reports,
      visibleToStaff: createdFolder!.report_visibility.map(v => ({
        id: v.id,
        userId: v.userId,
        canView: v.canView,
        staff: v.users ? {
          id: v.users.id,
          name: `${v.users.firstName} ${v.users.lastName}`.trim() || v.users.email,
          email: v.users.email
        } : null
      })),
      _count: createdFolder!._count
    }

    return NextResponse.json(transformedFolder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}