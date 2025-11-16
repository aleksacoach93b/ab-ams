import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logFileAccess, getClientInfo } from '@/lib/fileAccessLogger'
import { NotificationService } from '@/lib/notificationService'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'
import { put } from '@vercel/blob'
// import { RealPDFThumbnail } from '@/lib/realPdfThumbnail' // Removed - using client-side thumbnails

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN && !LOCAL_DEV_MODE

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Local dev mode: return mock data (no auth required)
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      // Get media files from state (we'll store them in state)
      let mediaFiles = state.playerMediaFiles?.[id] || []
      
      // Remove duplicates by ID
      const uniqueFiles = []
      const seenIds = new Set()
      for (const file of mediaFiles) {
        if (!seenIds.has(file.id)) {
          seenIds.add(file.id)
          uniqueFiles.push(file)
        }
      }
      
      // Update state if duplicates were found
      if (uniqueFiles.length !== mediaFiles.length) {
        state.playerMediaFiles[id] = uniqueFiles
        await writeState(state)
      }
      
      return NextResponse.json(uniqueFiles)
    }

    // Check authentication for database mode
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

    // Get player media files from database
    const mediaFiles = await prisma.player_media.findMany({
      where: { playerId: id },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the response to match frontend expectations
    const transformedMediaFiles = mediaFiles.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.createdAt.toISOString(),
      tags: file.tags ? file.tags.split(',').map(tag => tag.trim()) : []
    }))

    // Log file access for each media file viewed
    const { ipAddress, userAgent } = getClientInfo(request)
    for (const file of mediaFiles) {
      await logFileAccess({
        userId: user.userId,
        fileType: 'PLAYER_MEDIA',
        fileId: file.id,
        fileName: file.fileName,
        action: 'VIEW',
        ipAddress,
        userAgent
      })
    }

    console.log('📁 Returning media files:', transformedMediaFiles)
    return NextResponse.json(transformedMediaFiles)
  } catch (error) {
    console.error('Error fetching player media:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const tags = formData.get('tags') as string

    console.log('📁 Media upload request for player:', id)
    console.log('📁 Files received:', files.length)
    console.log('📁 Tags:', tags)

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: 'No files provided' },
        { status: 400 }
      )
    }

    // Local dev mode: save to state and disk
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      if (!state.playerMediaFiles) {
        state.playerMediaFiles = {}
      }
      if (!state.playerMediaFiles[id]) {
        state.playerMediaFiles[id] = []
      }

      const uploadDir = join(process.cwd(), 'public', 'uploads', 'players', id)
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      const uploadedFiles = []
      const existingIds = new Set(state.playerMediaFiles[id].map(f => f.id))

      for (const file of files) {
        if (file.size === 0) continue

        // Generate unique filename with timestamp + random
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 9)
        const fileName = `${timestamp}-${random}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = join(uploadDir, fileName)

        // Save file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        const fileUrl = `/uploads/players/${id}/${fileName}`
        
        // Generate unique ID - ensure it doesn't exist
        let mediaId = `media_${id}_${timestamp}_${random}`
        let attempts = 0
        while (existingIds.has(mediaId) && attempts < 10) {
          mediaId = `media_${id}_${timestamp}_${random}_${attempts}`
          attempts++
        }
        existingIds.add(mediaId)
        
        const mediaFile = {
          id: mediaId,
          fileName: file.name,
          fileUrl: fileUrl,
          fileType: file.type,
          fileSize: file.size,
          thumbnailUrl: null, // Thumbnails generated client-side
          uploadedAt: new Date().toISOString(),
          tags: tags ? tags.split(',').map(tag => tag.trim()) : []
        }

        state.playerMediaFiles[id].push(mediaFile)
        uploadedFiles.push(mediaFile)
      }

      await writeState(state)
      
      // Send notification to player
      try {
        const { createNotification } = await import('@/lib/localDevStore')
        const playerUser = state.playerUsers.find((u: any) => u.playerId === id)
        const playerUserId = playerUser?.id
        
        if (playerUserId) {
          await createNotification({
            title: 'New Media Uploaded',
            message: `${uploadedFiles.length} file(s) have been added to your profile`,
            type: 'INFO',
            category: 'PLAYER',
            userIds: [playerUserId],
            relatedId: id,
            relatedType: 'player'
          })
          console.log(`📱 Sent media upload notification to player ${id}`)
        }
      } catch (notificationError) {
        console.error('❌ Error creating media notification:', notificationError)
        // Don't fail upload if notification fails
      }
      
      return NextResponse.json(uploadedFiles, { status: 201 })
    }

    // Database mode
    // Check if player exists
    const player = await prisma.players.findUnique({
      where: { id }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    const uploadedFiles = []

    for (const file of files) {
      if (file.size === 0) continue

      console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`)

      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      let fileUrl: string

      // Use Vercel Blob Storage in production
      if (USE_BLOB_STORAGE) {
        console.log(`📁 Uploading to Vercel Blob Storage...`)
        const bytes = await file.arrayBuffer()
        const blob = await put(`players/${id}/${fileName}`, bytes, {
          access: 'public',
          contentType: file.type,
        })
        fileUrl = blob.url
        console.log(`✅ Uploaded to Blob Storage:`, fileUrl)
      } else {
        // Fallback to local filesystem
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'players', id)
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }
        const filePath = join(uploadDir, fileName)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)
        fileUrl = `/uploads/players/${id}/${fileName}`
        console.log(`✅ File saved to disk:`, fileUrl)
      }

      // Note: Thumbnails are generated client-side using PDFThumbnail component
      // No server-side thumbnail generation needed
      let thumbnailUrl = null

      let mediaFile
      try {
        // Save file info to database
        console.log(`📁 Saving file info to database...`)
        mediaFile = await prisma.player_media.create({
          data: {
            id: `media_${id}_${timestamp}`,
            playerId: id,
            fileName: file.name,
            fileUrl: fileUrl,
            fileType: file.type,
            fileSize: file.size,
            tags: tags || null,
            thumbnailUrl: thumbnailUrl,
            updatedAt: new Date(),
          }
        })
        console.log(`✅ File info saved to database:`, mediaFile.id)

        // Log file upload
        const { ipAddress, userAgent } = getClientInfo(request)
        await logFileAccess({
          userId: 'system', // We don't have user context in this endpoint yet
          fileType: 'PLAYER_MEDIA',
          fileId: mediaFile.id,
          fileName: mediaFile.fileName,
          action: 'UPLOAD',
          ipAddress,
          userAgent
        })
      } catch (fileError) {
        console.error(`💥 Error processing file ${file.name}:`, fileError)
        throw fileError
      }

      uploadedFiles.push({
        id: mediaFile.id,
        fileName: mediaFile.fileName,
        fileUrl: mediaFile.fileUrl,
        fileType: mediaFile.fileType,
        fileSize: mediaFile.fileSize,
        thumbnailUrl: mediaFile.thumbnailUrl,
        uploadedAt: mediaFile.createdAt.toISOString(),
        tags: mediaFile.tags ? mediaFile.tags.split(',').map(tag => tag.trim()) : [],
      })
    }

    console.log('✅ Successfully uploaded files:', uploadedFiles.length)
    console.log('✅ Uploaded files details:', uploadedFiles)

    // Create notification for player media upload
    try {
      const token = request.headers.get('authorization')?.replace('Bearer ', '')
      if (token) {
        const user = await verifyToken(token)
        if (user) {
          await NotificationService.notifyPlayerMediaUploaded(
            player.id,
            player.name,
            uploadedFiles.length,
            user.userId
          )
          console.log('✅ Notification created for player media upload')
        }
      }
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError)
      // Don't fail the upload if notification fails
    }

    return NextResponse.json(uploadedFiles, { status: 201 })
  } catch (error) {
    console.error('💥 Error uploading files:', error)
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    // Return a proper error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorResponse = { 
      message: 'Failed to upload files', 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
    
    console.log('💥 Returning error response:', errorResponse)
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
