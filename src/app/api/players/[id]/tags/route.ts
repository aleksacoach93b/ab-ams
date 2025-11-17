import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Get all media files for this player
    const mediaFiles = await prisma.player_media.findMany({
      where: { playerId: id },
      select: { tags: true }
    })

    // Extract all unique tags
    const allTags = new Set<string>()
    mediaFiles.forEach(file => {
      if (file.tags) {
        file.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim()
          if (trimmedTag) {
            allTags.add(trimmedTag)
          }
        })
      }
    })

    const uniqueTags = Array.from(allTags).sort()

    return NextResponse.json({ tags: uniqueTags })
  } catch (error) {
    console.error('Error fetching player tags:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
