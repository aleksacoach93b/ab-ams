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
    const { name, description, playerAccess } = body

    // Check if folder exists
    const existingFolder = await prisma.playerReportFolder.findUnique({
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

    // Start a transaction to update folder and player access
    const result = await prisma.$transaction(async (tx) => {
      // Update the folder
      const folder = await tx.playerReportFolder.update({
        where: { id },
        data: {
          name,
          description,
          updatedAt: new Date()
        },
        include: {
          parent: true,
          children: true,
          reports: true
        }
      })

      // If playerAccess is provided, update player access
      if (playerAccess && Array.isArray(playerAccess)) {
        // Delete existing player access for this folder
        await tx.playerReportPlayerAccess.deleteMany({
          where: { folderId: id }
        })

        // Create new player access entries
        if (playerAccess.length > 0) {
          await tx.playerReportPlayerAccess.createMany({
            data: playerAccess.map((access: any) => ({
              folderId: id,
              playerId: access.playerId,
              canView: access.canView
            }))
          })
        }
      }

      return folder
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating player report folder:', error)
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

    // Check if folder exists
    const existingFolder = await prisma.playerReportFolder.findUnique({
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

    await prisma.playerReportFolder.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Folder deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting player report folder:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
