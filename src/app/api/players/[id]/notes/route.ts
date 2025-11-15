import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    // Local dev mode: return notes from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const notes = state.playerNotes?.[id] || []
      // Get user from token to return proper author name
      const token = request.headers.get('authorization')?.replace('Bearer ', '')
      if (token) {
        try {
          const currentUser = await verifyToken(token)
          if (currentUser) {
            // Update notes to use current user as author
            const updatedNotes = notes.map((note: any) => ({
              ...note,
              author: {
                id: currentUser.userId,
                name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
                email: currentUser.email
              }
            }))
            return NextResponse.json(updatedNotes)
          }
        } catch (e) {
          // If token verification fails, return notes as-is
        }
      }
      return NextResponse.json(notes)
    }

    // Check authentication for database mode
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

    const notes = await prisma.player_notes.findMany({
      where: { playerId: id },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    // Fetch author data for each note
    const notesWithAuthors = await Promise.all(notes.map(async (note) => {
      const author = await prisma.users.findUnique({
        where: { id: note.createdBy },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      })
      
      return {
        id: note.id,
        playerId: note.playerId,
        title: note.title,
        content: note.content,
        type: note.type,
        isVisibleToPlayer: false, // Not in schema, default to false
        isPinned: false, // Not in schema, default to false
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        author: author ? {
          id: author.id,
          name: `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email,
          email: author.email
        } : null
      }
    }))

    return NextResponse.json(notesWithAuthors)
  } catch (error) {
    console.error('Error fetching player notes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (LOCAL_DEV_MODE) {
      const { id } = await params
      const body = await request.json()
      const { title, content, isVisibleToPlayer, isPinned, authorId } = body
      if (!id) {
        return NextResponse.json({ message: 'Player ID is required' }, { status: 400 })
      }
      if (!content || !authorId) {
        return NextResponse.json({ message: 'Content and author ID are required' }, { status: 400 })
      }
      
      // Get user from token to return proper author name
      const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                   request.cookies.get('token')?.value
      let authorName = 'Local Admin'
      let authorEmail = 'admin@localhost.com'
      
      if (token) {
        try {
          const currentUser = await verifyToken(token)
          if (currentUser) {
            authorName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email
            authorEmail = currentUser.email
          }
        } catch (e) {
          // If token verification fails, use default
        }
      }
      
      const state = await readState()
      if (!state.playerNotes) {
        state.playerNotes = {}
      }
      if (!state.playerNotes[id]) {
        state.playerNotes[id] = []
      }
      
      const now = new Date().toISOString()
      const note = {
        id: `local-note-${Date.now()}`,
        playerId: id,
        createdBy: authorId,
        title: title || null,
        content,
        type: 'GENERAL',
        isVisibleToPlayer: !!isVisibleToPlayer,
        isPinned: !!isPinned,
        createdAt: now,
        updatedAt: now,
        author: { id: authorId, name: authorName, email: authorEmail }
      }
      
      state.playerNotes[id].push(note)
      await writeState(state)
      
      return NextResponse.json(note, { status: 201 })
    }
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const { title, content, isVisibleToPlayer, isPinned, authorId } = body

    console.log('Creating note with data:', { title, content, isVisibleToPlayer, isPinned, authorId, playerId: id })

    if (!content || !authorId) {
      return NextResponse.json(
        { message: 'Content and author ID are required' },
        { status: 400 }
      )
    }

    // Check if player exists
    const player = await prisma.players.findUnique({
      where: { id }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Check if author exists
    const author = await prisma.users.findUnique({
      where: { id: authorId }
    })

    if (!author) {
      return NextResponse.json(
        { message: 'Author not found' },
        { status: 404 }
      )
    }

    const note = await prisma.player_notes.create({
      data: {
        id: `note_${id}_${Date.now()}`,
        playerId: id,
        createdBy: authorId,
        title: title || '',
        content,
        type: 'GENERAL',
        updatedAt: new Date(),
      }
    })

    // Return note with author info
    return NextResponse.json({
      id: note.id,
      playerId: note.playerId,
      title: note.title,
      content: note.content,
      type: note.type,
      isVisibleToPlayer: false,
      isPinned: false,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      author: {
        id: author.id,
        name: `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email,
        email: author.email
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating player note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
