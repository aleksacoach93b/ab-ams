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
    const existingFolder = await prisma.reportFolder.findUnique({
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
      const updatedFolder = await tx.reportFolder.update({
        where: { id },
        data: {
          name,
          description,
          updatedAt: new Date()
        }
      })

      // Delete existing staff access records
      await tx.reportFolderStaffAccess.deleteMany({
        where: { folderId: id }
      })

      // Create new staff access records if provided
      if (staffAccess && Array.isArray(staffAccess)) {
        const accessData = staffAccess
          .filter(access => access.canView)
          .map(access => ({
            folderId: id,
            staffId: access.staffId,
            canView: true
          }))

        if (accessData.length > 0) {
          await tx.reportFolderStaffAccess.createMany({
            data: accessData
          })
        }
      }

      // Return the updated folder with relations
      return await tx.reportFolder.findUnique({
        where: { id },
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
    })

    return NextResponse.json(folder)
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
    const existingFolder = await prisma.reportFolder.findUnique({
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

    await prisma.reportFolder.delete({
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