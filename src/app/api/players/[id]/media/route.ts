import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logFileAccess, getClientInfo } from '@/lib/fileAccessLogger'
import { NotificationService } from '@/lib/notificationService'
import { verifyToken } from '@/lib/auth'
// import { RealPDFThumbnail } from '@/lib/realPdfThumbnail' // Removed - using client-side thumbnails

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

    // Get player media files from database
    const mediaFiles = await prisma.playerMedia.findMany({
      where: { playerId: id },
      orderBy: { uploadedAt: 'desc' }
    })

    // Transform the response to match frontend expectations
    const transformedMediaFiles = mediaFiles.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.uploadedAt.toISOString(),
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

    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const tags = formData.get('tags') as string

    console.log('📁 Media upload request for player:', id)
    console.log('📁 Files received:', files.length)
    console.log('📁 Tags:', tags)

    // Test database connection
    try {
      console.log('📁 Testing database connection...')
      await prisma.$connect()
      console.log('✅ Database connected successfully')
    } catch (dbError) {
      console.error('💥 Database connection failed:', dbError)
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: 'No files provided' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'players', id)
    
    // Create upload directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      if (file.size === 0) continue

      console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`)

      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = join(uploadDir, fileName)

      console.log(`📁 Generated filename: ${fileName}`)
      console.log(`📁 File path: ${filePath}`)

      let mediaFile
      try {
        // Save file to disk
        console.log(`📁 Saving file to disk...`)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)
        console.log(`✅ File saved to disk successfully`)

        // Note: Thumbnails are generated client-side using PDFThumbnail component
        // No server-side thumbnail generation needed
        let thumbnailUrl = null

        // Save file info to database
        console.log(`📁 Saving file info to database...`)
        mediaFile = await prisma.playerMedia.create({
          data: {
            playerId: id,
            fileName: file.name,
            fileUrl: `/uploads/players/${id}/${fileName}`,
            fileType: file.type,
            fileSize: file.size,
            tags: tags || null,
            thumbnailUrl: thumbnailUrl,
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
        uploadedAt: mediaFile.uploadedAt.toISOString(),
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
