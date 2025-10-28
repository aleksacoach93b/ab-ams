import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform staff data to match frontend expectations
    const transformedStaff = staff.map(staffMember => {
      const nameParts = staffMember.name ? staffMember.name.split(' ') : ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      return {
        id: staffMember.id,
        firstName,
        lastName,
        name: staffMember.name,
        email: staffMember.email || '',
        role: staffMember.position || '',
        specialization: staffMember.department || '',
        teamId: staffMember.teamId,
        imageUrl: staffMember.imageUrl,
        phone: staffMember.phone,
        // Reports permissions
        canViewReports: staffMember.canViewReports,
        canEditReports: staffMember.canEditReports,
        canDeleteReports: staffMember.canDeleteReports,
        // Events permissions
        canCreateEvents: staffMember.canCreateEvents,
        canEditEvents: staffMember.canEditEvents,
        canDeleteEvents: staffMember.canDeleteEvents,
        // Players permissions
        canViewAllPlayers: staffMember.canViewAllPlayers,
        canEditPlayers: staffMember.canEditPlayers,
        canDeletePlayers: staffMember.canDeletePlayers,
        canAddPlayerMedia: staffMember.canAddPlayerMedia,
        canEditPlayerMedia: staffMember.canEditPlayerMedia,
        canDeletePlayerMedia: staffMember.canDeletePlayerMedia,
        canAddPlayerNotes: staffMember.canAddPlayerNotes,
        canEditPlayerNotes: staffMember.canEditPlayerNotes,
        canDeletePlayerNotes: staffMember.canDeletePlayerNotes,
        // System permissions
        canViewCalendar: staffMember.canViewCalendar,
        canViewDashboard: staffMember.canViewDashboard,
        canManageStaff: staffMember.canManageStaff,
        team: staffMember.team,
        user: staffMember.user,
        createdAt: staffMember.createdAt,
        updatedAt: staffMember.updatedAt
      }
    })

    return NextResponse.json(transformedStaff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Staff creation request received')
    
    // Ensure database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const {
      name,
      email,
      password,
      phone,
      position,
      // Reports permissions
      canViewReports,
      canEditReports,
      canDeleteReports,
      // Events permissions
      canCreateEvents,
      canEditEvents,
      canDeleteEvents,
      // Players permissions
      canViewAllPlayers,
      canEditPlayers,
      canDeletePlayers,
      canAddPlayerMedia,
      canEditPlayerMedia,
      canDeletePlayerMedia,
      canAddPlayerNotes,
      canEditPlayerNotes,
      canDeletePlayerNotes,
      // System permissions
      canViewCalendar,
      canViewDashboard,
      canManageStaff
    } = body

    // Validate required fields
    console.log('🔍 Field validation:', {
      name: name ? '✅' : '❌',
      email: email ? '✅' : '❌',
      password: password ? '✅' : '❌',
      nameValue: name,
      emailValue: email,
      passwordLength: password ? password.length : 0
    })

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

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('❌ Email already exists:', email)
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      )
    }

    console.log('👤 Creating user account...')
    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STAFF',
        isActive: true
      }
    })
    console.log('✅ User created:', user.id)

    console.log('👔 Creating staff record...')
    // Create staff record
    const staff = await prisma.staff.create({
      data: {
        name,
        email,
        phone,
        position,
        // Reports permissions
        canViewReports: canViewReports || false,
        canEditReports: canEditReports || false,
        canDeleteReports: canDeleteReports || false,
        // Events permissions
        canCreateEvents: canCreateEvents || false,
        canEditEvents: canEditEvents || false,
        canDeleteEvents: canDeleteEvents || false,
        // Players permissions
        canViewAllPlayers: canViewAllPlayers || false,
        canEditPlayers: canEditPlayers || false,
        canDeletePlayers: canDeletePlayers || false,
        canAddPlayerMedia: canAddPlayerMedia || false,
        canEditPlayerMedia: canEditPlayerMedia || false,
        canDeletePlayerMedia: canDeletePlayerMedia || false,
        canAddPlayerNotes: canAddPlayerNotes || false,
        canEditPlayerNotes: canEditPlayerNotes || false,
        canDeletePlayerNotes: canDeletePlayerNotes || false,
        // System permissions
        canViewCalendar: canViewCalendar || false,
        canViewDashboard: canViewDashboard || false,
        canManageStaff: canManageStaff || false,
        user: {
          connect: {
            id: user.id
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      }
    })
    console.log('✅ Staff created:', staff.id)

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating staff:', error)
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
