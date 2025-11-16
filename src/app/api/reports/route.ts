import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { NotificationService } from '@/lib/notificationService'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
import { logFileAccess, getClientInfo } from '@/lib/fileAccessLogger'
import { readState, writeState } from '@/lib/localDevStore'
import { put } from '@vercel/blob'

const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN && !LOCAL_DEV_MODE

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Reports fetch request received')
    if (LOCAL_DEV_MODE) {
      // Get query parameters
      const { searchParams } = new URL(request.url)
      const folderId = searchParams.get('folderId')
      
      console.log('📁 LOCAL_DEV_MODE: Fetching reports with folderId:', folderId)
      
      // Verify token
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

      // Only admins and staff with permission can view reports
      if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }

      // Read state
      const state = await readState()
      let reports = state.reports || []
      
      // Filter by folderId
      if (folderId) {
        reports = reports.filter(r => r.folderId === folderId && r.isActive !== false)
      } else {
        // Root level reports (no folder)
        reports = reports.filter(r => (!r.folderId || r.folderId === null) && r.isActive !== false)
      }
      
      console.log(`✅ LOCAL_DEV_MODE: Returning ${reports.length} reports`)
      return NextResponse.json({ reports })
    }
    
    // Prisma handles connection pooling automatically
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

    // Only admins and staff with permission can view reports
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📁 Fetching reports with params:', { folderId, limit, offset })

    // Build where clause for folder filtering
    const whereClause: any = {
      isActive: true
    }
    
    if (folderId) {
      whereClause.folderId = folderId
      console.log('📁 Filtering by folderId:', folderId)
    } else {
      // If no folderId specified, get reports not in any folder (root level)
      whereClause.folderId = null
      console.log('📁 Fetching root level reports (no folder)')
    }

    // Fetch reports
    const reports = await prisma.reports.findMany({
      where: whereClause,
      include: {
        folder: {
          include: {
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    console.log(`✅ Found ${reports.length} reports matching criteria`)

    // Filter reports based on user role and folder access
    let filteredReports = reports
    if (user.role === 'STAFF') {
      // Get the staff member for this user
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.userId }
      })
      
      if (staffMember) {
        // Staff can only see reports from folders they have access to
        filteredReports = reports.filter(report => 
          report.folder && report.folder.visibleToStaff.some(access => 
            access.staffId === staffMember.id && access.canView
          )
        )
      } else {
        filteredReports = []
      }
    }

    // Log file access for each report viewed
    const { ipAddress, userAgent } = getClientInfo(request)
    for (const report of filteredReports) {
      await logFileAccess({
        userId: user.userId,
        fileType: 'REPORT',
        fileId: report.id,
        fileName: report.fileName,
        action: 'VIEW',
        ipAddress,
        userAgent
      })
    }

    return NextResponse.json({ reports: filteredReports })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Report creation request received')
    if (LOCAL_DEV_MODE) {
      // Verify token
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

      // Only admins can create reports
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }

      const formData = await request.formData()
      const name = formData.get('name') as string
      const descriptionRaw = formData.get('description') as string
      const description = descriptionRaw && descriptionRaw.trim() !== '' && descriptionRaw !== 'undefined' ? descriptionRaw : null
      const folderIdRaw = formData.get('folderId') as string
      const file = formData.get('file') as File

      // Convert 'null' string to actual null for root level reports
      const folderId = folderIdRaw === 'null' || folderIdRaw === '' ? null : folderIdRaw

      console.log('📤 LOCAL_DEV_MODE: Upload report data:', { 
        name, 
        description, 
        folderIdRaw, 
        folderId, 
        fileName: file?.name,
        fileType: file?.type 
      })

      if (!name || !file) {
        return NextResponse.json(
          { message: 'Name and file are required' },
          { status: 400 }
        )
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
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'reports')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `report_${timestamp}.${fileExtension}`
      const filePath = join(uploadsDir, fileName)

      // Save file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Create report record in local state
      const fileUrl = `/uploads/reports/${fileName}`
      const reportId = `local-report-${timestamp}`
      
      const state = await readState()
      const newReport = {
        id: reportId,
        name: name,
        description: description || null,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        thumbnailUrl: null,
        folderId,
        createdBy: user.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        folder: null
      }
      
      state.reports.push(newReport)
      await writeState(state)

      console.log('✅ LOCAL_DEV_MODE: Report created:', { 
        id: newReport.id, 
        name: newReport.name, 
        folderId: newReport.folderId,
        fileUrl: newReport.fileUrl 
      })

      return NextResponse.json(newReport, { status: 201 })
    }
    
    // Prisma handles connection pooling automatically
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

    // Only admins can create reports
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const descriptionRaw = formData.get('description') as string
    const description = descriptionRaw && descriptionRaw.trim() !== '' && descriptionRaw !== 'undefined' ? descriptionRaw : null
    const folderIdRaw = formData.get('folderId') as string
    const file = formData.get('file') as File

    // Convert 'null' string to actual null for root level reports
    const folderId = folderIdRaw === 'null' || folderIdRaw === '' ? null : folderIdRaw

    console.log('📤 Upload report data:', { 
      name, 
      description, 
      folderIdRaw, 
      folderId, 
      fileName: file?.name,
      fileType: file?.type 
    })

    if (!name || !file) {
      return NextResponse.json(
        { message: 'Name and file are required' },
        { status: 400 }
      )
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

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `report_${timestamp}.${fileExtension}`
    
    let fileUrl: string

    // Use Vercel Blob Storage in production
    if (USE_BLOB_STORAGE) {
      console.log('📁 Uploading report to Vercel Blob Storage...')
      const bytes = await file.arrayBuffer()
      const blob = await put(`reports/${fileName}`, bytes, {
        access: 'public',
        contentType: file.type,
      })
      fileUrl = blob.url
      console.log('✅ Uploaded to Blob Storage:', fileUrl)
    } else {
      // Fallback to local filesystem
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'reports')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      fileUrl = `/uploads/reports/${fileName}`
      console.log('✅ File saved to disk:', fileUrl)
    }

    // No thumbnail generation - keep it simple
    const thumbnailUrl = null
    
    // Create the report
    const report = await prisma.reports.create({
      data: {
        name: name,
        description: description || null,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        thumbnailUrl,
        folderId,
        createdBy: user.userId,
      },
      include: {
        folder: true
      }
    })

    console.log('✅ Report created:', { 
      id: report.id, 
      name: report.name, 
      folderId: report.folderId,
      fileUrl: report.fileUrl 
    })

    // Create notification for report upload
    try {
      await NotificationService.notifyReportUploaded(report.id, report.name, user.userId)
      console.log('✅ Notification created for report upload')
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError)
      // Don't fail the report creation if notification fails
    }

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error uploading report:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}