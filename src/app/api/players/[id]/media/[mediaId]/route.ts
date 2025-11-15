import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    // Local dev mode: delete from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      if (state.playerMediaFiles?.[playerId]) {
        const mediaFile = state.playerMediaFiles[playerId].find((f: any) => f.id === mediaId)
        
        if (mediaFile) {
          // Delete file from disk
          try {
            const filePath = join(process.cwd(), 'public', mediaFile.fileUrl)
            await unlink(filePath)
          } catch (fileError) {
            console.warn('Failed to delete file from disk:', fileError)
          }

          // Remove from state
          state.playerMediaFiles[playerId] = state.playerMediaFiles[playerId].filter((f: any) => f.id !== mediaId)
          await writeState(state)
        }
      }

      return NextResponse.json(
        { message: 'Media file deleted successfully' },
        { status: 200 }
      )
    }

    // Check if player exists
    const player = await prisma.players.findUnique({
      where: { id: playerId }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Get the media file record
    const mediaFile = await prisma.player_media.findUnique({
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
    await prisma.player_media.delete({
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