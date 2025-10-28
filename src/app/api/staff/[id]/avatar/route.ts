import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params
    const formData = await request.formData()
    const file = formData.get('avatar') as File

    console.log('📸 Staff avatar upload request:', { staffId, fileName: file?.name })

    if (!file) {
      console.log('❌ No file provided')
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', file.type)
      return NextResponse.json(
        { message: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log('❌ File too large:', file.size)
      return NextResponse.json(
        { message: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Check if staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId }
    })

    if (!staff) {
      console.log('❌ Staff member not found:', staffId)
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
      console.log('✅ Created uploads directory')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `staff_${staffId}_${timestamp}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)
    const fileUrl = `/uploads/avatars/${fileName}`

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    console.log('✅ File saved:', filePath)

    // Update staff member with new avatar
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { imageUrl: fileUrl },
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    })

    console.log('✅ Staff avatar updated successfully:', updatedStaff)

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      imageUrl: fileUrl,
      staff: updatedStaff
    })
  } catch (error) {
    console.error('❌ Error uploading staff avatar:', error)
    return NextResponse.json(
      { 
        message: 'Failed to upload avatar', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params

    console.log('🗑️ Removing staff avatar:', staffId)

    // Check if staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, imageUrl: true }
    })

    if (!staff) {
      console.log('❌ Staff member not found:', staffId)
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Remove imageUrl from database
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { imageUrl: null },
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    })

    // Optionally delete the file from disk
    if (staff.imageUrl) {
      try {
        const filePath = join(process.cwd(), 'public', staff.imageUrl)
        if (existsSync(filePath)) {
          const { unlink } = await import('fs/promises')
          await unlink(filePath)
          console.log('✅ Deleted file from disk:', filePath)
        }
      } catch (fileError) {
        console.log('⚠️ Warning: Could not delete file from disk:', fileError)
        // Don't fail the request if file deletion fails
      }
    }

    console.log('✅ Staff avatar removed successfully:', updatedStaff)

    return NextResponse.json({
      message: 'Avatar removed successfully',
      staff: updatedStaff
    })
  } catch (error) {
    console.error('❌ Error removing staff avatar:', error)
    return NextResponse.json(
      { 
        message: 'Failed to remove avatar', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
