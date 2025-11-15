import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

async function getWellnessSettings() {
  if (LOCAL_DEV_MODE) {
    const state = await readState()
    return state.wellnessSettings || {
      csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
      surveyId: 'cmg6klyig0004l704u1kd78zb',
      baseUrl: 'https://wellness-monitor-tan.vercel.app'
    }
  }
  // Production mode - would use database
  return {
    csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
    surveyId: 'cmg6klyig0004l704u1kd78zb',
    baseUrl: 'https://wellness-monitor-tan.vercel.app'
  }
}

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

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Get player info
    let playerName: string
    
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const player = state.players.find((p: any) => p.id === playerId)
      if (!player) {
        return NextResponse.json({ message: 'Player not found' }, { status: 404 })
      }
      playerName = player.name
    } else {
      const player = await prisma.players.findUnique({
        where: { id: playerId },
        select: { name: true }
      })
      if (!player) {
        return NextResponse.json({ message: 'Player not found' }, { status: 404 })
      }
      playerName = player.name
    }

    try {
      // Get wellness settings (CSV URL)
      const wellnessSettings = await getWellnessSettings()
      const csvUrl = wellnessSettings.csvUrl
      
      console.log(`🔍 [WELLNESS] Fetching CSV from: ${csvUrl}`)
      
      // Fetch CSV data from external wellness app
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        console.error('Failed to fetch wellness CSV data:', response.status)
        // Fallback - if LOCAL_DEV_MODE, return false; otherwise check database
        if (LOCAL_DEV_MODE) {
          return NextResponse.json({ 
            completed: false,
            date: today,
            playerId: playerId,
            source: 'local_dev_fallback'
          })
        }
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

      // Parse CSV header - handle quoted strings properly
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const playerNameIndex = headers.findIndex(h => h === 'playerName')
      const submittedAtIndex = headers.findIndex(h => h === 'submittedAt')
      
      if (playerNameIndex === -1 || submittedAtIndex === -1) {
        console.error('CSV headers missing playerName or submittedAt', headers)
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
        const row = parseCSVLine(lines[i])
        if (row.length < headers.length) continue

        const rowPlayerName = row[playerNameIndex]?.replace(/^"|"$/g, '').trim()
        const submittedAt = row[submittedAtIndex]?.replace(/^"|"$/g, '').trim()

        if (!rowPlayerName || !submittedAt) continue

        // Check if this is the current player (case-insensitive)
        if (rowPlayerName.toLowerCase() === playerName.toLowerCase()) {
          // Parse date from submittedAt (format: "10/1/2025, 12:09:31 PM" or "10/1/2025, 12:09:31 PM")
          try {
            const datePart = submittedAt.split(',')[0].trim() // "10/1/2025"
            const [month, day, year] = datePart.split('/')
            const surveyDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            
            // Check if survey was completed today
            if (surveyDate === today) {
              completedToday = true
              console.log(`✅ Player ${playerName} completed wellness survey today (${surveyDate})`)
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
        playerName: playerName,
        source: 'csv_live'
      })

    } catch (csvError) {
      console.error('Error fetching wellness CSV:', csvError)
      // Fallback - if LOCAL_DEV_MODE, return false; otherwise check database
      if (LOCAL_DEV_MODE) {
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'local_dev_error_fallback'
        })
      }
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