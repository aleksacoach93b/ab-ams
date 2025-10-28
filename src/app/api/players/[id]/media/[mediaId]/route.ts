import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id: playerId, mediaId } = await params

    if (!playerId || !mediaId) {
      return NextResponse.json(
        { message: 'Player ID and Media ID are required' },
        { status: 400 }
      )
    }

    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Get the media file record
    const mediaFile = await prisma.playerMedia.findUnique({
      where: { id: mediaId }
    })

    if (!mediaFile) {
      return NextResponse.json(
        { message: 'Media file not found' },
        { status: 404 }
      )
    }

    // Verify the media file belongs to this player
    if (mediaFile.playerId !== playerId) {
      return NextResponse.json(
        { message: 'Media file does not belong to this player' },
        { status: 403 }
      )
    }

    // Delete the file from disk
    try {
      const filePath = join(process.cwd(), 'public', mediaFile.fileUrl)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Failed to delete file from disk:', fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete the media record from database
    await prisma.playerMedia.delete({
      where: { id: mediaId }
    })

    return NextResponse.json(
      { message: 'Media file deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting media file:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}