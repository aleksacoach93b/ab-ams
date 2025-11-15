import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { verifyToken } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (LOCAL_DEV_MODE) {
      return NextResponse.json([])
    }
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    const mediaFiles = await prisma.eventMedia.findMany({
      where: { 
        eventId: id
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    // Transform response to match frontend expectations
    const transformedMedia = mediaFiles.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
      uploadedAt: file.uploadedAt.toISOString(),
    }))

    console.log('📁 Returning event media files:', transformedMedia)

    return NextResponse.json(transformedMedia)
  } catch (error) {
    console.error('Error fetching event media:', error)
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
    if (LOCAL_DEV_MODE) {
      const { id } = await params
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
      }
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'events')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `event_${id}_${timestamp}.${fileExtension}`
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      const fileUrl = `/uploads/events/${fileName}`
      return NextResponse.json({
        message: 'Media uploaded successfully (local mode)',
        media: {
          id: `local-${timestamp}`,
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        }
      }, { status: 201 })
    }
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Check authentication and permissions
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

    // Check if user has permission to upload media
    if (user.role === 'PLAYER') {
      return NextResponse.json(
        { message: 'Players are not allowed to upload event media' },
        { status: 403 }
      )
    }

    // For staff, check if they have event management permissions
    if (user.role === 'STAFF') {
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.id },
        select: { canEditEvents: true }
      })
      
      if (!staffMember?.canEditEvents) {
        return NextResponse.json(
          { message: 'Insufficient permissions to upload event media' },
          { status: 403 }
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only images, videos, audio, documents, and archives are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'events')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `event_${id}_${timestamp}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Determine media type
    let mediaType = 'OTHER'
    if (file.type.startsWith('image/')) {
      mediaType = 'IMAGE'
    } else if (file.type.startsWith('video/')) {
      mediaType = 'VIDEO'
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'AUDIO'
    } else if (file.type === 'application/pdf' || file.type.includes('document') || file.type === 'text/plain') {
      mediaType = 'DOCUMENT'
    }

    // Save media record to database
    const fileUrl = `/uploads/events/${fileName}`
    const newMedia = await prisma.eventMedia.create({
      data: {
        eventId: id,
        fileName: file.name,
        fileUrl: fileUrl,
        fileType: file.type,
        fileSize: file.size,
      },
    })

    // Transform response to match frontend expectations
    const transformedMedia = {
      id: newMedia.id,
      fileName: newMedia.fileName,
      fileUrl: newMedia.fileUrl,
      fileType: newMedia.fileType,
      fileSize: newMedia.fileSize,
      uploadedAt: newMedia.uploadedAt.toISOString(),
    }

    console.log('✅ Event media upload successful:', transformedMedia)

    // Create notification for event media upload
    try {
      await NotificationService.notifyEventMediaUploaded(
        id,
        newMedia.fileName,
        user.userId
      )
      console.log('✅ Notification created for event media upload')
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError)
      // Don't fail the upload if notification fails
    }

    return NextResponse.json({
      message: 'Media uploaded successfully',
      media: transformedMedia,
    })
  } catch (error) {
    console.error('Error uploading event media:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
