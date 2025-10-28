import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Players fetch request received')
    
    // Ensure database connection with retry
    let retries = 3
    while (retries > 0) {
      try {
        await prisma.$connect()
        console.log('✅ Database connected for players fetch')
        break
      } catch (error) {
        retries--
        console.log(`❌ Database connection failed, retries left: ${retries}`)
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const players = await prisma.player.findMany({
      include: {
        user: true,
        team: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform players data to match frontend expectations
    const transformedPlayers = players.map(player => {
      const nameParts = player.name ? player.name.split(' ') : ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      return {
        id: player.id,
        firstName,
        lastName,
        name: player.name,
        email: player.user?.email || '',
        position: player.position || '',
        status: player.status,
        availabilityStatus: player.availabilityStatus,
        matchDayTag: player.matchDayTag,
        teamId: player.teamId,
        imageUrl: player.imageUrl,
        phone: player.phone,
        dateOfBirth: player.dateOfBirth,
        nationality: player.nationality,
        height: player.height,
        weight: player.weight,
        preferredFoot: player.preferredFoot,
        jerseyNumber: player.jerseyNumber,
        medicalInfo: player.medicalInfo,
        emergencyContact: player.emergencyContact,
        team: player.team,
        user: player.user,
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
    
    // Ensure database connection with retry
    let retries = 3
    while (retries > 0) {
      try {
        await prisma.$connect()
        console.log('✅ Database connected')
        break
      } catch (error) {
        retries--
        console.log(`❌ Database connection failed, retries left: ${retries}`)
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
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
    const existingUser = await prisma.user.findUnique({
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
    const user = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        role: UserRole.PLAYER,
        isActive: true,
      },
    })
    console.log('✅ User created:', user.id)

    console.log('⚽ Creating player profile...')
    // Create player profile
    const player = await prisma.player.create({
      data: {
        name,
        email,
        phone,
        position,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        status: 'ACTIVE',
        userId: user.id,
      },
      include: {
        user: true,
        team: true,
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
  } finally {
    await prisma.$disconnect()
  }
}
