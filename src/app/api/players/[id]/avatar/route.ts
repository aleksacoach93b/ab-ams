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
    const { id } = await params

    console.log('📸 Avatar upload request for player:', id)

    if (!id) {
      console.log('❌ No player ID provided')
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    console.log('📸 File received:', file ? { name: file.name, size: file.size, type: file.type } : 'No file')

    if (!file) {
      console.log('❌ No file uploaded')
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Local dev mode: save to state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `player_${id}_${timestamp}.${fileExtension}`
      const filePath = join(uploadsDir, fileName)

      // Save file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      const avatarUrl = `/uploads/avatars/${fileName}`
      
      // Update state
      state.playerAvatars[id] = avatarUrl
      await writeState(state)

      return NextResponse.json({
        message: 'Avatar uploaded successfully',
        avatar: avatarUrl,
        player: { id, imageUrl: avatarUrl }
      })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `player_${id}_${timestamp}.${fileExtension}`
    
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
      // Fallback to local filesystem (for local dev or if blob storage not configured)
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      avatarUrl = `/uploads/avatars/${fileName}`
    }

    // Update player avatar in database
    console.log('📸 Updating player with avatar URL:', avatarUrl)
    
    const updatedPlayer = await prisma.players.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    })

    console.log('✅ Avatar upload successful:', updatedPlayer)

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl,
      imageUrl: avatarUrl, // For backward compatibility
      player: {
        id: updatedPlayer.id,
        name: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
        imageUrl: avatarUrl,
        avatar: avatarUrl,
      },
    })
  } catch (error) {
    console.error('💥 Error uploading avatar:', error)
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to upload avatar', 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
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
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Get current player to find avatar path
    const player = await prisma.players.findUnique({
      where: { id },
      select: { avatar: true },
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Remove avatar from database
    const updatedPlayer = await prisma.players.update({
      where: { id },
      data: { avatar: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    })

    // Optionally delete the file from blob storage or disk
    if (player.avatar) {
      try {
        // If it's a blob storage URL, we could delete it, but for now just remove from DB
        // Vercel Blob Storage has automatic cleanup for old files
        if (!player.avatar.startsWith('http')) {
          // Local file - try to delete
          const { unlink } = await import('fs/promises')
          const filePath = join(process.cwd(), 'public', player.avatar)
          if (existsSync(filePath)) {
            await unlink(filePath)
          }
        }
      } catch (fileError) {
        console.error('Error deleting avatar file:', fileError)
        // Don't fail the request if file deletion fails
      }
    }

    return NextResponse.json({
      message: 'Avatar removed successfully',
      player: updatedPlayer,
    })
  } catch (error) {
    console.error('Error removing avatar:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
