import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Only ADMIN can delete coach notes
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Local dev mode
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const noteIndex = state.coachNotes?.findIndex((n: any) => n.id === id)
      
      if (noteIndex === undefined || noteIndex === -1) {
        return NextResponse.json(
          { message: 'Note not found' },
          { status: 404 }
        )
      }

      state.coachNotes.splice(noteIndex, 1)
      await writeState(state)

      return NextResponse.json({ message: 'Note deleted successfully' })
    }

    // Production mode: use database
    // Check if note exists
    const note = await prisma.coach_notes.findUnique({
      where: { id }
    })

    if (!note) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      )
    }

    // Check if user is the author or admin
    if (user.role !== 'ADMIN' && note.authorId !== user.userId) {
      return NextResponse.json(
        { message: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Delete the note (cascade will handle related records)
    await prisma.coach_notes.delete({
      where: { id }
    })

    console.log('✅ Coach note deleted successfully:', id)

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting coach note:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
