import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { readState, writeState } from '@/lib/localDevStore'
import { put } from '@vercel/blob'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN && !LOCAL_DEV_MODE

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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type)
      return NextResponse.json(
        { message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
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

    // Local dev mode: save to state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffIndex = state.staff?.findIndex(s => s.id === staffId)
      
      if (staffIndex === undefined || staffIndex === -1) {
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
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `staff_${staffId}_${timestamp}.${fileExtension}`
      const filePath = join(uploadsDir, fileName)

      // Save file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      const avatarUrl = `/uploads/avatars/${fileName}`
      
      // Update staff in state
      state.staff[staffIndex].imageUrl = avatarUrl
      await writeState(state)

      return NextResponse.json({
        message: 'Avatar uploaded successfully',
        imageUrl: avatarUrl,
        staff: {
          id: staffId,
          name: state.staff[staffIndex].name,
          imageUrl: avatarUrl
        }
      })
    }

    // Check if staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    })

    if (!staff) {
      console.log('❌ Staff member not found:', staffId)
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `staff_${staffId}_${timestamp}.${fileExtension}`
    
    let avatarUrl: string

    // Use Vercel Blob Storage in production
    if (USE_BLOB_STORAGE) {
      console.log('📸 Uploading to Vercel Blob Storage...')
      const bytes = await file.arrayBuffer()
      const blob = await put(`avatars/${fileName}`, bytes, {
        access: 'public',
        contentType: file.type,
      })
      avatarUrl = blob.url
      console.log('✅ Uploaded to Blob Storage:', avatarUrl)
    } else {
      // Fallback to local filesystem
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
        console.log('✅ Created uploads directory')
      }
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      avatarUrl = `/uploads/avatars/${fileName}`
      console.log('✅ File saved to disk:', avatarUrl)
    }

    // Update staff member with new avatar
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    })

    console.log('✅ Staff avatar updated successfully:', updatedStaff)

    const fullName = `${updatedStaff.firstName} ${updatedStaff.lastName}`.trim()
    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      imageUrl: avatarUrl,
      avatar: avatarUrl, // For backward compatibility
      staff: {
        id: updatedStaff.id,
        name: fullName,
        imageUrl: avatarUrl,
        avatar: avatarUrl
      }
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

    // Local dev mode: delete from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffIndex = state.staff?.findIndex(s => s.id === staffId)
      
      if (staffIndex === undefined || staffIndex === -1) {
        console.log('❌ Staff member not found:', staffId)
        return NextResponse.json(
          { message: 'Staff member not found' },
          { status: 404 }
        )
      }

      const staff = state.staff[staffIndex]

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

      // Remove imageUrl from state
      state.staff[staffIndex].imageUrl = null
      await writeState(state)

      return NextResponse.json({
        message: 'Avatar removed successfully',
        staff: {
          id: staffId,
          name: staff.name,
          imageUrl: null
        }
      })
    }

    // Check if staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, firstName: true, lastName: true, avatar: true }
    })

    if (!staff) {
      console.log('❌ Staff member not found:', staffId)
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Remove avatar from database
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { avatar: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    })

    // Optionally delete the file from blob storage or disk
    if (staff.avatar) {
      try {
        // If it's a blob storage URL, we could delete it, but for now just remove from DB
        // Vercel Blob Storage has automatic cleanup for old files
        if (!staff.avatar.startsWith('http')) {
          // Local file - try to delete
          const { unlink } = await import('fs/promises')
          const filePath = join(process.cwd(), 'public', staff.avatar)
          if (existsSync(filePath)) {
            await unlink(filePath)
            console.log('✅ Deleted file from disk:', filePath)
          }
        }
      } catch (fileError) {
        console.log('⚠️ Warning: Could not delete file:', fileError)
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
