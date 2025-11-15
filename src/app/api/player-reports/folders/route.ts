import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    if (LOCAL_DEV_MODE) {
      const url = new URL(request.url)
      const requestedParentId = url.searchParams.get('parentId')
      const folderKey = requestedParentId || 'root'
      
      const state = await readState()
      let folders = state.playerReportFolders[folderKey] || []
      
      // Calculate actual counts for each folder based on reports and children
      folders = folders.map(folder => {
        // Count reports in this folder
        const reportsCount = (state.playerReports || []).filter(
          (r: any) => r.folderId === folder.id
        ).length
        
        // Count children (subfolders) of this folder
        const childrenCount = Object.keys(state.playerReportFolders).reduce((count, key) => {
          const children = state.playerReportFolders[key].filter(
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
      
      return NextResponse.json(folders)
    }
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const whereClause: any = { isActive: true }
    if (parentId) {
      whereClause.parentId = parentId
    } else {
      whereClause.parentId = null
    }

    // Only ADMIN can view all folders, PLAYER only if admin gave them access
    if (user.role !== 'ADMIN' && user.role !== 'PLAYER') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const folders = await prisma.player_report_folders.findMany({
      where: whereClause,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filter folders based on user role
    let filteredFolders = folders
    if (user.role === 'ADMIN') {
      // ADMIN sees all folders
      filteredFolders = folders
    } else if (user.role === 'PLAYER') {
      // Players can only see folders that have explicit access in player_report_player_access
      const player = await prisma.players.findUnique({
        where: { userId: user.userId }
      })
      
      if (player) {
        filteredFolders = folders.filter(folder => 
          folder.player_report_player_access.some(access => 
            access.playerId === player.id && access.canView
          )
        )
      } else {
        filteredFolders = []
      }
    } else {
      // Staff cannot see player reports folders
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
      parent: folder.player_report_folders,
      children: folder.other_player_report_folders,
      reports: folder.player_reports,
      visibleToPlayers: folder.player_report_player_access.map(access => ({
        id: access.id,
        playerId: access.playerId,
        canView: access.canView,
        player: access.players
      })),
      _count: folder._count
    }))

    return NextResponse.json(transformedFolders)
  } catch (error) {
    console.error('Error fetching player report folders:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (LOCAL_DEV_MODE) {
      const body = await request.json()
      const { name, description, parentId, playerIds } = body
      
      if (!name) {
        return NextResponse.json(
          { message: 'Folder name is required' },
          { status: 400 }
        )
      }
      
      const folderId = `local-player-folder-${Date.now()}`
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
        visibleToPlayers: playerIds ? playerIds.map((playerId: string) => ({
          id: `access_${folderId}_${playerId}`,
          playerId,
          canView: true,
          canEdit: false,
          canDelete: false,
          player: null
        })) : [],
        _count: { reports: 0, children: 0 }
      }
      
      // Save folder to state
      const state = await readState()
      if (!state.playerReportFolders[folderKey]) {
        state.playerReportFolders[folderKey] = []
      }
      state.playerReportFolders[folderKey].push(newFolder)
      await writeState(state)
      
      return NextResponse.json(newFolder, { status: 201 })
    }
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Only ADMIN can create player report folders
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { name, description, parentId, playerIds } = await request.json()

    if (!name) {
      return NextResponse.json({ message: 'Folder name is required' }, { status: 400 })
    }

    // Create the folder
    const folder = await prisma.player_report_folders.create({
      data: {
        id: `player_folder_${Date.now()}`,
        name,
        description: description || null,
        parentId: parentId || null,
        createdBy: user.userId,
        updatedAt: new Date()
      }
    })

    // Create player_report_player_access entries if playerIds is provided
    if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
      await prisma.player_report_player_access.createMany({
        data: playerIds.map((playerId: string) => ({
          id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          folderId: folder.id,
          playerId,
          canView: true,
          canEdit: false,
          canDelete: false,
          updatedAt: new Date()
        }))
      })
    }

    // Fetch the created folder with relations
    const createdFolder = await prisma.player_report_folders.findUnique({
      where: { id: folder.id },
      include: {
        player_report_folders: true,
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

    // Transform for frontend
    const transformedFolder = {
      id: createdFolder!.id,
      name: createdFolder!.name,
      description: createdFolder!.description,
      parentId: createdFolder!.parentId,
      createdBy: createdFolder!.createdBy,
      createdAt: createdFolder!.createdAt.toISOString(),
      updatedAt: createdFolder!.updatedAt.toISOString(),
      parent: createdFolder!.player_report_folders,
      children: createdFolder!.other_player_report_folders,
      reports: createdFolder!.player_reports,
      visibleToPlayers: createdFolder!.player_report_player_access.map(access => ({
        id: access.id,
        playerId: access.playerId,
        canView: access.canView,
        player: access.players
      })),
      _count: createdFolder!._count
    }

    return NextResponse.json(transformedFolder, { status: 201 })
  } catch (error) {
    console.error('Error creating player report folder:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
