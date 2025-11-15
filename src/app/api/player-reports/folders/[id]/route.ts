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

    const body = await request.json()
    const { name, description, playerAccess } = body

    // Local dev mode: update in state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find folder in all folder collections
      let folderFound = false
      let updatedFolder = null
      const folderKeys = Object.keys(state.playerReportFolders)
      
      for (const key of folderKeys) {
        const folderIndex = state.playerReportFolders[key].findIndex(f => f.id === id)
        if (folderIndex !== -1) {
          // Update folder name/description if provided
          if (name !== undefined) {
            state.playerReportFolders[key][folderIndex].name = name
          }
          if (description !== undefined) {
            state.playerReportFolders[key][folderIndex].description = description
          }
          state.playerReportFolders[key][folderIndex].updatedAt = new Date().toISOString()
          
          // Update player access
          if (playerAccess && Array.isArray(playerAccess)) {
            state.playerReportFolders[key][folderIndex].visibleToPlayers = playerAccess.map((access: any) => ({
              id: `access_${id}_${access.playerId}`,
              playerId: access.playerId,
              canView: access.canView,
              player: null // Will be populated when needed
            }))
          }
          
          folderFound = true
          updatedFolder = state.playerReportFolders[key][folderIndex]
          await writeState(state)
          break
        }
      }
      
      if (!folderFound) {
        return NextResponse.json(
          { message: 'Folder not found' },
          { status: 404 }
        )
      }
      
      console.log(`✅ Updated player access for folder ${id}`)
      return NextResponse.json(updatedFolder)
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

    // Only coaches and admins can update folders
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if folder exists
    const existingFolder = await prisma.player_report_folders.findUnique({
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
      const folder = await tx.player_report_folders.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          updatedAt: new Date()
        },
        include: {
          player_report_folders: true, // parent
          other_player_report_folders: { where: { isActive: true } },
          player_reports: { where: { isActive: true } },
          player_report_player_access: {
            include: {
              players: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          _count: {
            select: {
              player_reports: { where: { isActive: true } },
              other_player_report_folders: { where: { isActive: true } }
            }
          }
        }
      })

      // If playerAccess is provided, update player access
      if (playerAccess && Array.isArray(playerAccess)) {
        // Delete existing player access for this folder
        await tx.player_report_player_access.deleteMany({
          where: { folderId: id }
        })

        // Create new player access entries
        if (playerAccess.length > 0) {
          await tx.player_report_player_access.createMany({
            data: playerAccess.map((access: any) => ({
              id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              folderId: id,
              playerId: access.playerId,
              canView: access.canView || true,
              canEdit: false,
              canDelete: false,
              updatedAt: new Date()
            }))
          })
        }
      }

      return folder
    })

    // Transform for frontend
    const transformedFolder = {
      id: result.id,
      name: result.name,
      description: result.description,
      parentId: result.parentId,
      createdBy: result.createdBy,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      parent: result.player_report_folders,
      children: result.other_player_report_folders,
      reports: result.player_reports,
      visibleToPlayers: result.player_report_player_access.map((access: any) => ({
        id: access.id,
        playerId: access.playerId,
        canView: access.canView,
        player: access.players
      })),
      _count: result._count
    }

    return NextResponse.json(transformedFolder)
  } catch (error) {
    console.error('Error updating player report folder:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
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
