import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Only admins can update folders
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, staffAccess } = body

    if (LOCAL_DEV_MODE) {
      console.log('📁 LOCAL_DEV_MODE: Updating folder:', { id, name, description, staffAccess })
      
      const state = await readState()
      
      // Find folder in all parent folders
      let folder = null
      let folderKey = null
      
      for (const [key, folders] of Object.entries(state.reportFolders)) {
        const foundFolder = folders.find((f: any) => f.id === id)
        if (foundFolder) {
          folder = foundFolder
          folderKey = key
          break
        }
      }
      
      if (!folder) {
        return NextResponse.json(
          { message: 'Folder not found' },
          { status: 404 }
        )
      }

      // Only the author or admin can edit the folder
      if (folder.createdBy !== user.userId && user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You can only edit your own folders' },
          { status: 403 }
        )
      }

      // Update folder
      folder.name = name
      folder.description = description || null
      folder.updatedAt = new Date().toISOString()

      // Update staff access (visibleToStaff)
      if (staffAccess && Array.isArray(staffAccess)) {
        folder.visibleToStaff = staffAccess
          .filter((access: any) => access.canView)
          .map((access: any) => {
            const staffMember = state.staff.find((s: any) => s.id === access.staffId)
            return {
              id: `access-${folder.id}-${access.staffId}`,
              canView: true,
              staffId: access.staffId,
              staff: staffMember ? {
                id: staffMember.id,
                name: staffMember.name || `${staffMember.firstName} ${staffMember.lastName}`,
                email: staffMember.email
              } : null
            }
          })
      } else {
        // If no staffAccess provided, clear visibleToStaff
        folder.visibleToStaff = []
      }

      // Save state
      await writeState(state)

      console.log('✅ LOCAL_DEV_MODE: Folder updated successfully')
      
      return NextResponse.json({
        ...folder,
        _count: {
          reports: folder.reports?.length || 0,
          children: folder.children?.length || 0
        }
      })
    }

    // Check if folder exists and user has permission to edit it
    const existingFolder = await prisma.report_folders.findUnique({
      where: { id }
    })

    if (!existingFolder) {
      return NextResponse.json(
        { message: 'Folder not found' },
        { status: 404 }
      )
    }

    // Only the author or admin can edit the folder
    if (existingFolder.createdBy !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'You can only edit your own folders' },
        { status: 403 }
      )
    }

    // Update the folder and handle staff access
    const folder = await prisma.$transaction(async (tx) => {
      // Update the folder
      const updatedFolder = await tx.report_folders.update({
        where: { id },
        data: {
          name,
          description: description || null,
          updatedAt: new Date()
        }
      })

      // Delete existing visibility records for this folder
      await tx.report_visibility.deleteMany({
        where: { folderId: id }
      })

      // Create new visibility records if provided
      // Note: staffAccess contains staffId, but we need to get userId from staff
      if (staffAccess && Array.isArray(staffAccess)) {
        const accessRecords = []
        
        for (const access of staffAccess) {
          if (access.canView && access.staffId) {
            // Get staff member to find their userId
            const staffMember = await tx.staff.findUnique({
              where: { id: access.staffId },
              select: { userId: true }
            })
            
            if (staffMember && staffMember.userId) {
              // Generate unique ID for visibility record
              const visibilityId = `visibility_${id}_${staffMember.userId}_${Date.now()}`
              
              accessRecords.push({
                id: visibilityId,
                folderId: id,
                userId: staffMember.userId,
                canView: true,
                canEdit: false,
                canDelete: false,
                createdAt: new Date(),
                updatedAt: new Date()
              })
            }
          }
        }

        if (accessRecords.length > 0) {
          await tx.report_visibility.createMany({
            data: accessRecords
          })
        }
      }

      // Return the updated folder with relations
      return await tx.report_folders.findUnique({
        where: { id },
        include: {
          report_folders: true, // parent
          other_report_folders: true, // children
          reports: true,
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
          }
        }
      })
    })

    // Transform response to match frontend expectations
    const transformedFolder = {
      ...folder,
      parent: folder.report_folders,
      children: folder.other_report_folders,
      visibleToStaff: folder.report_visibility.map(access => ({
        id: access.id,
        canView: access.canView,
        staff: access.users ? {
          id: access.users.id,
          name: `${access.users.firstName} ${access.users.lastName}`.trim(),
          email: access.users.email
        } : null
      }))
    }

    return NextResponse.json(transformedFolder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Only admins can delete folders
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // LOCAL_DEV_MODE: Delete folder from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find folder in all reportFolders keys
      let folder = null
      let folderKey = null
      let folderIndex = -1
      
      for (const [key, folders] of Object.entries(state.reportFolders)) {
        const foundIndex = folders.findIndex((f: any) => f.id === id)
        if (foundIndex !== -1) {
          folder = folders[foundIndex]
          folderKey = key
          folderIndex = foundIndex
          break
        }
      }
      
      if (!folder) {
        return NextResponse.json(
          { message: 'Folder not found' },
          { status: 404 }
        )
      }

      // Check permission
      if (folder.createdBy !== user.userId && user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You can only delete your own folders' },
          { status: 403 }
        )
      }

      // Find and delete all child folders recursively
      const deleteFolderRecursive = (folderId: string) => {
        for (const [key, folders] of Object.entries(state.reportFolders)) {
          const childrenToDelete = folders.filter((f: any) => f.parentId === folderId)
          childrenToDelete.forEach((child: any) => {
            // Recursively delete children
            deleteFolderRecursive(child.id)
          })
          // Remove children from this key
          state.reportFolders[key] = folders.filter((f: any) => f.parentId !== folderId)
        }
      }

      // Delete all child folders
      deleteFolderRecursive(id)

      // Remove the folder from its parent
      if (folderKey && folderIndex !== -1) {
        state.reportFolders[folderKey].splice(folderIndex, 1)
      }

      // Remove reports that belong to this folder (or mark as deleted)
      // Option 1: Delete reports completely
      // state.reports = state.reports.filter((r: any) => r.folderId !== id)
      
      // Option 2: Mark reports as inactive (better for data integrity)
      state.reports = state.reports.map((r: any) => {
        if (r.folderId === id) {
          return { ...r, isActive: false, folderId: null }
        }
        return r
      })

      await writeState(state)
      
      console.log(`✅ LOCAL_DEV_MODE: Folder ${id} deleted successfully`)
      
      return NextResponse.json(
        { message: 'Folder deleted successfully' },
        { status: 200 }
      )
    }

    // Check if folder exists and user has permission to delete it
    const existingFolder = await prisma.report_folders.findUnique({
      where: { id }
    })

    if (!existingFolder) {
      return NextResponse.json(
        { message: 'Folder not found' },
        { status: 404 }
      )
    }

    // Only the author or admin can delete the folder
    if (existingFolder.createdBy !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'You can only delete your own folders' },
        { status: 403 }
      )
    }

    await prisma.report_folders.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Folder deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}