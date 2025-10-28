import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('📁 File upload API called')
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    console.log('🔑 Token found, verifying...')
    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ Invalid token')
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.userId)

    console.log('📋 Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatRoomId = formData.get('chatRoomId') as string

    console.log('📄 File info:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      chatRoomId 
    })

    if (!file) {
      console.log('❌ No file provided')
      return NextResponse.json({ message: 'No file provided' }, { status: 400 })
    }

    if (!chatRoomId) {
      console.log('❌ No chat room ID provided')
      return NextResponse.json({ message: 'No chat room ID provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        message: 'File type not allowed. Allowed types: PDF, images, Word documents, text files' 
      }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        message: 'File too large. Maximum size is 10MB' 
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `chat-${chatRoomId}-${timestamp}-${user.userId}.${fileExtension}`

    console.log('📝 Generated filename:', fileName)
    console.log('💾 Starting local file upload...')

    // Create upload directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'chat')
    await mkdir(uploadsDir, { recursive: true })

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Write file to disk
    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    // Generate public URL
    const fileUrl = `/uploads/chat/${fileName}`

    console.log('✅ Upload successful!', { url: fileUrl })

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

  } catch (error) {
    console.error('❌ Error uploading file:', error)
    console.error('❌ Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
