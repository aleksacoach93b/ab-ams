import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get player info
    const player = await prisma.players.findUnique({
      where: { id: playerId },
      select: { name: true }
    })

    if (!player) {
      return NextResponse.json({ message: 'Player not found' }, { status: 404 })
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    try {
      // Fetch CSV data from external wellness app
      const csvUrl = 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv'
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        console.error('Failed to fetch wellness CSV data:', response.status)
        // Fallback to local database check
        const wellnessCompletion = await prisma.wellnessCompletion.findUnique({
          where: {
            date_playerId: {
              date: today,
              playerId: playerId,
            },
          },
        })
        return NextResponse.json({ 
          completed: !!wellnessCompletion?.completed,
          date: today,
          playerId: playerId,
          source: 'local_fallback'
        })
      }

      const csvText = await response.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'csv_empty'
        })
      }

      // Parse CSV header
      const headers = lines[0].split(',')
      const playerNameIndex = headers.findIndex(h => h === 'playerName')
      const submittedAtIndex = headers.findIndex(h => h === 'submittedAt')
      
      if (playerNameIndex === -1 || submittedAtIndex === -1) {
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'csv_invalid'
        })
      }

      // Check if player has completed survey today
      let completedToday = false
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',')
        if (row.length < headers.length) continue

        const playerName = row[playerNameIndex]?.replace(/"/g, '').trim()
        const submittedAt = row[submittedAtIndex]?.replace(/"/g, '').trim()

        if (!playerName || !submittedAt) continue

        // Check if this is the current player
        if (playerName.toLowerCase() === player.name.toLowerCase()) {
          // Parse date from submittedAt (format: "10/1/2025, 12:09:31 PM")
          try {
            const datePart = submittedAt.split(',')[0] // "10/1/2025"
            const [month, day, year] = datePart.split('/')
            const surveyDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            
            // Check if survey was completed today
            if (surveyDate === today) {
              completedToday = true
              break
            }
          } catch (error) {
            console.error('Error parsing date:', submittedAt, error)
            continue
          }
        }
      }

      return NextResponse.json({ 
        completed: completedToday,
        date: today,
        playerId: playerId,
        playerName: player.name,
        source: 'csv_live'
      })

    } catch (csvError) {
      console.error('Error fetching wellness CSV:', csvError)
      // Fallback to local database check
      const wellnessCompletion = await prisma.wellnessCompletion.findUnique({
        where: {
          date_playerId: {
            date: today,
            playerId: playerId,
          },
        },
      })
      return NextResponse.json({ 
        completed: !!wellnessCompletion?.completed,
        date: today,
        playerId: playerId,
        source: 'local_fallback'
      })
    }
  } catch (error) {
    console.error('Error checking wellness status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Mark wellness survey as completed for today
    const wellnessCompletion = await prisma.wellnessCompletion.upsert({
      where: {
        date_playerId: {
          date: today,
          playerId: playerId,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
      create: {
        playerId: playerId,
        date: today,
        completed: true,
        completedAt: new Date(),
      },
    })

    return NextResponse.json(wellnessCompletion)
  } catch (error) {
    console.error('Error marking wellness as completed:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}