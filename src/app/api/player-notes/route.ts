import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, status, reason, notes, createdBy } = body

    // Validate required fields
    if (!playerId || !status || !reason || !createdBy) {
      return NextResponse.json(
        { message: 'Player ID, status, reason, and createdBy are required' },
        { status: 400 }
      )
    }

    // Get player info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { name: true }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Get today's date (YYYY-MM-DD format)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert daily notes (update if exists for today, create if not)
    const dailyNote = await prisma.dailyPlayerNotes.upsert({
      where: {
        date_playerId: {
          date: today,
          playerId: playerId
        }
      },
      update: {
        status,
        reason,
        notes: notes || null,
        updatedAt: new Date()
      },
      create: {
        date: today,
        playerId,
        playerName: player.name,
        status,
        reason,
        notes: notes || null,
        createdBy
      }
    })

    console.log('✅ Daily player notes saved:', dailyNote.id)

    return NextResponse.json({
      message: 'Daily notes saved successfully',
      data: dailyNote
    })

  } catch (error) {
    console.error('Error saving daily player notes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const date = searchParams.get('date')

    let whereClause: any = {}

    if (playerId) {
      whereClause.playerId = playerId
    }

    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      whereClause.date = targetDate
    }

    const notes = await prisma.dailyPlayerNotes.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            availabilityStatus: true
          }
        }
      }
    })

    return NextResponse.json(notes)

  } catch (error) {
    console.error('Error fetching daily player notes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
