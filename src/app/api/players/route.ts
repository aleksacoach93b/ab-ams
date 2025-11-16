export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readState, writeState, initializePlayerUsers, type StoredPlayer, type StoredPlayerUser } from '@/lib/localDevStore'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Players fetch request received')
    if (LOCAL_DEV_MODE) {
      // Initialize player users if needed
      await initializePlayerUsers()
      const state = await readState()
      
      // Return ONLY players from state.players - no hardcoded defaults!
      const now = new Date().toISOString()
      
      const transformedPlayers = state.players.map((playerData) => {
        const [firstName, ...rest] = playerData.name.split(' ')
        const lastName = rest.join(' ')
        
        // Find associated user account
        const playerUser = state.playerUsers.find(u => u.playerId === playerData.id)
        
        // Use status from playerData, or default to FULLY_AVAILABLE if not set
        // This ensures that manually set statuses are preserved
        const playerStatus = playerData.status || 'FULLY_AVAILABLE'
        
        return {
          id: playerData.id,
          firstName,
          lastName,
          name: playerData.name,
          email: playerData.email,
          position: playerData.position || '',
          status: playerStatus,
          availabilityStatus: playerStatus, // Use same status for both fields
          matchDayTag: state.playerTags[playerData.id] ?? null,
          teamId: 'team-sepsi',
          imageUrl: state.playerAvatars[playerData.id] ?? null,
          phone: '',
          dateOfBirth: null,
          nationality: '',
          height: null,
          weight: null,
          preferredFoot: '',
          jerseyNumber: null,
          medicalInfo: null,
          emergencyContact: null,
          team: { id: 'team-sepsi', name: 'Sepsi OSK' },
          user: playerUser ? { 
            id: playerUser.id, 
            email: playerUser.email 
          } : { id: `local-user-${playerData.id}`, email: playerData.email },
          createdAt: now,
          updatedAt: now
        }
      })
      
      console.log(`✅ Returning ${transformedPlayers.length} players from state`)
      return NextResponse.json(transformedPlayers)
    }
    
    // Prisma handles connection pooling automatically
    const players = await prisma.players.findMany({
      include: {
        users: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform players data to match frontend expectations
    const transformedPlayers = players.map(player => {
      const fullName = `${player.firstName} ${player.lastName}`.trim()
      
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        name: fullName,
        email: player.users?.email || player.email || '',
        position: player.position || '',
        status: player.status,
        availabilityStatus: player.status, // Use status as availabilityStatus
        matchDayTag: null, // Not in schema
        teamId: player.teamId,
        imageUrl: player.avatar || null,
        phone: player.phone || '',
        dateOfBirth: player.dateOfBirth,
        nationality: player.nationality || '',
        height: player.height,
        weight: player.weight,
        preferredFoot: player.preferredFoot || '',
        jerseyNumber: player.jerseyNumber,
        medicalInfo: player.medicalNotes || null,
        emergencyContact: player.emergencyContact || null,
        team: player.teamId ? { id: player.teamId, name: 'Team' } : null, // Team relation not in schema
        user: player.users,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt
      }
    })

    return NextResponse.json(transformedPlayers)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Player creation request received')
    if (LOCAL_DEV_MODE) {
      const body = await request.json()
      const { name, email, password, position, status } = body
      
      // Validate required fields
      if (!name || !email || !password) {
        return NextResponse.json(
          { message: 'Name, email, and password are required' },
          { status: 400 }
        )
      }
      
      // Check if email already exists
      const state = await readState()
      const emailExists = state.players.some(p => p.email.toLowerCase() === email.toLowerCase()) ||
                         state.playerUsers.some(u => u.email.toLowerCase() === email.toLowerCase())
      
      if (emailExists) {
        return NextResponse.json(
          { message: 'Email already exists. Please use a different email address.' },
          { status: 400 }
        )
      }
      
      // Generate unique player ID
      const playerId = `local-player-${Date.now()}`
      
      // Create player in state
      const newPlayer: StoredPlayer = {
        id: playerId,
        name: name,
        email: email,
        position: position || '',
        status: status || 'FULLY_AVAILABLE'
      }
      
      state.players.push(newPlayer)
      
      // Create player user account
      const nameParts = name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const newPlayerUser: StoredPlayerUser = {
        id: `local-player-user-${Date.now()}`,
        email: email,
        password: password, // In LOCAL_DEV_MODE, store password as-is (login route handles it)
        firstName,
        lastName,
        role: 'PLAYER',
        isActive: true,
        playerId: playerId
      }
      
      if (!state.playerUsers) {
        state.playerUsers = []
      }
      state.playerUsers.push(newPlayerUser)
      
      await writeState(state)
      
      console.log(`✅ Created player ${name} with ID ${playerId}`)
      
      // Return created player in the same format as GET
      const now = new Date().toISOString()
      return NextResponse.json(
        {
          id: playerId,
          firstName,
          lastName,
          name: name,
          email: email,
          position: position || '',
          status: status || 'FULLY_AVAILABLE',
          availabilityStatus: status || 'FULLY_AVAILABLE',
          matchDayTag: null,
          teamId: 'team-sepsi',
          imageUrl: null,
          phone: '',
          dateOfBirth: null,
          nationality: '',
          height: null,
          weight: null,
          preferredFoot: '',
          jerseyNumber: null,
          medicalInfo: null,
          emergencyContact: null,
          team: { id: 'team-sepsi', name: 'Sepsi OSK' },
          user: { id: newPlayerUser.id, email: email },
          createdAt: now,
          updatedAt: now
        },
        { status: 201 }
      )
    }
    
    // Prisma handles connection pooling automatically
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const {
      name,
      email,
      password,
      phone,
      position,
      jerseyNumber,
      dateOfBirth,
    } = body

    console.log('🔍 Extracted fields:', { name, email, password: password ? '***' : 'missing', phone, position, jerseyNumber, dateOfBirth })

    // Validate required fields
    if (!name || !email || !password) {
      console.log('❌ Validation failed: missing required fields')
      console.log('📊 Field status:', { 
        name: name ? '✅' : '❌', 
        email: email ? '✅' : '❌', 
        password: password ? '✅' : '❌' 
      })
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('❌ Validation failed: password too short')
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('❌ Email already exists:', email)
      return NextResponse.json(
        { message: 'Email already exists. Please use a different email address.' },
        { status: 400 }
      )
    }

    console.log('👤 Creating user account...')
    // Create user account first
    const nameParts = name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const userId = `player_user_${Date.now()}`
    
    const user = await prisma.users.create({
      data: {
        id: userId,
        email,
        password: await hashPassword(password),
        role: UserRole.PLAYER,
        firstName,
        lastName,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    console.log('✅ User created:', user.id)

    console.log('⚽ Creating player profile...')
    // Create player profile
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const player = await prisma.players.create({
      data: {
        id: playerId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        position: position || null,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        status: 'ACTIVE',
        userId: user.id,
        updatedAt: new Date(),
      },
      include: {
        users: true,
      },
    })
        console.log('✅ Player created:', player.id)

        return NextResponse.json(
      { message: 'Player created successfully', player },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating player:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error.message,
        details: {
          code: (error as any)?.code,
          meta: (error as any)?.meta
        }
      },
      { status: 500 }
    )
  }
}
