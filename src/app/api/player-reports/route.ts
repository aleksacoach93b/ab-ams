import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { put } from '@vercel/blob'

const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN && !LOCAL_DEV_MODE

export async function GET(request: NextRequest) {
  try {
    if (LOCAL_DEV_MODE) {
      const { searchParams } = new URL(request.url)
      const folderId = searchParams.get('folderId')
      
      const state = await readState()
      let reports = state.playerReports || []
      
      // Filter by folderId
      if (folderId) {
        reports = reports.filter(r => r.folderId === folderId)
      } else {
        reports = reports.filter(r => !r.folderId || r.folderId === null)
      }
      
      return NextResponse.json({ reports })
    }
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
            player_report_player_access: {
              include: {
                players: {
                  select: { id: true, firstName: true, lastName: true, email: true }
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
          !report.folder || report.folder.player_report_player_access.some(access => 
            access.playerId === player.id && access.canView
          )
        )
      } else {
        filteredReports = []
      }
    }

    // Transform reports for frontend (use 'name' instead of 'title', add 'folder' relation)
    const transformedReports = filteredReports.map(report => ({
      id: report.id,
      name: report.title, // Transform 'title' to 'name' for frontend compatibility
      description: report.description,
      folderId: report.folderId,
      fileName: report.fileName,
      fileType: report.fileType,
      fileSize: report.fileSize,
      fileUrl: report.fileUrl,
      thumbnailUrl: report.thumbnailUrl,
      createdBy: report.createdBy,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      folder: report.folder ? {
        id: report.folder.id,
        name: report.folder.name,
        description: report.folder.description,
        parentId: report.folder.parentId,
        createdBy: report.folder.createdBy,
        createdAt: report.folder.createdAt.toISOString(),
        updatedAt: report.folder.updatedAt.toISOString(),
        visibleToPlayers: report.folder.player_report_player_access.map(access => ({
          id: access.id,
          playerId: access.playerId,
          canView: access.canView,
          player: access.players ? {
            id: access.players.id,
            name: `${access.players.firstName || ''} ${access.players.lastName || ''}`.trim() || access.players.email,
            email: access.players.email
          } : null
        }))
      } : null
    }))

    return NextResponse.json({ reports: transformedReports })
  } catch (error) {
    console.error('Error fetching player reports:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (LOCAL_DEV_MODE) {
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
      const random = Math.random().toString(36).substring(2, 9)
      const fileName = `${timestamp}-${random}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = join(uploadDir, fileName)
      const fileUrl = `/uploads/player-reports/${fileName}`

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Create report in state
      const reportId = `local-player-report-${timestamp}-${random}`
      const now = new Date().toISOString()
      
      const newReport = {
        id: reportId,
        name: name,
        description: description,
        folderId: folderId,
        fileName: file.name,
        fileUrl: fileUrl,
        fileType: file.type,
        fileSize: file.size,
        thumbnailUrl: null,
        createdBy: 'local-admin',
        createdAt: now,
        updatedAt: now,
        folder: null
      }

      const state = await readState()
      if (!state.playerReports) {
        state.playerReports = []
      }
      state.playerReports.push(newReport)
      await writeState(state)

      console.log(`✅ Created player report ${name} in folder ${folderId || 'root'}`)

      // Return report with folder info
      const reportWithFolder = {
        ...newReport,
        folder: folderId ? {
          id: folderId,
          name: 'Folder',
          description: null,
          parentId: null,
          createdBy: 'local-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } : null
      }

      return NextResponse.json(reportWithFolder, { status: 201 })
    }
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

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    let fileUrl: string

    // Use Vercel Blob Storage in production
    if (USE_BLOB_STORAGE) {
      console.log('📁 Uploading player report to Vercel Blob Storage...')
      const bytes = await file.arrayBuffer()
      const blob = await put(`player-reports/${fileName}`, bytes, {
        access: 'public',
        contentType: file.type,
      })
      fileUrl = blob.url
      console.log('✅ Uploaded to Blob Storage:', fileUrl)
    } else {
      // Fallback to local filesystem
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'player-reports')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }
      const filePath = join(uploadDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      fileUrl = `/uploads/player-reports/${fileName}`
      console.log('✅ File saved to disk:', fileUrl)
    }

    // Generate unique ID for player report
    const reportId = `player_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create report in database (schema uses 'title' not 'name', and requires 'id')
    const report = await prisma.playersReport.create({
      data: {
        id: reportId,
        title: name, // Schema uses 'title' field
        description: description,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        folderId,
        createdBy: user.userId,
        updatedAt: new Date(), // Required field
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error uploading player report:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
