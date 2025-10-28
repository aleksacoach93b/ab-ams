import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    // Only coaches and admins can update folders
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, staffAccess } = body

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

    // Only coaches and admins can delete folders
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
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