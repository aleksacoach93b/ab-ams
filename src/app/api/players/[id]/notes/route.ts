import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const notes = await prisma.playersNote.findMany({
      where: { playerId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(notes)
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
    const author = await prisma.user.findUnique({
      where: { id: authorId }
    })

    if (!author) {
      return NextResponse.json(
        { message: 'Author not found' },
        { status: 404 }
      )
    }

    const note = await prisma.playersNote.create({
      data: {
        playerId: id,
        authorId,
        title,
        content,
        isVisibleToPlayer: isVisibleToPlayer || false,
        isPinned: isPinned || false
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

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating player note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
