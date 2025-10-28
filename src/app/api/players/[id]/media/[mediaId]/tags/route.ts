import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
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

    const body = await request.json()
    const { tags } = body

    // Verify the media file belongs to this player
    const mediaFile = await prisma.playerMedia.findFirst({
      where: { 
        id: mediaId,
        playerId: playerId
      }
    })

    if (!mediaFile) {
      return NextResponse.json(
        { message: 'Media file not found or does not belong to this player' },
        { status: 404 }
      )
    }

    // Update the media file tags
    const updatedMediaFile = await prisma.playerMedia.update({
      where: { id: mediaId },
      data: { 
        tags: tags && tags.length > 0 ? tags.join(',') : null 
      }
    })

    return NextResponse.json({
      message: 'Media tags updated successfully',
      mediaFile: {
        ...updatedMediaFile,
        tags: updatedMediaFile.tags ? updatedMediaFile.tags.split(',').map(tag => tag.trim()) : []
      }
    })
  } catch (error) {
    console.error('Error updating media tags:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
