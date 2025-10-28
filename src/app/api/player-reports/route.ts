import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    const whereClause: any = { isActive: true }
    
    if (folderId) {
      whereClause.folderId = folderId
    } else {
      whereClause.folderId = null
    }

    const reports = await prisma.playersReport.findMany({
      where: whereClause,
      include: {
        folder: {
          include: {
            visibleToPlayers: {
              include: {
                player: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filter reports based on user role and folder access
    let filteredReports = reports
    if (user.role === 'PLAYER') {
      // Get the player for this user
      const player = await prisma.players.findUnique({
        where: { userId: user.userId }
      })
      
      if (player) {
        // Players can only see reports from folders they have access to
        filteredReports = reports.filter(report => 
          !report.folder || report.folder.visibleToPlayers.some(access => 
            access.playerId === player.id && access.canView
          )
        )
      } else {
        filteredReports = []
      }
    }

    return NextResponse.json({ reports: filteredReports })
  } catch (error) {
    console.error('Error fetching player reports:', error)
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const descriptionRaw = formData.get('description') as string
    const description = descriptionRaw && descriptionRaw.trim() !== '' && descriptionRaw !== 'undefined' ? descriptionRaw : null
    const folderIdRaw = formData.get('folderId') as string
    const folderId = folderIdRaw === 'null' || folderIdRaw === '' ? null : folderIdRaw

    if (!name || !file) {
      return NextResponse.json({ message: 'Name and file are required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        message: 'File type not allowed. Please upload images, videos, audio, PDF, or document files.' 
      }, { status: 400 })
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'player-reports')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const filePath = join(uploadDir, fileName)
    const fileUrl = `/uploads/player-reports/${fileName}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create report in database
    const report = await prisma.playersReport.create({
      data: {
        name: name,
        description: description,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        folderId,
        createdBy: user.userId
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error uploading player report:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
