import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
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

    const folders = await prisma.playersReportFolder.findMany({
      where: whereClause,
      include: {
        parent: true,
        children: { where: { isActive: true } },
        reports: { where: { isActive: true } },
        visibleToPlayers: {
          include: {
            player: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: {
            reports: { where: { isActive: true } },
            children: { where: { isActive: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let filteredFolders = folders
    if (user.role === 'PLAYER') {
      const player = await prisma.players.findUnique({
        where: { userId: user.userId }
      })
      
      if (player) {
        filteredFolders = folders.filter(folder => 
          folder.visibleToPlayers.some(access => 
            access.playerId === player.id && access.canView
          )
        )
      } else {
        filteredFolders = []
      }
    }

    return NextResponse.json(filteredFolders)
  } catch (error) {
    console.error('Error fetching player report folders:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { name, description, parentId, playerIds } = await request.json()

    if (!name) {
      return NextResponse.json({ message: 'Folder name is required' }, { status: 400 })
    }

    const folder = await prisma.playersReportFolder.create({
      data: {
        name,
        description: description || '',
        parentId: parentId || null,
        createdBy: user.userId,
        visibleToPlayers: {
          create: (playerIds || []).map((playerId: string) => ({
            playerId,
            canView: true
          }))
        }
      }
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating player report folder:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
