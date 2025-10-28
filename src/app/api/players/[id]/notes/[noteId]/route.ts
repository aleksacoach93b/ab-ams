import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params
    const body = await request.json()

    if (!id || !noteId) {
      return NextResponse.json(
        { message: 'Player ID and Note ID are required' },
        { status: 400 }
      )
    }

    const { title, content, isVisibleToPlayer, isPinned } = body

    const note = await prisma.playerNote.update({
      where: { 
        id: noteId,
        playerId: id // Ensure the note belongs to the player
      },
      data: {
        title,
        content,
        isVisibleToPlayer,
        isPinned,
        updatedAt: new Date()
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating player note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params

    if (!id || !noteId) {
      return NextResponse.json(
        { message: 'Player ID and Note ID are required' },
        { status: 400 }
      )
    }

    await prisma.playerNote.delete({
      where: { 
        id: noteId,
        playerId: id // Ensure the note belongs to the player
      }
    })

    return NextResponse.json(
      { message: 'Note deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting player note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
